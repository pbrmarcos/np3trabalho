-- Add UPDATE policy for clients on design_orders
CREATE POLICY "Clients can update their own orders for revisions"
ON public.design_orders
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Add UPDATE policy for clients on design_deliveries
CREATE POLICY "Clients can update their order deliveries"
ON public.design_deliveries
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM design_orders
  WHERE design_orders.id = design_deliveries.order_id
  AND design_orders.client_id = auth.uid()
));