
-- =====================================================
-- RLS POLICIES FOR ALL TABLES (FIXED)
-- =====================================================

-- =====================================================
-- 1. PUBLIC/SYSTEM TABLES (Read for authenticated, Write for admins)
-- =====================================================

-- SYSTEM_SETTINGS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

CREATE POLICY "Anyone can read system settings"
ON public.system_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- SYSTEM_EMAIL_TEMPLATES
ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read email templates" ON public.system_email_templates;
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.system_email_templates;

CREATE POLICY "Admins can read email templates"
ON public.system_email_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage email templates"
ON public.system_email_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- BLOG_POSTS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;

CREATE POLICY "Anyone can read published posts"
ON public.blog_posts FOR SELECT
USING (published = true);

CREATE POLICY "Admins can manage all posts"
ON public.blog_posts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- HELP_CATEGORIES
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active help categories" ON public.help_categories;
DROP POLICY IF EXISTS "Admins can manage help categories" ON public.help_categories;

CREATE POLICY "Anyone can read active help categories"
ON public.help_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage help categories"
ON public.help_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- HELP_ARTICLES
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.help_articles;
DROP POLICY IF EXISTS "Admins can manage help articles" ON public.help_articles;

CREATE POLICY "Anyone can read published articles"
ON public.help_articles FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage help articles"
ON public.help_articles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- HELP_ARTICLE_FEEDBACK
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.help_article_feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON public.help_article_feedback;

CREATE POLICY "Anyone can submit feedback"
ON public.help_article_feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read all feedback"
ON public.help_article_feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PORTFOLIO_ITEMS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Admins can manage portfolio items" ON public.portfolio_items;

CREATE POLICY "Anyone can read active portfolio items"
ON public.portfolio_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage portfolio items"
ON public.portfolio_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DESIGN_SERVICE_CATEGORIES
ALTER TABLE public.design_service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active design categories" ON public.design_service_categories;
DROP POLICY IF EXISTS "Admins can manage design categories" ON public.design_service_categories;

CREATE POLICY "Anyone can read active design categories"
ON public.design_service_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage design categories"
ON public.design_service_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DESIGN_PACKAGES
ALTER TABLE public.design_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active design packages" ON public.design_packages;
DROP POLICY IF EXISTS "Admins can manage design packages" ON public.design_packages;

CREATE POLICY "Anyone can read active design packages"
ON public.design_packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage design packages"
ON public.design_packages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PAGE_SEO
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read page seo" ON public.page_seo;
DROP POLICY IF EXISTS "Admins can manage page seo" ON public.page_seo;

CREATE POLICY "Anyone can read page seo"
ON public.page_seo FOR SELECT
USING (true);

CREATE POLICY "Admins can manage page seo"
ON public.page_seo FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- HOME_CONTENT
ALTER TABLE public.home_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read home content" ON public.home_content;
DROP POLICY IF EXISTS "Admins can manage home content" ON public.home_content;

CREATE POLICY "Anyone can read home content"
ON public.home_content FOR SELECT
USING (true);

CREATE POLICY "Admins can manage home content"
ON public.home_content FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================
-- 2. USER TABLES (Users can access their own data)
-- =====================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- USER_SUBSCRIPTIONS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- CLIENT_ONBOARDING
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own onboarding" ON public.client_onboarding;
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.client_onboarding;
DROP POLICY IF EXISTS "Admins can manage all onboarding" ON public.client_onboarding;

CREATE POLICY "Users can read own onboarding"
ON public.client_onboarding FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own onboarding"
ON public.client_onboarding FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all onboarding"
ON public.client_onboarding FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================
-- 3. PROJECT TABLES (Clients see their projects, Admins see all)
-- =====================================================

-- CLIENT_PROJECTS
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own projects" ON public.client_projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.client_projects;

CREATE POLICY "Users can read own projects"
ON public.client_projects FOR SELECT TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all projects"
ON public.client_projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PROJECT_FILES
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can insert own project files" ON public.project_files;
DROP POLICY IF EXISTS "Admins can manage all project files" ON public.project_files;

CREATE POLICY "Users can read own project files"
ON public.project_files FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.client_projects 
  WHERE client_projects.id = project_files.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Users can insert own project files"
ON public.project_files FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.client_projects 
  WHERE client_projects.id = project_files.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all project files"
ON public.project_files FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PROJECT_CREDENTIALS
ALTER TABLE public.project_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own project credentials" ON public.project_credentials;
DROP POLICY IF EXISTS "Admins can manage all project credentials" ON public.project_credentials;

CREATE POLICY "Users can read own project credentials"
ON public.project_credentials FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.client_projects 
  WHERE client_projects.id = project_credentials.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all project credentials"
ON public.project_credentials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PROJECT_TICKETS
ALTER TABLE public.project_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own project tickets" ON public.project_tickets;
DROP POLICY IF EXISTS "Users can create tickets for own projects" ON public.project_tickets;
DROP POLICY IF EXISTS "Admins can manage all project tickets" ON public.project_tickets;

CREATE POLICY "Users can read own project tickets"
ON public.project_tickets FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.client_projects 
  WHERE client_projects.id = project_tickets.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Users can create tickets for own projects"
ON public.project_tickets FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.client_projects 
  WHERE client_projects.id = project_tickets.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all project tickets"
