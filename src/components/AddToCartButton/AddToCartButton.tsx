import styles from "./AddToCartButton.module.css";
import { addToCart } from "@/cart";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    description: string;
    image: string;
    quantity: number;
    inStock: boolean;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const handleAddToCart = (product: AddToCartButtonProps["product"]) => {
    addToCart(product);
  };
  return (
    <button
      className={styles["add-to-cart-btn"]}
      data-product-id={product.id}
      disabled={!product.inStock}
      aria-label={`Agregar ${product.name} al carrito`}
      onClick={() => handleAddToCart(product)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span>{product.inStock ? "Agregar al carrito" : "No disponible"}</span>
    </button>
  );
}
