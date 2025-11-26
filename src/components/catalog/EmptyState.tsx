import { resetFilters } from '@/stores/filtersStore';
import styles from './EmptyState.module.css';

export function EmptyState() {
  const handleClearFilters = () => {
    resetFilters();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>No se encontraron productos</h2>
        <p className={styles.message}>
          No hay productos que coincidan con los filtros seleccionados.
        </p>
        <button className={styles.button} onClick={handleClearFilters}>
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
