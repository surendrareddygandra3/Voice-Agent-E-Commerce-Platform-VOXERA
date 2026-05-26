import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartCount, setCartCount] = useState(0);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
    checkAuth();
    fetchCartCount();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
      return;
    }

    setProducts(data || []);
    setFilteredProducts(data || []);
  };

  const fetchCartCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', session.user.id);

    if (!error && data) {
      const total = data.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(total);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .upsert({
        user_id: user.id,
        product_id: productId,
        quantity: 1
      }, {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
      return;
    }

    toast.success("Added to cart!");
    fetchCartCount();
  };

  const handleVoiceAction = async (action: any) => {
    console.log("Voice action:", action);

    switch (action.type) {
      case "search":
        setSearchQuery(action.query || "");
        break;
      case "show_products":
        if (action.category) {
          setSelectedCategory(action.category);
        }
        break;
      case "add_to_cart":
        if (action.productId) {
          await handleAddToCart(action.productId);
        } else if (action.productName) {
          // Find product by name
          const product = products.find(p => 
            p.name.toLowerCase().includes(action.productName.toLowerCase())
          );
          if (product) {
            await handleAddToCart(product.id);
          } else {
            toast.error("Product not found");
          }
        }
        break;
      case "show_cart":
        navigate("/cart");
        break;
      case "checkout":
        // Navigate to cart and request the payment UI to open
        navigate("/cart", { state: { showPayment: true } });
        break;
    }
  };

  const categories = ["all", ...new Set(products.map(p => p.category))];

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartCount={cartCount}
        onVoiceClick={() => setIsVoiceOpen(!isVoiceOpen)}
        isVoiceActive={isVoiceOpen}
      />

      <main className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={isVoiceOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Voice-Enabled Shopping
              </h1>
              <p className="text-muted-foreground">
                Browse products or use voice commands to shop naturally
              </p>
            </div>

            <div className="mb-6 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
              <TabsList>
                {categories.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="capitalize">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className={`grid gap-6 ${isVoiceOpen ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found</p>
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
