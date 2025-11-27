import { useStore } from "@nanostores/preact";
import { $cart } from "@/stores/cart";
import styles from "./PlaceOrderButton.module.css";
import { object } from "astro:schema";

export const PlaceOrderButton = () => {
  const cartItems = useStore($cart); // <-- tus productos desde nanostores
  console.log(Object.keys(cartItems).length === 0);

  const phone = "51981314610"; // tu número

  const handleClick = () => {
    const items = Object.values(cartItems || {});

    let message = `Hola, quiero hacer un pedido:%0A%0A`;

    items.forEach((item, i) => {
      message += `${i + 1}. ${item.name} - Cantidad: ${item.quantity}%0A`;
    });

    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, "_blank");
  };

  return (
    <button
      className={styles["whatsapp-btn"]}
      aria-label="Realizar pedido por WhatsApp"
      onClick={handleClick}
      disabled={Object.keys(cartItems).length === 0}
    >
      <span>Realizar pedido por WhatsApp</span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" />
        <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
        <path
          d="M9 10a.5 .5 0 0 0 1 0v-1
      a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1
      a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"
        />
      </svg>
    </button>
  );
};
