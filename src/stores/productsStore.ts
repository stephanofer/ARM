import { atom } from 'nanostores';
import type { Product } from '../lib/data';

/**
 * Store de productos - Contiene la lista actual y estado de carga
 */
export interface ProductsState {
  items: Product[];
  page: number;
  pageSize: number;
  total: number | null;
  totalPages: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialProductsState: ProductsState = {
  items: [],
  page: 1,
  pageSize: 24,
  total: null,
  totalPages: null,
  isLoading: false,
  error: null,
};

export const productsStore = atom<ProductsState>(initialProductsState);

/**
 * Inicializa el store con productos iniciales (desde SSR)
 */
export function initProductsStore(state: Partial<ProductsState>) {
  productsStore.set({
    ...initialProductsState,
    ...state,
    isLoading: false,
    error: null,
  });
}

/**
 * Actualiza los productos con nueva data
 */
export function setProducts(data: {
  items: Product[];
  page: number;
  pageSize: number;
  total: number | null;
  totalPages: number | null;
}) {
  productsStore.set({
    ...data,
    isLoading: false,
    error: null,
  });
}

/**
 * Establece estado de carga
 */
export function setLoading(isLoading: boolean) {
  productsStore.set({
    ...productsStore.get(),
    isLoading,
    error: null,
  });
}

/**
 * Establece un error
 */
export function setError(error: string) {
  productsStore.set({
    ...productsStore.get(),
    isLoading: false,
    error,
  });
}

/**
 * Limpia el store
 */
export function clearProducts() {
  productsStore.set(initialProductsState);
}
