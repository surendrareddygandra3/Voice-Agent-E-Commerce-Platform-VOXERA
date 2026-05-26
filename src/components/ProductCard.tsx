import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  stock: number;
  onAddToCart: (id: string) => void;
}

export const ProductCard = ({
  id,
  name,
  description,
  price,
  image_url,
  category,
  stock,
  onAddToCart,
}: ProductCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={image_url || "/placeholder.svg"}
          alt={name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
          <Badge variant="secondary" className="ml-2">
            {category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">₹{price.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={() => onAddToCart(id)}
          disabled={stock === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};
