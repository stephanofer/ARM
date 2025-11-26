import type { Product } from "../../lib/data/types";
import { ProductCard } from "./ProductCard";
import styles from "./ProductsGrid.module.css";

export interface ProductsGridProps {
  products: Array<Product & { 
    primaryImageUrl?: string | null; 
    secondaryImageUrl?: string | null 
  }>;
  isLoading: boolean;
}

export function ProductsGrid({ products, isLoading }: ProductsGridProps) {
  return (
    <div className={`${styles.grid} ${isLoading ? styles.loading : ""}`}>
      {products.map((product) => (
        <ProductCard 
          key={product.id}
          product={product} 
          primaryImageUrl={product.primaryImageUrl || undefined}
          secondaryImageUrl={product.secondaryImageUrl || undefined}
        />
      ))}
    </div>
  );
}
