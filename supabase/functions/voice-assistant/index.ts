import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command } = await req.json();
    console.log("Received command:", command);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not found');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get products for context
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(20);

    const systemPrompt = `You are a helpful shopping assistant for VoxShop AI e-commerce platform.

AVAILABLE PRODUCTS:
${products?.map(p => `- ${p.name} (ID: ${p.id}) (₹${p.price}) - ${p.description} [Category: ${p.category}, Stock: ${p.stock}]`).join('\n')}

Your task is to:
1. Understand the user's shopping intent
2. Recommend relevant products
3. Help them add/remove items to/from cart
4. Assist with checkout

IMPORTANT: You must respond with a JSON object containing:
{
  "response": "Your friendly response to the user",
  "action": {
    "type": "search" | "add_to_cart" | "remove_from_cart" | "clear_cart" | "show_cart" | "checkout" | "show_products" | "none",
    "productId": "product_id" (if adding/removing from cart),
    "productName": "product name" (if adding/removing from cart),
    "query": "search term" (if searching),
    "category": "category name" (if filtering)
  }
}

Examples:
- "Show me headphones" -> action: {type: "search", query: "headphones"}
- "Add wireless headphones to cart" -> action: {type: "add_to_cart", productName: "wireless headphones"}
- "Remove wireless headphones from cart" -> action: {type: "remove_from_cart", productName: "wireless headphones"}
- "Clear the cart" or "Remove everything from cart" -> action: {type: "clear_cart"}
- "What's in my cart?" -> action: {type: "show_cart"}
- "I want to checkout" -> action: {type: "checkout"}
- "Show all electronics" -> action: {type: "show_products", category: "Electronics"}

When user asks to add or remove a product, try to match the product name from the available products list and include the productId if you can identify it clearly.

Be conversational and helpful!`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: command }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", data);
    
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in voice-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        response: "Sorry, I encountered an error. Please try again.",
        action: { type: "none" }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
