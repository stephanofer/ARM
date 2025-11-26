import type { Product } from "../../lib/data";
import styles from "./ProductsGrid.module.css";

export interface ProductsGridProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductsGrid({ products, isLoading }: ProductsGridProps) {
  return (
    <div className={`${styles.grid} ${isLoading ? styles.loading : ""}`}>
      {products.map((product) => (
        <article key={product.id} className={styles.card}>
          <a href={`/producto/${product.id}`} className={styles.link}>
            {/* Imagen */}
            <div className={styles.imageContainer}>
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className={styles.image}
                  loading="lazy"
                />
              ) : (
                <div className={styles.placeholder}>Sin imagen</div>
              )}
            </div>

            {/* Info */}
            <div className={styles.info}>
              <h3 className={styles.name}>{product.name}</h3>

              {product.brand && <p className={styles.brand}>{product.brand}</p>}

              {product.price !== null && (
                <p className={styles.price}>${product.price.toFixed(2)}</p>
              )}

              {product.stock > 0 ? (
                <p className={styles.stock}>En stock</p>
              ) : (
                <p className={styles.outOfStock}>Agotado</p>
              )}
            </div>
          </a>
        </article>
      ))}
    </div>
  );
}
