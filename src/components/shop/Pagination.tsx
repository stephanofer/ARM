import { useStore } from "@nanostores/preact";
import { $totalProducts, $isLoading } from "@/shopStore";
import styles from "./Pagination.module.css";
import { PAGE_SIZE } from "@/config";

interface Props {
  initialTotal: number;
}

export function Pagination({ initialTotal = 0 }: Props) {
  const storeTotal = useStore($totalProducts);
  const loading = useStore($isLoading);

  const total = storeTotal === 0 ? initialTotal : storeTotal;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log("Paginación render:", {
    storeTotal,
    initialTotal,
    totalUsado: total,
  });
  const currentUrl = new URL(
    typeof window !== "undefined" ? window.location.href : "http://localhost"
  );
  const currentPage = Number(currentUrl.searchParams.get("page")) || 1;

  if (totalPages <= 1) return null; 

  const changePage = (newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", newPage.toString());

    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={styles.pagination}>
      <button
        disabled={currentPage === 1 || loading}
        onClick={() => changePage(currentPage - 1)}
      >
        Anterior
      </button>

      <span>
        Página {currentPage} de {totalPages}
      </span>

      <button
        disabled={currentPage === totalPages || loading}
        onClick={() => changePage(currentPage + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
