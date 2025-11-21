import { AddToCartButton } from "@/components/AddToCartButton/AddToCartButton";
import styles from './ProductCard.module.css'

type Props = {
  id: string;
  name: string;
  description: string;
  brand: string;
  image: string;
  secondImage: string;
  productUrl: string;
  inStock: boolean;
};

export function ProductCard({
  id,
  name,
  description,
  brand,
  image,
  secondImage,
  productUrl,
  inStock,
}: Props) {
  return (
    <article className={styles["product-card"]}>
      <a href={productUrl} className={styles["product-link"]}>
        <div className={styles["product-image-wrapper"]}>
          {!inStock && <span className={styles["badge"] + " " + styles["badge-discount"]}>Agotado</span>}

          <div className={styles["image-container"]}>
            <img
              src={image}
              alt={name}
              className={styles["product-image"] + " " + styles["primary-image"]}
              loading="lazy"
            />
            <img
              src={secondImage}
              alt={`${name} - vista alternativa`}
              className={styles["product-image"] + " " + styles["secondary-image"]}
              loading="lazy"
            />
          </div>
        </div>

        <div className={styles["product-info"]}>
          <span className={styles["product-brand"]}>{brand}</span>
          <h3 className={styles["product-name"]}>{name}</h3>
          <p className={styles["product-description"]}>{description}</p>

          <div className={styles["product-footer"]}>
            <span className={styles["stock-status"]} data-in-stock={inStock}>
              {inStock ? "Disponible" : "No disponible"}
            </span>
          </div>
        </div>
      </a>

      <div className="product-actions">
        <AddToCartButton
          product={{
            id,
            name,
            description,
            image,
            quantity: 1,
            inStock,
          }}
        />
      </div>
    </article>
  );
}
