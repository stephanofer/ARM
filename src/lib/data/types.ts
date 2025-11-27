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
  slug: string;
  description: string | null;
  price: number | null;
  stock: number;
  brand: string | null;
  attributes: Record<string, any>;
  created_at: string;
}

// ============================
// TIPOS DE ASSETS
// ============================

export type AssetKind = 'image' | 'video' | 'file';
export type AssetSection = 'gallery' | 'additional' | 'download';

export interface ProductAsset {
  id: number;
  product_id: number;
  kind: AssetKind;
  section: AssetSection;
  storage_bucket: string;
  storage_path: string;
  title: string | null;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
  is_secondary: boolean;
  poster_storage_path: string | null;
  duration_seconds: number | null;
  filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  is_public: boolean;
  created_at: string;
}

// Tipos básicos para consultas ligeras
export interface ProductBasic {
  id: number;
  slug: string;
  name: string;
  category_id: number;
  subcategory_id: number;
}

// Producto con todos sus assets
export interface ProductWithAssets {
  product: Product;
  assets: ProductAsset[];
}

// Assets organizados por sección
export interface ProductAssetsGrouped {
  gallery: ProductAsset[];
  additional: ProductAsset[];
  download: ProductAsset[];
}

// Producto completo con relaciones y assets
export interface ProductFullDetails {
  product: Product;
  category: Category;
  subcategory: Subcategory;
  assets: ProductAssetsGrouped;
}

// Producto con URLs de imágenes para cards
export interface ProductWithImages extends Product {
  primaryImageUrl: string | null;
  secondaryImageUrl: string | null;
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
