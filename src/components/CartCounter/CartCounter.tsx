import Cart from "@/assets/svg/Cart.svg";
import { $cartCount } from "@/cart";
import { useStore } from "@nanostores/preact";
import styles from "./CartCounter.module.css";

export function CartCounter() {
  const handleCLick = () => {
    const cartDrawer = document.querySelector(".cart-drawer-overlay");
    console.log("Cart button clicked");
    if (!cartDrawer) return;
    cartDrawer.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const itemCount = useStore($cartCount);

  return (
    <button
      className={`${styles["icon-button"]} ${styles["cart-button"]}`}
      id="cartButton"
      aria-label="Carrito"
      onClick={handleCLick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 512 512"
      >
        <circle
          cx="176"
          cy="416"
          r="16"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="32"
        />
        <circle
          cx="400"
          cy="416"
          r="16"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="32"
        />
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="32"
          d="M48 80h64l48 272h256"
        />
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="32"
          d="M160 288h249.44a8 8 0 0 0 7.85-6.43l28.8-144a8 8 0 0 0-7.85-9.57H128"
        />
      </svg>
      <span className={styles["cart-badge"]}>{itemCount}</span>
    </button>
  );
}