ON public.project_tickets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- TICKET_MESSAGES
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read messages from own tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can create messages on own tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.ticket_messages;

CREATE POLICY "Users can read messages from own tickets"
ON public.ticket_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.project_tickets pt
  JOIN public.client_projects cp ON cp.id = pt.project_id
  WHERE pt.id = ticket_messages.ticket_id 
  AND cp.client_id = auth.uid()
));

CREATE POLICY "Users can create messages on own tickets"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_tickets pt
  JOIN public.client_projects cp ON cp.id = pt.project_id
  WHERE pt.id = ticket_messages.ticket_id 
  AND cp.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all ticket messages"
ON public.ticket_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- TIMELINE_MESSAGES
ALTER TABLE public.timeline_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own timeline messages" ON public.timeline_messages;
DROP POLICY IF EXISTS "Users can create timeline messages" ON public.timeline_messages;
DROP POLICY IF EXISTS "Admins can manage all timeline messages" ON public.timeline_messages;

CREATE POLICY "Users can read own timeline messages"
ON public.timeline_messages FOR SELECT TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "Users can create timeline messages"
ON public.timeline_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can manage all timeline messages"
ON public.timeline_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================
-- 4. DESIGN ORDERS TABLES
-- =====================================================

-- DESIGN_ORDERS
ALTER TABLE public.design_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own design orders" ON public.design_orders;
DROP POLICY IF EXISTS "Users can create own design orders" ON public.design_orders;
DROP POLICY IF EXISTS "Admins can manage all design orders" ON public.design_orders;

CREATE POLICY "Users can read own design orders"
ON public.design_orders FOR SELECT TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "Users can create own design orders"
ON public.design_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can manage all design orders"
ON public.design_orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DESIGN_DELIVERIES
ALTER TABLE public.design_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read deliveries for own orders" ON public.design_deliveries;
DROP POLICY IF EXISTS "Admins can manage all design deliveries" ON public.design_deliveries;

CREATE POLICY "Users can read deliveries for own orders"
ON public.design_deliveries FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.design_orders 
  WHERE design_orders.id = design_deliveries.order_id 
  AND design_orders.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all design deliveries"
ON public.design_deliveries FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DESIGN_DELIVERY_FILES
ALTER TABLE public.design_delivery_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read files for own deliveries" ON public.design_delivery_files;
DROP POLICY IF EXISTS "Admins can manage all delivery files" ON public.design_delivery_files;

CREATE POLICY "Users can read files for own deliveries"
ON public.design_delivery_files FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.design_deliveries dd
  JOIN public.design_orders dord ON dord.id = dd.order_id
  WHERE dd.id = design_delivery_files.delivery_id 
  AND dord.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all delivery files"
ON public.design_delivery_files FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DESIGN_FEEDBACK
ALTER TABLE public.design_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read feedback for own deliveries" ON public.design_feedback;
DROP POLICY IF EXISTS "Users can create feedback for own deliveries" ON public.design_feedback;
DROP POLICY IF EXISTS "Admins can manage all design feedback" ON public.design_feedback;

CREATE POLICY "Users can read feedback for own deliveries"
ON public.design_feedback FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.design_deliveries dd
  JOIN public.design_orders dord ON dord.id = dd.order_id
  WHERE dd.id = design_feedback.delivery_id 
  AND dord.client_id = auth.uid()
));

CREATE POLICY "Users can create feedback for own deliveries"
ON public.design_feedback FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.design_deliveries dd
  JOIN public.design_orders dord ON dord.id = dd.order_id
  WHERE dd.id = design_feedback.delivery_id 
  AND dord.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all design feedback"
ON public.design_feedback FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================
-- 5. ADMIN-ONLY TABLES
-- =====================================================

-- ACTION_LOGS
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage action logs" ON public.action_logs;

CREATE POLICY "Admins can manage action logs"
ON public.action_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- EMAIL_LOGS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage email logs" ON public.email_logs;

CREATE POLICY "Admins can manage email logs"
ON public.email_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- MEDIA_FILES
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage media files" ON public.media_files;

CREATE POLICY "Admins can manage media files"
ON public.media_files FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- NOTIFICATION_QUEUE
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage notification queue" ON public.notification_queue;

CREATE POLICY "Admins can manage notification queue"
ON public.notification_queue FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PROCESSED_WEBHOOK_EVENTS
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage webhook events" ON public.processed_webhook_events;

CREATE POLICY "Admins can manage webhook events"
ON public.processed_webhook_events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PASSWORD_RESET_TOKENS (service role only, no user access)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- DELETION_VERIFICATION_CODES (service role only, no user access)
ALTER TABLE public.deletion_verification_codes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. MIGRATION TABLES
-- =====================================================

-- MIGRATION_REQUESTS
ALTER TABLE public.migration_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create migration requests" ON public.migration_requests;
DROP POLICY IF EXISTS "Admins can manage migration requests" ON public.migration_requests;

CREATE POLICY "Anyone can create migration requests"
ON public.migration_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage migration requests"
ON public.migration_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- MIGRATION_MESSAGES
ALTER TABLE public.migration_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage migration messages" ON public.migration_messages;

CREATE POLICY "Admins can manage migration messages"
ON public.migration_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
