import { useEffect, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { $products, $isLoading, $totalProducts } from "@/shopStore";
import { ProductCard } from "./ProductCard";
import styles from "./ProductGrid.module.css";
import type { Product } from "@/types";

interface Props {
  initialProducts: Product[];
  initialTotal: number;
}

export function ProductsGrid({ initialProducts, initialTotal }: Props) {
  const products = useStore($products);
  const isLoading = useStore($isLoading);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (initialProducts) {
      $products.set(initialProducts);
      $totalProducts.set(initialTotal);

      setIsHydrated(true);
    }
  }, []);

  const productsToRender = isHydrated ? products : initialProducts;

  if (isLoading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", width: "100%" }}>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className={styles["products-grid"]} data-view="grid">
      {productsToRender.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id.toString()}
          name={product.name}
          description={product.description ?? ""}
          inStock={true}
          image={product.images?.[0]}
          brand={product.brand ?? ""}
          productUrl={`/productos/${product.name || "#"}`}
          secondImage={product.images?.[1] || product.images?.[0]}
        />
      ))}

      {productsToRender.length === 0 && (
        <div
          style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}
        >
          <h3>No se encontraron productos</h3>
          <p>Intenta ajustar tus filtros.</p>
        </div>
      )}
    </div>
  );
}
