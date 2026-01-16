-- Performance optimization: Create strategic indexes for frequently queried columns

-- Índices para client_projects
CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON client_projects(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_client_status ON client_projects(client_id, status);

-- Índices para client_onboarding
CREATE INDEX IF NOT EXISTS idx_client_onboarding_user_id ON client_onboarding(user_id);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Índices para project_tickets
CREATE INDEX IF NOT EXISTS idx_project_tickets_project ON project_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tickets_status ON project_tickets(project_id, status);

-- Índices para design_orders
CREATE INDEX IF NOT EXISTS idx_design_orders_client ON design_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_design_orders_status ON design_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_orders_payment ON design_orders(client_id, payment_status);

-- Índices para timeline_messages
CREATE INDEX IF NOT EXISTS idx_timeline_messages_client ON timeline_messages(client_id, created_at DESC);

-- Índices para migration_requests
CREATE INDEX IF NOT EXISTS idx_migration_requests_status ON migration_requests(status, created_at);

-- Índices para email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);

-- Índices para project_files
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);

-- Índices para project_credentials
CREATE INDEX IF NOT EXISTS idx_project_credentials_project ON project_credentials(project_id);