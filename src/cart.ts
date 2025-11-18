import { persistentMap } from "@nanostores/persistent";
import { computed } from "nanostores";

interface CartItem {
  id: string;
  name: string;
  description: number;
  image: string;
  quantity: number;
}

export const $cart = persistentMap<Record<string, CartItem>>(
  "cart:",
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export function addToCart(product: CartItem) {
  console.log(product);
  const currentCart = $cart.get();
  const productId = product.id;
  if (currentCart[productId]) {
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: currentCart[productId].quantity + 1,
    });
  } else {
    $cart.setKey(productId, {
      ...product,
      quantity: 1,
    });
  }
}

export function removeFromCart(productId: string) {
  $cart.setKey(productId, undefined);
}

export function clearCart() {
  $cart.set({});
}

export const $cartCount = computed($cart, (cart) => {
  return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
});
