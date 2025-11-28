import type { CartItem } from "@/lib/data/types";
import styles from "./AddToCartButton.module.css";
import { addToCart } from "@/stores/cart";

interface AddToCartButtonProps {
  product: CartItem;
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const handleAddToCart = () => {
    // Obtener cantidad del input (buscar en el DOM más cercano)
    const quantityInput = document.querySelector('input#quantity') as HTMLInputElement;
    const quantity = quantityInput && quantityInput.value ? parseInt(quantityInput.value, 10) : 1;
    
    // Validar que la cantidad sea válida
    const validQuantity = isNaN(quantity) || quantity < 1 ? 1 : quantity;
    
    addToCart({
      ...product,
      quantity: validQuantity
    });
  };

  return (
    <button
      className={styles["add-to-cart-btn"]}
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
      <span>Agregar al carrito</span>
    </button>
  );
}
