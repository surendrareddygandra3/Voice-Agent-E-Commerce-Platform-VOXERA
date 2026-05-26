import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVoiceOpen, setIsVoiceOpen] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
      return;
    }

    setOrders(data || []);
    setLoading(false);
  };

  const handleVoiceAction = async (action: any) => {
    console.log("Orders voice action:", action);

    switch (action.type) {
      case "show_products":
        navigate("/");
        break;
      case "show_cart":
        navigate("/cart");
        break;
      default:
        toast.info("Try 'Show me products' or 'Go to cart'");
    }
  };

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
      <Header onVoiceClick={() => setIsVoiceOpen(!isVoiceOpen)} isVoiceActive={isVoiceOpen} />

      <main className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={isVoiceOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            <h1 className="text-3xl font-bold mb-8">My Orders</h1>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No orders yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'PPP')}
                          </p>
                        </div>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>

                      <div className="space-y-3">
                        {order.order_items.map((item: any) => (
                          <div key={item.id} className="flex gap-4">
                            <img
                              src={item.products.image_url || "/placeholder.svg"}
                              alt={item.products.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{item.products.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                            <p className="font-medium">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t mt-4 pt-4 flex justify-between">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-lg">
                          ₹{order.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
