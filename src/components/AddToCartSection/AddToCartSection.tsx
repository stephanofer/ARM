import { useState } from "preact/hooks";
import { QuantitySelector } from "@/components/QuantitySelector/QuantitySelector";
import { AddToCartButton } from "@/components/AddToCartButton/AddToCartButton";
import { DEFAULT_QUANTITY } from "@/stores/cart";
import type { CartItem } from "@/lib/data/types";
import styles from "./AddToCartSection.module.css";

type CartItemData = Omit<CartItem, "quantity">;

interface AddToCartSectionProps {
  product: CartItemData;
}

export function AddToCartSection({ product }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);

  return (
    <div className={styles.addToCartSection}>
      <QuantitySelector
        initialValue={DEFAULT_QUANTITY}
        onChange={setQuantity}
      />
      <AddToCartButton
        product={product}
        quantity={quantity}
        className={styles.addToCartBtn}
      />
    </div>
  );
}
