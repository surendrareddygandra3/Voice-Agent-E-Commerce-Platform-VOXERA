import { ShoppingCart, User, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface HeaderProps {
  cartCount?: number;
  onVoiceClick?: () => void;
  isVoiceActive?: boolean;
}

export const Header = ({ cartCount = 0, onVoiceClick, isVoiceActive }: HeaderProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="font-bold text-xl">VoxShop AI</span>
        </div>

        <div className="flex items-center gap-2">
          {onVoiceClick && (
            <Button
              variant={isVoiceActive ? "default" : "outline"}
              size="icon"
              onClick={onVoiceClick}
              className="relative"
            >
              <Mic className={`h-5 w-5 ${isVoiceActive ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {cartCount}
              </Badge>
            )}
          </Button>

          {user ? (
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <User className="h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  );
};
