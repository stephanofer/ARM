import { AddToCartButton } from "@/components/AddToCartButton/AddToCartButton";
import styles from "./ProductCard.module.css";
import type { Product } from "@/lib/data/types";

type Props = {
  product: Product;
  primaryImageUrl?: string;
  secondaryImageUrl?: string;
};

export function ProductCard({
  product,
  primaryImageUrl,
  secondaryImageUrl,
}: Props) {
  const productUrl = `/producto/${product.slug}`;
  const inStock = product.stock > 0;
  const displayBrand = product.brand || product.attributes.brand || 'ARM';
  
  return (
    <article className={styles["product-card"]}>
      <a href={productUrl} className={styles["product-link"]}>
        <div className={styles["product-image-wrapper"]}>
          {!inStock && (
            <span className={styles["badge"] + " " + styles["badge-discount"]}>
              Agotado
            </span>
          )}

          <div className={styles["image-container"]}>
            {primaryImageUrl ? (
              <>
                <img
                  src={primaryImageUrl}
                  alt={product.name}
                  className={
                    styles["product-image"] + " " + styles["primary-image"]
                  }
                  loading="lazy"
                />
                {secondaryImageUrl && (
                  <img
                    src={secondaryImageUrl}
                    alt={`${product.name} - vista alternativa`}
                    className={
                      styles["product-image"] + " " + styles["secondary-image"]
                    }
                    loading="lazy"
                  />
                )}
              </>
            ) : (
              <div className={styles["no-image"]}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className={styles["product-info"]}>
          <span className={styles["product-brand"]}>{displayBrand}</span>
          <h3 className={styles["product-name"]}>{product.name}</h3>
          {product.description && (
            <p className={styles["product-description"]}>
              {product.description.length > 80 
                ? `${product.description.substring(0, 80)}...` 
                : product.description}
            </p>
          )}
        </div>
      </a>

      <div className={styles["product-actions"]}>
        <AddToCartButton
          product={{
            ...product,
            quantity: 1,
          }}
        />
      </div>
    </article>
  );
}
