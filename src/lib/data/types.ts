// ============================
// TIPOS DE BASE DE DATOS
// ============================

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  created_at: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  filter_config: FilterConfig[];
  display_order: number;
  created_at: string;
}

export interface Product {
  id: number;
  subcategory_id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number | null;
  stock: number;
  images: string[];
  brand: string | null;
  attributes: Record<string, any>;
  created_at: string;
}

export interface CartItem extends Product {
  quantity: number;
}

// ============================
// TIPOS DE FILTROS
// ============================

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "checkbox" | "range" | "boolean";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export type SortOption =
  | "price_asc"
  | "price_desc"
  | "newest"
  | "name_asc"
  | "name_desc";

export interface AttributeFilters {
  [key: string]: string | string[];
}

export interface ProductFilters {
  attributeFilters: AttributeFilters;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: SortOption;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

// ============================
// TIPOS DE RESPUESTA
// ============================

export interface PaginatedProductsResponse {
  items: Product[];
  page: number;
  pageSize: number;
  total: number | null;
  totalPages: number | null;
}

export interface CategoryWithSubcategories {
  category: Category;
  subcategories: Subcategory[];
}

export interface SubcategoryWithCategory {
  category: Category;
  subcategory: Subcategory;
  allSubcategories: Subcategory[];
}

export interface ProductWithRelations {
  product: Product;
  category: Category;
  subcategory: Subcategory;
}
