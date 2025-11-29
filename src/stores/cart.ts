import { persistentMap } from "@nanostores/persistent";
import { computed } from "nanostores";
import type { CartItem } from "../lib/data/types";

// ============================
// CONSTANTES DE CANTIDAD
// ============================
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
export const DEFAULT_QUANTITY = 1;

/**
 * Valida y ajusta una cantidad al rango permitido
 */
export function clampQuantity(value: number): number {
  if (isNaN(value) || value < MIN_QUANTITY) return MIN_QUANTITY;
  if (value > MAX_QUANTITY) return MAX_QUANTITY;
  return Math.floor(value);
}

// ============================
// STORE DEL CARRITO
// ============================
export const $cart = persistentMap<Record<string, CartItem>>(
  "cart:",
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// Tipo para agregar al carrito (sin quantity requerido)
type CartItemData = Omit<CartItem, "quantity">;

/**
 * Agrega un producto al carrito con la cantidad especificada.
 * Si el producto ya existe, suma la cantidad.
 */
export function addToCart(product: CartItemData, quantity: number = DEFAULT_QUANTITY) {
  const currentCart = $cart.get();
  const productId = product.id.toString();
  const quantityToAdd = clampQuantity(quantity);
  
  if (currentCart[productId]) {
    // Producto existe: sumar cantidad (respetando el máximo)
    const newQuantity = clampQuantity(currentCart[productId].quantity + quantityToAdd);
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: newQuantity,
    });
  } else {
    // Producto nuevo: agregar con la cantidad indicada
    $cart.setKey(productId, {
      ...product,
      quantity: quantityToAdd,
    });
  }
}

export function increaseQuantity(productId: string) {
  const currentCart = $cart.get();
  if (currentCart[productId]) {
    const newQuantity = clampQuantity(currentCart[productId].quantity + 1);
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: newQuantity,
    });
  }
}

export function decreaseQuantity(productId: string) {
  const currentCart = $cart.get();
  if (currentCart[productId] && currentCart[productId].quantity > MIN_QUANTITY) {
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: currentCart[productId].quantity - 1,
    });
  }
}

export function setQuantity(productId: string, quantity: number) {
  const currentCart = $cart.get();
  if (currentCart[productId]) {
    const validQuantity = clampQuantity(quantity);
    $cart.setKey(productId, {
      ...currentCart[productId],
      quantity: validQuantity,
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
