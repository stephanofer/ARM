import type { SortOption } from '@/lib/data/types';
import { setSort } from '@/stores/filtersStore';
import styles from './SortBar.module.css';

export interface SortBarProps {
  currentSort: SortOption | null;
  totalResults: number;
  isLoading: boolean;
}

export function SortBar({ currentSort, totalResults, isLoading }: SortBarProps) {
  const handleSortChange = (e: Event) => {
    const target = e.currentTarget as HTMLSelectElement;
    const value = target.value || null;
    setSort(value as SortOption | null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.results}>
        {isLoading ? (
          <span className={styles.loadingPill}>
            <span className={styles.loadingDot} />
            <span className={styles.loadingText}>Actualizando</span>
          </span>
        ) : (
          <span className={styles.resultsText}>
            <strong>{totalResults}</strong> {totalResults === 1 ? 'producto encontrado' : 'productos encontrados'}
          </span>
        )}
      </div>

      <div className={styles.sortGroup}>
        <label htmlFor="sort" className={styles.label}>
          Ordenar por:
        </label>
        <select
          id="sort"
          className={`${styles.select} ${isLoading ? styles.selectLoading : ''}`}
          value={currentSort || ''}
          onChange={handleSortChange}
          disabled={isLoading}
        >
          <option value="">Más recientes</option>
          <option value="price_asc">Precio: Menor a Mayor</option>
          <option value="price_desc">Precio: Mayor a Menor</option>
          <option value="name_asc">Nombre: A-Z</option>
          <option value="name_desc">Nombre: Z-A</option>
          <option value="newest">Más nuevos</option>
        </select>
      </div>
    </div>
  );
}
