import type { Product } from "@/lib/data/types";
import { ProductCard } from "./ProductCard";
import styles from "./ProductsGrid.module.css";

export interface ProductsGridProps {
  products: Array<Product & { 
    primaryImageUrl?: string | null; 
    secondaryImageUrl?: string | null 
  }>;
  isLoading: boolean;
}

/**
 * Skeleton de producto para estado de carga
 */
function ProductSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage}>
        <div className={styles.shimmer} />
      </div>
      <div className={styles.skeletonInfo}>
        <div className={styles.skeletonTitle}>
          <div className={styles.shimmer} />
        </div>
        <div className={styles.skeletonBrand}>
          <div className={styles.shimmer} />
        </div>
        <div className={styles.skeletonMeta}>
          <div className={styles.shimmer} />
        </div>
      </div>
    </div>
  );
}

export function ProductsGrid({ products, isLoading }: ProductsGridProps) {
  // Mostrar skeletons cuando está cargando
  if (isLoading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Cargando productos...">
        {/* Mostrar 6 skeletons por defecto */}
        {Array.from({ length: 6 }).map((_, index) => (
          <ProductSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <div 
          key={product.id} 
          className={styles.productWrapper}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ProductCard 
            product={product} 
            primaryImageUrl={product.primaryImageUrl || undefined}
            secondaryImageUrl={product.secondaryImageUrl || undefined}
          />
        </div>
      ))}
    </div>
  );
}
