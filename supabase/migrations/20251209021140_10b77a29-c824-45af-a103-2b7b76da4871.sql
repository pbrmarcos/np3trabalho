-- Remover política restritiva atual
DROP POLICY IF EXISTS "Only admins can insert notifications" ON public.notifications;

-- Nova política: permite criar notificações para admins (clientes notificando sobre tickets/arquivos)
CREATE POLICY "Authenticated users can create notifications for admins"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins podem criar para qualquer usuário
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Clientes podem criar notificações APENAS destinadas a admins
  has_role(user_id, 'admin'::app_role)
);