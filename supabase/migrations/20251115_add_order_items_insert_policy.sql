-- Add INSERT policy for order_items table to allow users to insert order items for their own orders
CREATE POLICY "Users can create order items for their orders"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND orders.user_id = auth.uid()
));
