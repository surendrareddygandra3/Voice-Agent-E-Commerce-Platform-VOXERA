import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVoiceOpen, setIsVoiceOpen] = useState(true);
  const location = useLocation();
  const [showPayment, setShowPayment] = useState<boolean>(() => {
    try {
      return !!((location.state as any)?.showPayment);
    } catch {
      return false;
    }
  });
  const [paymentMethod, setPaymentMethod] = useState<'card'|'upi'>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (*)
      `)
      .eq('user_id', session.user.id);

    if (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart");
      return;
    }

    setCartItems(data || []);
    setLoading(false);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) {
      toast.error("Failed to update quantity");
      return;
    }

    fetchCartItems();
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error("Failed to remove item");
      return;
    }

    toast.success("Item removed from cart");
    fetchCartItems();
  };

  const clearCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', session.user.id);

    if (error) {
      toast.error("Failed to clear cart");
      return;
    }

    toast.success("Cart cleared");
    fetchCartItems();
  };

  const handleVoiceAction = async (action: any) => {
    console.log("Cart voice action:", action);

    switch (action.type) {
      case "add_to_cart":
        toast.info("Please go to home page to add products");
        break;
      case "remove_from_cart":
        if (action.productName) {
          const item = cartItems.find(item => 
            item.products.name.toLowerCase().includes(action.productName.toLowerCase())
          );
          if (item) {
            await removeItem(item.id);
          } else {
            toast.error("Product not found in cart");
          }
        }
        break;
      case "clear_cart":
        await clearCart();
        break;
      case "checkout":
        if (cartItems.length > 0) {
          // Open payment UI instead of placing order directly
          setShowPayment(true);
        } else {
          toast.error("Your cart is empty");
        }
        break;
      case "show_products":
        navigate("/");
        break;
    }
  };

  // Called after user confirms payment
  const processPaymentAndPlaceOrder = async () => {
    // Minimal client-side validation
    if (paymentMethod === 'card') {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        toast.error('Please fill card details');
        return;
      }
    } else {
      if (!upiId) {
        toast.error('Please provide UPI ID');
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        return;
      }

      // Prepare order items data for RPC
      const orderItemsData = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products.price,
      }));

      console.log('Creating order via RPC...');

      // Call RPC function to create order and order items (server-side, no RLS issues)
      const { data, error } = await supabase.rpc('create_order', {
        p_user_id: session.user.id,
        p_total_amount: total,
        p_cart_items: JSON.stringify(orderItemsData),
      });

      if (error) {
        console.error('Order creation error:', error);
        toast.error(`Failed to create order: ${error.message}`);
        return;
      }

      console.log('Order created successfully:', data);

      // Show success message
      setShowPayment(false);
      toast.success('Order placed successfully! 🎉');

      // Clear form fields
      setCardName('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setUpiId('');

      // Redirect to orders page after a short delay
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const total = cartItems.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onVoiceClick={() => setIsVoiceOpen(!isVoiceOpen)} isVoiceActive={isVoiceOpen} />
        <div className="container px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartCount={cartItems.length} 
        onVoiceClick={() => setIsVoiceOpen(!isVoiceOpen)} 
        isVoiceActive={isVoiceOpen}
      />

      <main className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={isVoiceOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

            {cartItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">Your cart is empty</p>
                  <Button onClick={() => navigate("/")}>Continue Shopping</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.products.image_url || "/placeholder.svg"}
                        alt={item.products.name}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.products.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          ₹{item.products.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="font-bold">
                          ₹{(item.products.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  ))}
                </div>

                <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-success">Free</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => setShowPayment(true)}>
                    Proceed to Checkout
                  </Button>

                  {showPayment && (
                    <div className="mt-4 space-y-4">
                      <h3 className="font-semibold">Payment Method</h3>
                      <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                          <span>Card</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
                          <span>UPI</span>
                        </label>
                      </div>

                      {paymentMethod === 'card' ? (
                        <div className="space-y-2">
                          <input className="w-full p-2 border rounded" placeholder="Name on card" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                          <input className="w-full p-2 border rounded" placeholder="Card number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                          <div className="flex gap-2">
                            <input className="flex-1 p-2 border rounded" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                            <input className="w-24 p-2 border rounded" placeholder="CVV" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input className="w-full p-2 border rounded" placeholder="UPI ID (e.g. your@bank)" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={processPaymentAndPlaceOrder}>Confirm & Pay</Button>
                        <Button variant="ghost" className="flex-1" onClick={() => setShowPayment(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {isVoiceOpen && (
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <VoiceAssistant onAction={handleVoiceAction} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
