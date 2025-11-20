import type { SupabaseClient } from "@supabase/supabase-js";

// --- Tipos ---
export interface Product {
  id: number;
  name: string;
  price: number;
  images: string[];
  attributes: Record<string, any>;
  slug: string;
}

export interface FilterState {
  [key: string]: string | number | boolean;
}

// --- Funciones de Datos (Agnósticas) ---
// Fíjate: Ya no importamos 'createClient' aquí.
// Pedimos el cliente como argumento 'client'.

/**
 * Obtiene configuración de subcategoría y productos iniciales
 */
export async function getSubcategoryWithConfig(
  client: SupabaseClient, // <--- EL CAMBIO CLAVE
  slug: string
) {
  const { data, error } = await client // Usamos el cliente inyectado
    .from("subcategories")
    .select("*, products(*)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching subcategory:", error);
    return null;
  }
  return data;
}

/**
 * Filtros Dinámicos (JSONB)
 */
export async function getFilteredProducts(
  client: SupabaseClient, // <--- EL CAMBIO CLAVE
  subcategorySlug: string,
  filters: FilterState,
  minPrice?: number,
  maxPrice?: number
) {
  // 1. Obtener ID de subcategoría
  const { data: subcat } = await client
    .from("subcategories")
    .select("id")
    .eq("slug", subcategorySlug)
    .single();

  if (!subcat) return [];

  // 2. Query Base
  let query = client
    .from("products")
    .select("*")
    .eq("subcategory_id", subcat.id);

  // 3. Filtros de Precio
  if (minPrice !== undefined) query = query.gte("price", minPrice);
  if (maxPrice !== undefined) query = query.lte("price", maxPrice);

  // 4. Filtros JSONB
  if (Object.keys(filters).length > 0) {
    query = query.contains("attributes", filters);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error filtrando:", error);
    return [];
  }
  return data;
}

/**
 * Buscador Global (RPC)
 */
export async function searchGlobal(client: SupabaseClient, term: string) {
  if (!term || term.length < 2) return [];

  const { data, error } = await client.rpc("search_products_global", {
    search_term: term,
  });

  if (error) {
    console.error("Error en búsqueda:", error);
    return [];
  }
  return data;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
}

/**
 * CASO 4: Cargar Categorías Principales (Para el Menú o Home)
 */
export async function getAllCategories(client: SupabaseClient) {
  const { data, error } = await client
    .from("categories")
    .select("id, name, slug, image_url")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error cargando categorías:", error);
    return [];
  }

  return data as Category[];
}
