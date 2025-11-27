import { atom } from 'nanostores';
import type { Subcategory, FilterConfig } from '../lib/data/types';

/**
 * Store de catálogo - Cachea subcategorías y filter configs por categoría
 */
export interface CatalogState {
  subcategoriesByCategorySlug: Record<string, Subcategory[]>;
  filterConfigBySubcategorySlug: Record<string, FilterConfig[]>;
}

const initialCatalogState: CatalogState = {
  subcategoriesByCategorySlug: {},
  filterConfigBySubcategorySlug: {},
};

export const catalogStore = atom<CatalogState>(initialCatalogState);

/**
 * Cachea las subcategorías de una categoría
 */
export function cacheSubcategories(categorySlug: string, subcategories: Subcategory[]) {
  const current = catalogStore.get();
  catalogStore.set({
    ...current,
    subcategoriesByCategorySlug: {
      ...current.subcategoriesByCategorySlug,
      [categorySlug]: subcategories,
    },
  });
}

/**
 * Obtiene las subcategorías cacheadas de una categoría
 */
export function getCachedSubcategories(categorySlug: string): Subcategory[] | null {
  const state = catalogStore.get();
  return state.subcategoriesByCategorySlug[categorySlug] || null;
}

/**
 * Cachea el filter config de una subcategoría
 */
export function cacheFilterConfig(subcategorySlug: string, filterConfig: FilterConfig[]) {
  const current = catalogStore.get();
  catalogStore.set({
    ...current,
    filterConfigBySubcategorySlug: {
      ...current.filterConfigBySubcategorySlug,
      [subcategorySlug]: filterConfig,
    },
  });
}

/**
 * Obtiene el filter config cacheado de una subcategoría
 */
export function getCachedFilterConfig(subcategorySlug: string): FilterConfig[] | null {
  const state = catalogStore.get();
  return state.filterConfigBySubcategorySlug[subcategorySlug] || null;
}

/**
 * Limpia el cache
 */
export function clearCatalogCache() {
  catalogStore.set(initialCatalogState);
}
