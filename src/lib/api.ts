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

/**
 * CASO 5: Obtener todos los productos de una CATEGORÍA PRINCIPAL
 * Ej: Traer todo lo de "Mobiliario" (incluye Sillas, Camas, etc.)
 */
export async function getProductsByCategory(
  client: SupabaseClient,
  categorySlug: string
) {
  const { data, error } = await client
    .from("products")
    .select(
      `
      *,
      subcategories!inner (
        name,
        slug,
        categories!inner (
          slug,
          name
        )
      )
    `
    )
    // El filtro mágico: Accedemos a la tabla "abuela" (categories)
    .eq("subcategories.categories.slug", categorySlug);

  if (error) {
    console.error("Error obteniendo productos por categoría:", error);
    return [];
  }

  return data as Product[];
}

/**
 * CASO 6: Obtener todas las subcategorías de una Categoría Principal
 * Ej: Si entro a "Mobiliario", quiero ver [Camas, Sillas, Mesas] y sus configs.
 */
export async function getSubcategoriesByCategory(
  client: SupabaseClient,
  categorySlug: string
) {
  const { data, error } = await client
    .from("subcategories")
    .select(
      `
      id,
      name,
      slug,
      filter_config,
      categories!inner (
        name,
        slug
      )
    `
    )
    // Filtramos haciendo Join con la tabla padre
    .eq("categories.slug", categorySlug)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error obteniendo subcategorías:", error);
    return [];
  }

  return data;
}



import type { SupabaseClient } from "@supabase/supabase-js";

// Tipos para los filtros
export interface ProductFilterParams {
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  // Aquí van los dinámicos: { "material": "Madera", "size": "King" }
  attributes?: Record<string, any>; 
}

/**
 * CASO PRINCIPAL: Obtener Productos de una Subcategoría con Filtros
 */
export async function getProductsBySubcategory(
  client: SupabaseClient, 
  slug: string, 
  filters: ProductFilterParams
) {
  // 1. Primero obtenemos el ID de la subcategoría usando el slug
  const { data: subcat, error: subError } = await client
    .from("subcategories")
    .select("id")
    .eq("slug", slug)
    .single();

  if (subError || !subcat) {
    console.error("Subcategoría no encontrada:", slug);
    return [];
  }

  // 2. Iniciamos la query a la tabla Productos
  let query = client
    .from("products")
    .select("*")
    .eq("subcategory_id", subcat.id); // Filtro base: Solo productos de esta subcategoría

  // 3. Aplicamos Filtros de Precio (Columnas normales)
  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  // 4. Aplicamos Filtros Dinámicos (JSONB) 🪄
  // Si attributes es { "material": "Roble", "storage": true }
  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    // El operador .contains busca que el JSON de la DB contenga este sub-objeto
    query = query.contains("attributes", filters.attributes);
  }

  // 5. Aplicamos Ordenamiento
  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      // Por defecto ordenamos por relevancia o fecha
      query = query.order('created_at', { ascending: false });
  }

  // 6. Ejecutamos
  const { data, error } = await query;

  if (error) {
    console.error("Error al filtrar productos:", error);
    return [];
  }

  return data;
}




/**
 * CASO 8: Obtener DETALLE DE PRODUCTO
 * Trae el producto + Subcategoría + Categoría (para breadcrumbs)
 */
export async function getProductById(client: SupabaseClient, id: string | number) {
  const { data, error } = await client
    .from("products")
    .select(`
      *,
      subcategories (
        id,
        name,
        slug,
        categories (
          id,
          name,
          slug
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error obteniendo producto:", error);
    return null;
  }

  return data; // Retorna el producto con sus relaciones anidadas
}

/**
 * EXTRA: Obtener Productos Relacionados
 * Trae productos de la misma subcategoría (excluyendo el actual)
 */
export async function getRelatedProducts(
  client: SupabaseClient, 
  subcategoryId: number, 
  currentProductId: number
) {
  const { data, error } = await client
    .from("products")
    .select("id, name, price, images, brand") // Solo lo básico para la card
    .eq("subcategory_id", subcategoryId)
    .neq("id", currentProductId) // Excluir el producto que ya estamos viendo
    .limit(4); // Solo traer 4

  if (error) return [];
  return data;
}