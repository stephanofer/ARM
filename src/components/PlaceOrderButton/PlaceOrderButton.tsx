import { useStore } from "@nanostores/preact";
import styles from "./PlaceOrderButton.module.css";
import { $cart } from "@/cart";
export function PlaceOrderButton() {
  const cartItems = Object.values(useStore($cart));

  const handleClick = () => {
    console.log(cartItems);
  };

  return (
    <>
      <button
        class={styles["cart-action-btn"] + " " + styles.primary}
        id="checkoutBtn"
        onClick={() => handleClick()}
      >
        <span>Finalizar pedido</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </>
  );
}
