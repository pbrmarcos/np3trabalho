
-- =============================================
-- CORREÇÃO DE RLS PARA PRODUÇÃO
-- Adiciona verificação explícita auth.uid() IS NOT NULL
-- para bloquear acesso anônimo em tabelas críticas
-- =============================================

-- 1. CLIENT_PROJECTS - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their own projects" ON public.client_projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.client_projects;

CREATE POLICY "Clients can view their own projects" 
ON public.client_projects 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = client_id);

CREATE POLICY "Admins can manage all projects" 
ON public.client_projects 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 2. PROJECT_CREDENTIALS - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their own project credentials" ON public.project_credentials;
DROP POLICY IF EXISTS "Admins can manage all credentials" ON public.project_credentials;

CREATE POLICY "Clients can view their own project credentials" 
ON public.project_credentials 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM client_projects
  WHERE client_projects.id = project_credentials.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Admins can manage all credentials" 
ON public.project_credentials 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 3. ACTION_LOGS - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Admins can view all logs" ON public.action_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.action_logs;

CREATE POLICY "Admins can view all logs" 
ON public.action_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert logs" 
ON public.action_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. EMAIL_LOGS - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can manage email logs" ON public.email_logs;

CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email logs" 
ON public.email_logs 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 5. MIGRATION_REQUESTS - Bloquear acesso anônimo na leitura (INSERT público permitido)
DROP POLICY IF EXISTS "Users can view their own migration requests by email" ON public.migration_requests;
DROP POLICY IF EXISTS "Admins can manage all migration requests" ON public.migration_requests;

CREATE POLICY "Users can view their own migration requests by email" 
ON public.migration_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

CREATE POLICY "Admins can manage all migration requests" 
ON public.migration_requests 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 6. MIGRATION_MESSAGES - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Users can view their own migration messages" ON public.migration_messages;
DROP POLICY IF EXISTS "Clients can insert their own migration messages" ON public.migration_messages;
DROP POLICY IF EXISTS "Admins can manage migration messages" ON public.migration_messages;

CREATE POLICY "Users can view their own migration messages" 
ON public.migration_messages 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR client_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM migration_requests mr
      WHERE mr.id = migration_messages.migration_id 
      AND mr.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    )
  )
);

CREATE POLICY "Clients can insert their own migration messages" 
ON public.migration_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND sender_type = 'client'::text 
  AND client_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM migration_requests mr
    WHERE mr.id = migration_messages.migration_id 
    AND mr.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

CREATE POLICY "Admins can manage migration messages" 
ON public.migration_messages 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 7. DESIGN_ORDERS - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their own orders" ON public.design_orders;
DROP POLICY IF EXISTS "Clients can create orders" ON public.design_orders;
DROP POLICY IF EXISTS "Clients can update their own orders for revisions" ON public.design_orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.design_orders;

CREATE POLICY "Clients can view their own orders" 
ON public.design_orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = client_id);

CREATE POLICY "Clients can create orders" 
ON public.design_orders 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = client_id);

CREATE POLICY "Clients can update their own orders for revisions" 
ON public.design_orders 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = client_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = client_id);

CREATE POLICY "Admins can manage all orders" 
ON public.design_orders 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 8. USER_SUBSCRIPTIONS - Adicionar políticas de SELECT com bloqueio anônimo
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 9. DELETION_VERIFICATION_CODES - Confirmar bloqueio anônimo
DROP POLICY IF EXISTS "Admins can manage verification codes" ON public.deletion_verification_codes;

CREATE POLICY "Admins can manage verification codes" 
ON public.deletion_verification_codes 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 10. NOTIFICATION_QUEUE - Restringir política "true"
DROP POLICY IF EXISTS "Service role full access" ON public.notification_queue;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notification_queue;

CREATE POLICY "Admins can manage notification queue" 
ON public.notification_queue 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert notifications" 
ON public.notification_queue 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR created_by IS NULL));

