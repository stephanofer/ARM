import { persistentMap } from "@nanostores/persistent";
import { computed } from "nanostores";

interface CartItem {
  id: string;
  name: string;
  description: string;
  image: string;
  quantity: number;
  inStock: boolean;
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

export function increaseQuantity(productId: string) {
  const currentCart = $cart.get();
  if (currentCart[productId]) {
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: currentCart[productId].quantity + 1,
    });
  }
}

export function decreaseQuantity(productId: string) {
  const currentCart = $cart.get();
  if (currentCart[productId] && currentCart[productId].quantity > 1) {
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: currentCart[productId].quantity - 1,
    });
  }
}

export function setQuantity(productId: string, quantity: number) {
  const currentCart = $cart.get();
  if (currentCart[productId] && quantity > 0) {
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: quantity,
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
