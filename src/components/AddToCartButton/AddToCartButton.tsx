import type { CartItem } from "@/lib/data/types";
import styles from "./AddToCartButton.module.css";
import { addToCart, DEFAULT_QUANTITY } from "@/stores/cart";

type CartItemData = Omit<CartItem, "quantity">;

interface AddToCartButtonProps {
  /** Datos del producto a agregar */
  product: CartItemData;
  /** Cantidad a agregar (por defecto 1) */
  quantity?: number;
  /** Callback ejecutado después de agregar al carrito */
  onAddToCart?: () => void;
  /** Texto personalizado del botón */
  label?: string;
  /** Si solo muestra el icono (sin texto) */
  iconOnly?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Botón para agregar productos al carrito.
 * 
 * Casos de uso:
 * - ProductCard: Solo botón, agrega 1 unidad (quantity=1)
 * - Página de producto: Con QuantitySelector, recibe quantity como prop
 */
export function AddToCartButton({
  product,
  quantity = DEFAULT_QUANTITY,
  onAddToCart,
  label = "Agregar al carrito",
  iconOnly = false,
  className = "",
}: AddToCartButtonProps) {
  const handleAddToCart = () => {
    addToCart(product, quantity);
    onAddToCart?.();
  };

  return (
    <button
      type="button"
      className={`${styles["add-to-cart-btn"]} ${iconOnly ? styles["icon-only"] : ""} ${className}`}
      data-product-id={product.id}
      aria-label={`Agregar ${product.name} al carrito`}
      onClick={handleAddToCart}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}
