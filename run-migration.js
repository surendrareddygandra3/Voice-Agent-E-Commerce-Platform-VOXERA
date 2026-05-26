async function runMigration() {
  try {
    console.log('Attempting to run RLS policy migration...');
    
    const supabaseUrl = 'https://mtgtycfctyodoscxxbqc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Z3R5Y2ZjdHlvZG9zY3h4YnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTgwNjgsImV4cCI6MjA3ODc3NDA2OH0.fZ53sOLQTGPH2n2xGTWu7SB9uJ1IAvuwE9VAB_0lvPA';

    // Use the Supabase SQL endpoint
    const sql = `CREATE POLICY "Users can create order items for their orders"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND orders.user_id = auth.uid()
));`;

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql })
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);

    if (response.ok) {
      console.log('\n✅ Migration executed successfully!');
    } else {
      console.log('\n⚠️ Migration API endpoint not available via REST');
      console.log('Please run the SQL manually in Supabase Dashboard');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nManual Steps:');
    console.log('1. Go to: https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Click SQL Editor → New Query');
    console.log('4. Paste the SQL below and execute:\n');
    console.log(`CREATE POLICY "Users can create order items for their orders"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND orders.user_id = auth.uid()
));`);
  }
}

runMigration();
