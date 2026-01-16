import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("EXPORT-DATABASE-SCHEMA");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Verify admin role
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log('Starting schema export...', { userId: user.id });

    // Get database URL for direct connection
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    
    let schemaSQL = `-- WebQ Database Schema Export
-- Generated at: ${new Date().toISOString()}
-- Project: ayqhypvxmqoqassouekm

-- =====================================================
-- IMPORTANT: Execute this file in the SQL Editor of your
-- Supabase project in the correct order
-- =====================================================

`;

    // 1. Create enum types
    schemaSQL += `
-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

-- Drop if exists to allow re-running
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

`;

    // 2. Define all tables based on the known schema
    const tables = [
      // Independent tables first
      { name: 'profiles', sql: `
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  company_name text,
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'user_roles', sql: `
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);` },
      { name: 'system_settings', sql: `
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);` },
      { name: 'system_email_templates', sql: `
CREATE TABLE IF NOT EXISTS public.system_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  trigger text NOT NULL,
  subject text NOT NULL,
  html_template text NOT NULL,
  is_active boolean DEFAULT true,
  copy_to_admins boolean DEFAULT false,
  sender_email text DEFAULT 'noreply@webq.com.br',
  sender_name text DEFAULT 'WebQ Sistema',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'page_seo', sql: `
CREATE TABLE IF NOT EXISTS public.page_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  page_name text NOT NULL,
  page_route text NOT NULL,
  title text,
  meta_description text,
  keywords text,
  og_title text,
  og_description text,
  og_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'home_content', sql: `
