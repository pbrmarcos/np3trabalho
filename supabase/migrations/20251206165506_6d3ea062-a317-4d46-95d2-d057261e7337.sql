-- Create project_tickets table
CREATE TABLE public.project_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID NOT NULL,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket_messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.project_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_tickets
CREATE POLICY "Admins can manage all tickets"
ON public.project_tickets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own project tickets"
ON public.project_tickets
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM client_projects
  WHERE client_projects.id = project_tickets.project_id
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Clients can create tickets for their projects"
ON public.project_tickets
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM client_projects
  WHERE client_projects.id = project_tickets.project_id
  AND client_projects.client_id = auth.uid()
) AND created_by = auth.uid());

-- RLS Policies for ticket_messages
CREATE POLICY "Admins can manage all messages"
ON public.ticket_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view messages on their tickets"
ON public.ticket_messages
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_tickets
  JOIN client_projects ON client_projects.id = project_tickets.project_id
  WHERE project_tickets.id = ticket_messages.ticket_id
  AND client_projects.client_id = auth.uid()
));

CREATE POLICY "Users can add messages to their tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM project_tickets
  JOIN client_projects ON client_projects.id = project_tickets.project_id
  WHERE project_tickets.id = ticket_messages.ticket_id
  AND client_projects.client_id = auth.uid()
) AND user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_project_tickets_updated_at
BEFORE UPDATE ON public.project_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;