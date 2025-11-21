import type { SupabaseClient } from "@supabase/supabase-js";

import type { Category, Product, SubcategoryWithFilters } from "@/types";

export async function getCategoryBySlug(
  client: SupabaseClient,
  categorySlug: string
) {
  const { data, error } = await client
    .from("categories")
    .select("id, name, slug, image_url")
    .eq("slug", categorySlug)
    .single();

  if (error) {
    console.error("Error obteniendo categoría por slug:", error);
    return null;
  }

  return data as Category;
}

export async function getSubcategoriesByCategory(
  client: SupabaseClient,
  categoryId: number
) {
  const { data, error } = await client
    .from("subcategories")
    .select("id, name, slug, filter_config, display_order, category_id")
    .eq("category_id", categoryId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error obteniendo subcategorías:", error);
    return [];
  }

  return data as SubcategoryWithFilters[];
}

export async function getAllCategories(client: SupabaseClient) {
  const { data, error } = await client
    .from("categories")
    .select("id, name, slug, image_url")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error obteniendo categorías:", error);
    return [];
  }

  return data as Category[];
}

export async function getProductsByCategory(
  client: SupabaseClient,
  categoryId: number
) {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo productos por categoría:", error);
    return [];
  }

  return data as Product[];
}

export async function getProductsBySubcategory(
  client: SupabaseClient,
  subcategoryId: number
) {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("subcategory_id", subcategoryId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo productos por subcategoría:", error);
    return [];
  }

  return data as Product[];
}


export async function getFilteredProducts(
  client: SupabaseClient,
  categoryId: number,
  subcategoryId: number | null,
  filters: Record<string, any> = {},
  page: number = 1,      // <--- NUEVO PARAM
  pageSize: number = 3  // <--- NUEVO PARAM (12 productos por página)
) {
  let query = client
    .from("products")
    .select("*", { count: "exact" }) // <--- SOLICITAMOS EL CONTEO TOTAL
    .eq("category_id", categoryId);

  if (subcategoryId) query = query.eq("subcategory_id", subcategoryId);
  if (Object.keys(filters).length > 0) query = query.contains("attributes", filters);

  // CALCULAR EL RANGO (Paginación)
  // Página 1: range(0, 11)
  // Página 2: range(12, 23)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to); // <--- APLICAMOS EL RANGO

  if (error) {
    console.error(error);
    return { data: [], total: 0 }; // Retornamos estructura segura
  }

  return { 
    data: data as Product[], 
    total: count || 0 
  };
}