CREATE TABLE IF NOT EXISTS public.home_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title text,
  subtitle text,
  content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);` },
      { name: 'blog_posts', sql: `
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image text,
  category text DEFAULT 'Site Profissional',
  author_id uuid,
  published boolean DEFAULT false,
  published_at timestamptz,
  is_isolated_page boolean DEFAULT false,
  meta_description text,
  keywords text,
  og_title text,
  og_description text,
  og_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'help_categories', sql: `
CREATE TABLE IF NOT EXISTS public.help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'HelpCircle',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'help_articles', sql: `
CREATE TABLE IF NOT EXISTS public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.help_categories(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  display_order integer DEFAULT 0,
  is_published boolean DEFAULT false,
  view_count integer DEFAULT 0,
  meta_description text,
  keywords text,
  og_title text,
  og_description text,
  og_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'help_article_feedback', sql: `
CREATE TABLE IF NOT EXISTS public.help_article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  is_helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'portfolio_items', sql: `
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  website_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'media_files', sql: `
CREATE TABLE IF NOT EXISTS public.media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  display_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  category text DEFAULT 'general',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'design_service_categories', sql: `
CREATE TABLE IF NOT EXISTS public.design_service_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'Palette',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'design_packages', sql: `
CREATE TABLE IF NOT EXISTS public.design_packages (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES public.design_service_categories(id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  estimated_days integer DEFAULT 5,
  includes text[],
  stripe_product_id text,
  stripe_price_id text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_bundle boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'client_onboarding', sql: `
CREATE TABLE IF NOT EXISTS public.client_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  business_type text NOT NULL,
  business_description text,
  whatsapp text NOT NULL,
  instagram text,
  facebook text,
  linkedin text,
  twitter text,
  tiktok text,
  youtube text,
  business_email text,
  phone_landline text,
  business_hours text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  show_address boolean DEFAULT true,
  selected_plan text NOT NULL,
  has_domain boolean DEFAULT false,
  domain_name text,
  domain_provider text,
  has_logo boolean DEFAULT false,
  logo_url text,
  logo_description text,
  has_brand_identity boolean DEFAULT false,
  needs_brand_creation boolean DEFAULT false,
  brand_creation_paid boolean DEFAULT false,
  brand_status text DEFAULT 'not_started',
  brand_current_package integer DEFAULT 1,
  brand_versions_used integer DEFAULT 0,
  brand_revisions_used integer DEFAULT 0,
  preferred_color text,
  inspiration_urls text[],
  site_expectations text,
  needs_migration boolean DEFAULT false,
  migration_current_domain text,
  migration_current_host text,
  migration_site_type text,
  migration_has_access boolean,
  migration_assistance_level text,
  migration_access_notes text,
  is_design_only boolean DEFAULT false,
  stripe_session_id text,
  onboarding_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'client_projects', sql: `
CREATE TABLE IF NOT EXISTS public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  domain text,
  domain_status text DEFAULT 'needs_registration',
  domain_notes text,
  dns_record_1 text,
  dns_record_2 text,
  server_ip text DEFAULT '185.158.133.1',
  cpanel_url text,
  cpanel_login text,
  cpanel_password text,
  site_access_url text,
  site_access_login text,
  site_access_password text,
  cloud_drive_url text,
  plan text DEFAULT 'basic',
  status text NOT NULL DEFAULT 'development',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'project_credentials', sql: `
CREATE TABLE IF NOT EXISTS public.project_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  credential_type text NOT NULL,
  label text NOT NULL,
  username text,
  password text,
  url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'project_files', sql: `
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'project_tickets', sql: `
CREATE TABLE IF NOT EXISTS public.project_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'ticket_messages', sql: `
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.project_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'timeline_messages', sql: `
CREATE TABLE IF NOT EXISTS public.timeline_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  project_id uuid REFERENCES public.client_projects(id) ON DELETE SET NULL,
  admin_id uuid,
  sender_type text NOT NULL DEFAULT 'admin',
  message_type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'design_orders', sql: `
CREATE TABLE IF NOT EXISTS public.design_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  project_id uuid REFERENCES public.client_projects(id) ON DELETE SET NULL,
  package_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment',
  payment_status text DEFAULT 'pending',
  stripe_session_id text,
  notes text,
  has_brand_identity boolean DEFAULT false,
  brand_colors text,
  brand_files text[] DEFAULT ARRAY[]::text[],
  preferred_color text,
  logo_description text,
  inspiration_urls text[],
  reference_files text[],
  briefing_type text,
  briefing_data jsonb DEFAULT '{}'::jsonb,
  max_revisions integer DEFAULT 2,
  revisions_used integer DEFAULT 0,
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'design_deliveries', sql: `
CREATE TABLE IF NOT EXISTS public.design_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.design_orders(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  delivery_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'design_delivery_files', sql: `
CREATE TABLE IF NOT EXISTS public.design_delivery_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.design_deliveries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);` },
      { name: 'design_feedback', sql: `
CREATE TABLE IF NOT EXISTS public.design_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.design_deliveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);` },
      { name: 'migration_requests', sql: `
CREATE TABLE IF NOT EXISTS public.migration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  current_domain text NOT NULL,
  current_host text,
  site_type text NOT NULL DEFAULT 'wordpress',
  additional_info text,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  client_notes text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'migration_messages', sql: `
CREATE TABLE IF NOT EXISTS public.migration_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id uuid NOT NULL REFERENCES public.migration_requests(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'admin',
  client_id uuid,
  admin_id uuid,
  message text NOT NULL,
  attachment_url text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'user_subscriptions', sql: `
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text,
  status text NOT NULL DEFAULT 'inactive',
  billing_type text,
  current_period_end timestamptz,
  one_time_expiry timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'notifications', sql: `
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  reference_type text,
  reference_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'notification_queue', sql: `
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug text NOT NULL,
  recipients text[] NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  dedup_key text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);` },
      { name: 'action_logs', sql: `
CREATE TABLE IF NOT EXISTS public.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  description text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);` },
      { name: 'email_logs', sql: `
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug text,
  template_name text,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resend_id text,
  error_message text,
  variables jsonb,
  metadata jsonb,
  triggered_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'password_reset_tokens', sql: `
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamptz DEFAULT now()
);` },
      { name: 'deletion_verification_codes', sql: `
CREATE TABLE IF NOT EXISTS public.deletion_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  code text NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);` },
      { name: 'cookie_consent_logs', sql: `
CREATE TABLE IF NOT EXISTS public.cookie_consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid,
  user_name text,
  user_email text,
  consent_type text NOT NULL,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  preferences boolean NOT NULL DEFAULT false,
  ip_hash text,
  user_agent text,
  device_type text,
  browser_name text,
  browser_version text,
  os_name text,
  country text,
  region text,
  page_url text,
  referrer_url text,
  time_on_site_seconds integer,
  pages_visited integer,
  created_at timestamptz NOT NULL DEFAULT now()
);` },
      { name: 'cookie_definitions', sql: `
