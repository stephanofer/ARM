import {
  $cart,
  decreaseQuantity,
  increaseQuantity,
  removeFromCart,
  setQuantity,
} from "@/cart";
import { useStore } from "@nanostores/preact";
import styles from "./cartItems.module.css";
export function CartItems() {
  const cartItems = Object.values(useStore($cart));

  const handleDelete = (id: string) => {
    removeFromCart(id);
  };

  return (
    <>
      {cartItems.length > 0 ? (
        <div className={styles["cart-items-list"]}>
          {cartItems.map((item, index) => (
            <div
              key={item.id}
              className={styles["cart-item"]}
              style={{ animationDelay: `${0.05 + index * 0.05}s` }}
            >
              <div className={styles["cart-item-image"]}>
                <img src={item.image} alt={item.name} />
              </div>
              <div className={styles["cart-item-details"]}>
                <h3 className={styles["cart-item-name"]}>{item.name}</h3>
                <div className={styles["cart-item-meta"]}>
                  <span className={styles["cart-item-brand"]}>ARM</span>
                  <span className={styles["meta-separator"]}>•</span>
                  <span className={styles["cart-item-material"]}>
                    Maderitaxd
                  </span>
                </div>
                <div className={styles["cart-item-actions"]}>
                  <div className={styles["quantity-controls"]}>
                    <button
                      className={styles["qty-btn"]}
                      data-action="decrease"
                      data-item-id={item.id}
                      aria-label="Disminuir cantidad"
                      onClick={() => decreaseQuantity(item.id)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min="1"
                      className={styles["quantity-display"]}
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.currentTarget.value);
                        if (value > 0) {
                          setQuantity(item.id, value);
                        } else {
                          setQuantity(item.id, 1);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.currentTarget.value);
                        if (!value || value <= 0) {
                          setQuantity(item.id, 1);
                        }
                      }}
                    />
                    <button
                      className={styles["qty-btn"]}
                      data-action="increase"
                      data-item-id={item.id}
                      aria-label="Aumentar cantidad"
                      onClick={() => increaseQuantity(item.id)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                  <button
                    className={styles["remove-item-btn"]}
                    data-item-id={item.id}
                    aria-label="Eliminar producto"
                    onClick={() => handleDelete(item.id)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles["empty-cart"]}>
          <div className={styles["empty-cart-icon"]}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h3 className={styles["empty-cart-title"]}>Tu carrito está vacío</h3>
          <p className={styles["empty-cart-text"]}>
            Agrega productos para comenzar tu pedido
          </p>
          <a href="/categorias" className={styles["browse-products-btn"]}>
            Explorar productos
          </a>
        </div>
      )}
    </>
  );
}
