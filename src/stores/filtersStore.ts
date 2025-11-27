import { atom, computed } from 'nanostores';
import type { AttributeFilters, SortOption } from '../lib/data/types';

/**
 * Store de filtros - ESPEJO de la URL (no fuente de verdad)
 * Se sincroniza con los query params
 */
export interface FiltersState {
  categorySlug: string;
  subcategorySlug: string | null;
  page: number;
  pageSize: number;
  sort: SortOption | null;
  attributeFilters: AttributeFilters;
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
}

const initialFiltersState: FiltersState = {
  categorySlug: '',
  subcategorySlug: null,
  page: 1,
  pageSize: 2, // Para testear paginación
  sort: null,
  attributeFilters: {},
  inStock: false,
};

export const filtersStore = atom<FiltersState>(initialFiltersState);

/**
 * Inicializa el store con valores de la URL o props iniciales
 */
export function initFiltersStore(state: Partial<FiltersState>) {
  filtersStore.set({
    ...initialFiltersState,
    ...state,
  });
}

/**
 * Setters individuales para modificar filtros
 */
export function setPage(page: number) {
  filtersStore.set({
    ...filtersStore.get(),
    page: Math.max(1, page),
  });
}

export function setPageSize(pageSize: number) {
  filtersStore.set({
    ...filtersStore.get(),
    pageSize: Math.max(1, Math.min(50, pageSize)),
    page: 1, // Reset a página 1 al cambiar pageSize
  });
}

export function setSort(sort: SortOption | null) {
  filtersStore.set({
    ...filtersStore.get(),
    sort,
    page: 1, // Reset a página 1 al cambiar orden
  });
}

export function setSubcategory(subcategorySlug: string | null) {
  const current = filtersStore.get();
  filtersStore.set({
    ...current,
    subcategorySlug,
    page: 1, // Reset a página 1 al cambiar subcategoría
    attributeFilters: {}, // Limpiar filtros al cambiar subcategoría
  });
}

export function setAttributeFilter(key: string, value: string | string[] | null) {
  const current = filtersStore.get();
  const newFilters = { ...current.attributeFilters };

  if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    delete newFilters[key];
  } else {
    newFilters[key] = value;
  }

  filtersStore.set({
    ...current,
    attributeFilters: newFilters,
    page: 1, // Reset a página 1 al cambiar filtros
  });
}

export function setPriceRange(minPrice?: number, maxPrice?: number) {
  filtersStore.set({
    ...filtersStore.get(),
    minPrice,
    maxPrice,
    page: 1,
  });
}

export function setInStock(inStock: boolean) {
  filtersStore.set({
    ...filtersStore.get(),
    inStock,
    page: 1,
  });
}

/**
 * Limpia todos los filtros EXCEPTO la subcategoría seleccionada.
 * Esto permite al usuario limpiar filtros de atributos sin perder
 * el contexto de la subcategoría en la que está navegando.
 */
export function resetFilters() {
  const current = filtersStore.get();
  filtersStore.set({
    ...initialFiltersState,
    categorySlug: current.categorySlug,
    subcategorySlug: current.subcategorySlug, // Preservar subcategoría
    pageSize: current.pageSize,
  });
}

/**
 * Limpia TODOS los filtros incluyendo la subcategoría.
 * Usar cuando se quiere volver al estado inicial completo.
 */
export function resetAllFilters() {
  const current = filtersStore.get();
  filtersStore.set({
    ...initialFiltersState,
    categorySlug: current.categorySlug,
    pageSize: current.pageSize,
  });
}

/**
 * Computed: Verifica si hay filtros activos (excluyendo subcategoría)
 * La subcategoría no se considera filtro para el botón "Limpiar Todo"
 */
export const hasActiveFilters = computed(filtersStore, (state) => {
  return (
    Object.keys(state.attributeFilters).length > 0 ||
    state.minPrice !== undefined ||
    state.maxPrice !== undefined ||
    state.inStock ||
    state.sort !== null
  );
});

/**
 * Computed: Verifica si hay CUALQUIER filtro activo incluyendo subcategoría
 */
export const hasAnyFilters = computed(filtersStore, (state) => {
  return (
    state.subcategorySlug !== null ||
    Object.keys(state.attributeFilters).length > 0 ||
    state.minPrice !== undefined ||
    state.maxPrice !== undefined ||
    state.inStock ||
    state.sort !== null
  );
});
