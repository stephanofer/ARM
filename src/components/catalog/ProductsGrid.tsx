import type { Product } from "../../lib/data";
import { ProductCard } from "./ProductCard";
import styles from "./ProductsGrid.module.css";

export interface ProductsGridProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductsGrid({ products, isLoading }: ProductsGridProps) {
  return (
    <div className={`${styles.grid} ${isLoading ? styles.loading : ""}`}>
      {products.map((product) => (
        <ProductCard product={product} />
      ))}
    </div>
  );
}