-- =============================================
-- CORREÇÕES ADICIONAIS (WARNINGS)
-- =============================================

-- NOTIFICATIONS - Restringir criação de notificações
DROP POLICY IF EXISTS "Authenticated users can create notifications for admins" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications for admins" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(user_id, 'admin'::app_role))
);

-- PROJECT_TICKETS - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their own project tickets" ON public.project_tickets;
DROP POLICY IF EXISTS "Clients can create tickets for their projects" ON public.project_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.project_tickets;

CREATE POLICY "Clients can view their own project tickets" 
ON public.project_tickets 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM client_projects
  WHERE client_projects.id = project_tickets.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Clients can create tickets for their projects" 
ON public.project_tickets 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM client_projects
    WHERE client_projects.id = project_tickets.project_id 
    AND client_projects.client_id = auth.uid()
  ) 
  AND created_by = auth.uid() 
  AND can_access_project_features(auth.uid())
);

CREATE POLICY "Admins can manage all tickets" 
ON public.project_tickets 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- TICKET_MESSAGES - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Users can view messages on their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can add messages to their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.ticket_messages;

CREATE POLICY "Users can view messages on their tickets" 
ON public.ticket_messages 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM project_tickets
  JOIN client_projects ON client_projects.id = project_tickets.project_id
  WHERE project_tickets.id = ticket_messages.ticket_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Users can add messages to their tickets" 
ON public.ticket_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM project_tickets
    JOIN client_projects ON client_projects.id = project_tickets.project_id
    WHERE project_tickets.id = ticket_messages.ticket_id 
    AND client_projects.client_id = auth.uid()
  ) 
  AND user_id = auth.uid() 
  AND can_access_project_features(auth.uid())
);

CREATE POLICY "Admins can manage all messages" 
ON public.ticket_messages 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- PROJECT_FILES - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their own project files" ON public.project_files;
DROP POLICY IF EXISTS "Clients can upload their own project files" ON public.project_files;
DROP POLICY IF EXISTS "Admins can manage all files" ON public.project_files;

CREATE POLICY "Clients can view their own project files" 
ON public.project_files 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM client_projects
  WHERE client_projects.id = project_files.project_id 
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Clients can upload their own project files" 
ON public.project_files 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM client_projects
    WHERE client_projects.id = project_files.project_id 
    AND client_projects.client_id = auth.uid()
  ) 
  AND can_access_project_features(auth.uid())
);

CREATE POLICY "Admins can manage all files" 
ON public.project_files 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- DESIGN_FEEDBACK - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their feedback" ON public.design_feedback;
DROP POLICY IF EXISTS "Clients can create feedback" ON public.design_feedback;
DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.design_feedback;

CREATE POLICY "Clients can view their feedback" 
ON public.design_feedback 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM design_deliveries
  JOIN design_orders ON design_orders.id = design_deliveries.order_id
  WHERE design_deliveries.id = design_feedback.delivery_id 
  AND design_orders.client_id = auth.uid()
));

CREATE POLICY "Clients can create feedback" 
ON public.design_feedback 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM design_deliveries
    JOIN design_orders ON design_orders.id = design_deliveries.order_id
    WHERE design_deliveries.id = design_feedback.delivery_id 
    AND design_orders.client_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all feedback" 
ON public.design_feedback 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- TIMELINE_MESSAGES - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Clients can view their timeline messages" ON public.timeline_messages;
DROP POLICY IF EXISTS "Admins can insert timeline messages" ON public.timeline_messages;
DROP POLICY IF EXISTS "Admins can manage all timeline messages" ON public.timeline_messages;

CREATE POLICY "Clients can view their timeline messages" 
ON public.timeline_messages 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = client_id);

CREATE POLICY "Admins can insert timeline messages" 
ON public.timeline_messages 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all timeline messages" 
ON public.timeline_messages 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));
