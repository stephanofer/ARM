import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Product,
  ProductFilters,
  Pagination,
  PaginatedProductsResponse,
  ProductWithRelations,
} from './types';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 2; // Para testear paginación

/**
 * Normaliza los parámetros de paginación
 */
function normalizePagination(pagination: Partial<Pagination>): Pagination {
  let page = pagination.page || 1;
  let pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  // Validaciones
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { page, pageSize };
}

/**
 * Aplica filtros a una query de Supabase
 */
function applyFilters(
  query: any,
  filters: ProductFilters
): any {
  // Filtros de precio
  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }

  // Filtro de stock
  if (filters.inStock) {
    query = query.gt('stock', 0);
  }

  // Filtros de atributos (en JSONB)
  if (filters.attributeFilters) {
    Object.entries(filters.attributeFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // Si es array, construir condición OR manualmente
        const conditions = value.map(v => {
          // Escapar comillas y construir la condición correctamente
          return `attributes->${key}.eq."${v.replace(/"/g, '\\"')}"`;
        }).join(',');
        query = query.or(conditions);
      } else if (typeof value === 'string' && value) {
        // Para valores booleanos en string
        if (value === 'true' || value === 'false') {
          query = query.eq(`attributes->${key}`, value === 'true');
        } else {
          // Si es string simple, usar contains para buscar en el JSONB
          query = query.contains('attributes', { [key]: value });
        }
      }
    });
  }

  // Orden - SIEMPRE agregar id como segundo criterio para consistencia
  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true, nullsFirst: false });
      query = query.order('id', { ascending: true }); // Desempate por id
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false, nullsFirst: false });
      query = query.order('id', { ascending: true }); // Desempate por id
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      query = query.order('id', { ascending: false }); // Desempate por id
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      query = query.order('id', { ascending: true }); // Desempate por id
      break;
    case 'name_desc':
      query = query.order('name', { ascending: false });
      query = query.order('id', { ascending: true }); // Desempate por id
      break;
    default:
      query = query.order('created_at', { ascending: false });
      query = query.order('id', { ascending: false }); // Desempate por id
  }

  return query;
}

/**
 * Obtiene productos por categoría con filtros y paginación
 */
export async function getProductsByCategory(
  supabase: SupabaseClient,
  categoryId: number,
  filters: ProductFilters = { attributeFilters: {} },
  pagination: Partial<Pagination> = {}
): Promise<PaginatedProductsResponse> {
  const normalized = normalizePagination(pagination);
  const offset = (normalized.page - 1) * normalized.pageSize;

  // Query base
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', categoryId);

  // Aplicar filtros
  query = applyFilters(query, filters);

  // Aplicar paginación
  query = query.range(offset, offset + normalized.pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products by category:', error);
    throw new Error('Failed to fetch products');
  }

  const total = count || 0;
  const totalPages = total > 0 ? Math.ceil(total / normalized.pageSize) : 0;

  return {
    items: data || [],
    page: normalized.page,
    pageSize: normalized.pageSize,
    total,
    totalPages,
  };
}

/**
 * Obtiene productos por subcategoría con filtros y paginación
 */
export async function getProductsBySubcategory(
  supabase: SupabaseClient,
  subcategoryId: number,
  filters: ProductFilters = { attributeFilters: {} },
  pagination: Partial<Pagination> = {}
): Promise<PaginatedProductsResponse> {
  const normalized = normalizePagination(pagination);
  const offset = (normalized.page - 1) * normalized.pageSize;

  // Query base
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('subcategory_id', subcategoryId);

  // Aplicar filtros
  query = applyFilters(query, filters);

  // Aplicar paginación
  query = query.range(offset, offset + normalized.pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products by subcategory:', error);
    throw new Error('Failed to fetch products');
  }

  const total = count || 0;
  const totalPages = total > 0 ? Math.ceil(total / normalized.pageSize) : 0;

  return {
    items: data || [],
    page: normalized.page,
    pageSize: normalized.pageSize,
    total,
    totalPages,
  };
}

/**
 * Obtiene un producto por su slug con sus relaciones (categoría y subcategoría)
 */
export async function getProductBySlug(
  supabase: SupabaseClient,
  productSlug: string
): Promise<ProductWithRelations | null> {
  // Nota: Asumimos que el slug está en el campo 'name' o creamos un campo slug
  // Por simplicidad, buscaremos por name convertido a slug
  // En producción, deberías tener un campo slug en products
  
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${productSlug.replace(/-/g, ' ')}%`)
    .limit(1);

  if (productError || !products || products.length === 0) {
    return null;
  }

  const product = products[0];

  // Obtener categoría
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', product.category_id)
    .single();

  if (categoryError || !category) {
    return null;
  }

  // Obtener subcategoría
  const { data: subcategory, error: subcategoryError } = await supabase
    .from('subcategories')
    .select('*')
    .eq('id', product.subcategory_id)
    .single();

  if (subcategoryError || !subcategory) {
    return null;
  }

  return {
    product,
    category,
    subcategory,
  };
}
