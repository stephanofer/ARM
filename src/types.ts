export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
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

export interface FilterConfig {
  key: string;
  type: "select" | "range" | "checkbox" | "boolean";
  label: string;
  options?: string[];
}

export interface Product {
  id: number;
  subcategory_id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  brand: string | null;
  attributes: Record<string, any>;
  created_at: string;
}

// src/types/database.ts

export interface SubcategoryWithFilters {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  filter_config: FilterConfig[];
  display_order: number;
}

export interface SubcategorySimple {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  category_id: number;
}
