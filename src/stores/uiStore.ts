import { atom } from "nanostores";

/**
 * Store de UI - Estado visual compartido
 */
export interface UIState {
  viewMode: "grid" | "list";
  isFiltersOpen: boolean;
  isMobileMenuOpen: boolean;
}

const initialUIState: UIState = {
  viewMode: "grid",
  isFiltersOpen: true,
  isMobileMenuOpen: false,
};

export const uiStore = atom<UIState>(initialUIState);

/**
 * Cambia el modo de vista
 */
export function setViewMode(viewMode: "grid" | "list") {
  uiStore.set({
    ...uiStore.get(),
    viewMode,
  });
}

/**
 * Toggle del panel de filtros
 */
export function toggleFilters() {
  const current = uiStore.get();
  uiStore.set({
    ...current,
    isFiltersOpen: !current.isFiltersOpen,
  });
}

export function setFiltersOpen(isOpen: boolean) {
  uiStore.set({
    ...uiStore.get(),
    isFiltersOpen: isOpen,
  });
}

/**
 * Toggle del menú móvil
 */
export function toggleMobileMenu() {
  const current = uiStore.get();
  uiStore.set({
    ...current,
    isMobileMenuOpen: !current.isMobileMenuOpen,
  });
}

export function setMobileMenuOpen(isOpen: boolean) {
  uiStore.set({
    ...uiStore.get(),
    isMobileMenuOpen: isOpen,
  });
}
