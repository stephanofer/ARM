import { setPage } from "@/stores/filtersStore";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  isLoading,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };
  const renderMobilePageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 1) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }

    return pages;
  };

  return (
    <nav className={styles.container} aria-label="Paginación">
      <button
        className={`${styles.button} ${styles.prevButton} ${
          isLoading ? styles.loading : ""
        }`}
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        aria-label="Página anterior"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className={styles.buttonText}>Anterior</span>
      </button>

      <div className={styles.pagesDesktop}>
        {renderPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                ···
              </span>
            );
          }

          return (
            <button
              key={page}
              className={`${styles.pageButton} ${
                page === currentPage ? styles.active : ""
              } ${isLoading ? styles.loading : ""}`}
              onClick={() => handlePageClick(page as number)}
              disabled={isLoading}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <div className={styles.pagesMobile}>
        {renderMobilePageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-m-${index}`} className={styles.ellipsis}>
                ·
              </span>
            );
          }

          return (
            <button
              key={`m-${page}`}
              className={`${styles.pageButton} ${
                page === currentPage ? styles.active : ""
              } ${isLoading ? styles.loading : ""}`}
              onClick={() => handlePageClick(page as number)}
              disabled={isLoading}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <div className={styles.mobileIndicator}>
        <span className={styles.currentPageLabel}>
          {currentPage} <span className={styles.separator}>/</span> {totalPages}
        </span>
      </div>

      <button
        className={`${styles.button} ${styles.nextButton} ${
          isLoading ? styles.loading : ""
        }`}
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        aria-label="Página siguiente"
      >
        <span className={styles.buttonText}>Siguiente</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}
