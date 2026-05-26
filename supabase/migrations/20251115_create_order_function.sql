-- Create a function that inserts order and order_items server-side (uses service role, bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id UUID,
  p_total_amount DECIMAL,
  p_cart_items JSONB
)
RETURNS TABLE(order_id UUID, success BOOLEAN, message TEXT) AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- Insert the order
  INSERT INTO public.orders (user_id, total_amount, status)
  VALUES (p_user_id, p_total_amount, 'completed')
  RETURNING id INTO v_order_id;

  -- Insert each order item
  FOR v_item IN SELECT jsonb_array_elements(p_cart_items)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::DECIMAL
    );
  END LOOP;

  -- Delete cart items for the user
  DELETE FROM public.cart_items WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_order_id, true, 'Order created successfully'::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order(UUID, DECIMAL, JSONB) TO authenticated;
