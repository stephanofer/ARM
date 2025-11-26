import { AddToCartButton } from "@/components/AddToCartButton/AddToCartButton";
import styles from "./ProductCard.module.css";
import type { Product } from "@/lib/data/types";

type Props = {
  product: Product;
};

export function ProductCard({
  product: {
    id,
    name,
    description,
    brand,
    attributes,
    category_id,
    created_at,
    images,
    price,
    stock,
    subcategory_id,
  },
}: Props) {
  return (
    <article className={styles["product-card"]}>
      <a className={styles["product-link"]}>
        <div className={styles["product-image-wrapper"]}>
          {!stock && (
            <span className={styles["badge"] + " " + styles["badge-discount"]}>
              Agotado
            </span>
          )}

          <div className={styles["image-container"]}>
            <img
              src={images[0]}
              alt={name}
              className={
                styles["product-image"] + " " + styles["primary-image"]
              }
              loading="lazy"
            />
            <img
              src={images[1]}
              alt={`${name} - vista alternativa`}
              className={
                styles["product-image"] + " " + styles["secondary-image"]
              }
              loading="lazy"
            />
          </div>
        </div>

        <div className={styles["product-info"]}>
          <span className={styles["product-brand"]}>{brand}</span>
          <h3 className={styles["product-name"]}>{name}</h3>
          <p className={styles["product-description"]}>{description}</p>

          <AddToCartButton
            product={{
              id,
              name,
              description,
              brand,
              attributes,
              category_id,
              created_at,
              images,
              price,
              stock,
              subcategory_id,
            }}
          />
        </div>
      </a>

    </article>
  );
}