CREATE TABLE IF NOT EXISTS public.cookie_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  purpose text NOT NULL,
  duration text NOT NULL DEFAULT 'Sessão',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);` },
      { name: 'processed_webhook_events', sql: `
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);` },
    ];

    schemaSQL += `
-- =====================================================
-- 2. TABLES
-- =====================================================
`;

    for (const table of tables) {
      schemaSQL += `
-- Table: ${table.name}
${table.sql}
`;
    }

    // 3. Enable RLS
    schemaSQL += `

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================
`;

    for (const table of tables) {
      schemaSQL += `ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;
`;
    }

    // 4. Security definer functions
    schemaSQL += `

-- =====================================================
-- 4. SECURITY DEFINER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR
        (billing_type = 'one_time' AND one_time_expiry > now())
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_project_features(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin'::app_role) 
    OR has_active_subscription(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');
  
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.processed_webhook_events 
  WHERE processed_at < now() - interval '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notification_queue 
  WHERE (status IN ('sent', 'failed', 'skipped') AND processed_at < now() - interval '7 days')
     OR (status = 'pending' AND created_at < now() - interval '24 hours');
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_password_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < now() OR used = true;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_deletion_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.deletion_verification_codes 
  WHERE expires_at < now() OR used = true;
  RETURN NEW;
END;
$$;

`;

    // 5. Triggers
    schemaSQL += `

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger for new user handling (on auth.users)
-- Note: This needs to be run with appropriate permissions
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_project_tickets_updated_at
  BEFORE UPDATE ON public.project_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_help_categories_updated_at
  BEFORE UPDATE ON public.help_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup triggers
CREATE OR REPLACE TRIGGER cleanup_tokens_on_insert
  AFTER INSERT ON public.password_reset_tokens
  FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_expired_password_tokens();

CREATE OR REPLACE TRIGGER cleanup_deletion_codes_on_insert
  AFTER INSERT ON public.deletion_verification_codes
  FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_expired_deletion_codes();

`;

    // 6. Indexes
    schemaSQL += `

-- =====================================================
-- 6. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON public.client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_tickets_project_id ON public.project_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tickets_status ON public.project_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_timeline_messages_client_id ON public.timeline_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_category_id ON public.help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_is_published ON public.help_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_design_orders_client_id ON public.design_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_design_orders_status ON public.design_orders(status);
CREATE INDEX IF NOT EXISTS idx_migration_requests_status ON public.migration_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_logs_created_at ON public.cookie_consent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_stripe_event_id ON public.processed_webhook_events(stripe_event_id);

`;

    // 7. Realtime
    schemaSQL += `

-- =====================================================
-- 7. REALTIME PUBLICATIONS
-- =====================================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.migration_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_deliveries;

`;

    // 8. Final notes
    schemaSQL += `

-- =====================================================
-- 8. POST-MIGRATION NOTES
-- =====================================================

-- After running this schema:
-- 1. Import data using the data export file
-- 2. Set up RLS policies for each table
-- 3. Configure storage buckets and policies
-- 4. Set up edge functions and their secrets
-- 5. Configure Stripe webhooks to point to new project
-- 6. Update DNS if needed
-- 7. Test all functionality before going live

-- End of schema export
`;

    // Log the export
    await supabase.from('action_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action_type: 'export',
      entity_type: 'database_schema',
      description: `Exported database schema (${tables.length} tables)`,
      metadata: { tables_count: tables.length }
    });

    log(`Schema export completed: ${tables.length} tables`);

    return new Response(schemaSQL, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename=webq-schema.sql',
      },
    });
  } catch (error) {
    log.error('Error exporting schema', { error: error instanceof Error ? error.message : 'Unknown error' });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
