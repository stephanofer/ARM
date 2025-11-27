import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Product,
  ProductFilters,
  Pagination,
  PaginatedProductsResponse,
  ProductWithRelations,
  ProductBasic,
  ProductAsset,
  ProductAssetsGrouped,
  ProductFullDetails,
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
 * Helper para obtener las URLs de las primeras 2 imágenes de la galería de un producto
 */
export async function getProductCardImages(
  supabase: SupabaseClient,
  productId: number
): Promise<{ primary: string | null; secondary: string | null }> {
  const { data, error } = await supabase
    .from('product_assets')
    .select('storage_bucket, storage_path')
    .eq('product_id', productId)
    .eq('section', 'gallery')
    .eq('kind', 'image')
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(2);

  if (error || !data || data.length === 0) {
    return { primary: null, secondary: null };
  }

  const getUrl = (item: typeof data[0]) => {
    const { data: urlData } = supabase.storage
      .from(item.storage_bucket)
      .getPublicUrl(item.storage_path);
    return urlData.publicUrl;
  };

  return {
    primary: getUrl(data[0]),
    secondary: data.length > 1 ? getUrl(data[1]) : null,
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
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', productSlug)
    .single();

  if (productError || !product) {
    return null;
  }

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

// ============================
// FUNCIONES DE PRODUCTO INDIVIDUAL
// ============================

/**
 * Obtiene los datos básicos de un producto por su slug
 * Útil para obtener el ID y datos mínimos sin cargar todo
 */
export async function getProductBasicBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ProductBasic | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, category_id, subcategory_id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProductBasic;
}

/**
 * Obtiene un producto completo por su ID
 * Más rápido que buscar por slug ya que usa el índice primario
 */
export async function getProductById(
  supabase: SupabaseClient,
  productId: number
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Product;
}

/**
 * Obtiene todos los assets de un producto por su ID
 * Ordenados por: is_primary DESC, sort_order ASC
 */
export async function getProductAssets(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductAsset[]> {
  const { data, error } = await supabase
    .from('product_assets')
    .select('*')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ProductAsset[];
}

/**
 * Obtiene los assets de un producto agrupados por sección
 */
export async function getProductAssetsGrouped(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductAssetsGrouped> {
  const assets = await getProductAssets(supabase, productId);

  return {
    gallery: assets.filter(a => a.section === 'gallery'),
    additional: assets.filter(a => a.section === 'additional'),
    download: assets.filter(a => a.section === 'download'),
  };
}

/**
 * Obtiene los assets de la galería principal de un producto
 * (solo imágenes y videos de la sección 'gallery')
 */
export async function getProductGalleryAssets(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductAsset[]> {
  const { data, error } = await supabase
    .from('product_assets')
    .select('*')
    .eq('product_id', productId)
    .eq('section', 'gallery')
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ProductAsset[];
}

/**
 * Obtiene la imagen principal de un producto (la de portada)
 */
export async function getProductPrimaryImage(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductAsset | null> {
  const { data, error } = await supabase
    .from('product_assets')
    .select('*')
    .eq('product_id', productId)
    .eq('section', 'gallery')
    .eq('is_primary', true)
    .single();

  if (error || !data) {
    // Si no hay imagen primaria, buscar la primera de la galería
    const { data: firstImage, error: firstError } = await supabase
      .from('product_assets')
      .select('*')
      .eq('product_id', productId)
      .eq('section', 'gallery')
      .eq('kind', 'image')
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (firstError || !firstImage) {
      return null;
    }

    return firstImage as ProductAsset;
  }

  return data as ProductAsset;
}

/**
 * Obtiene los archivos descargables de un producto
 */
export async function getProductDownloads(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductAsset[]> {
  const { data, error } = await supabase
    .from('product_assets')
    .select('*')
    .eq('product_id', productId)
    .eq('section', 'download')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ProductAsset[];
}

/**
 * Obtiene todos los detalles de un producto por su ID
 * Incluye: producto, categoría, subcategoría y assets agrupados
 */
export async function getProductFullDetailsById(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductFullDetails | null> {
  // Obtener producto
  const product = await getProductById(supabase, productId);
  if (!product) {
    return null;
  }

  // Obtener categoría y subcategoría en paralelo
  const [categoryResult, subcategoryResult, assets] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('id', product.category_id)
      .single(),
    supabase
      .from('subcategories')
      .select('*')
      .eq('id', product.subcategory_id)
      .single(),
    getProductAssetsGrouped(supabase, productId),
  ]);

  if (categoryResult.error || !categoryResult.data) {
    return null;
  }

  if (subcategoryResult.error || !subcategoryResult.data) {
    return null;
  }

  return {
    product,
    category: categoryResult.data,
    subcategory: subcategoryResult.data,
    assets,
  };
}

/**
 * Obtiene todos los detalles de un producto por su slug
 * Primero obtiene el ID y luego los detalles completos
 */
export async function getProductFullDetailsBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ProductFullDetails | null> {
  // Primero obtener datos básicos para tener el ID
  const basic = await getProductBasicBySlug(supabase, slug);
  if (!basic) {
    return null;
  }

  // Usar el ID para obtener los detalles completos
  return getProductFullDetailsById(supabase, basic.id);
}

/**
 * Enriquece un array de productos con las URLs de sus imágenes principales
 * Útil para mostrar productos en grids/listas
 */
export async function enrichProductsWithImages(
  supabase: SupabaseClient,
  products: Product[]
): Promise<Array<Product & { primaryImageUrl: string | null; secondaryImageUrl: string | null }>> {
  if (products.length === 0) return [];

  // Obtener todas las imágenes de todos los productos en una sola query
  const productIds = products.map(p => p.id);
  
  const { data: assets, error } = await supabase
    .from('product_assets')
    .select('product_id, storage_bucket, storage_path, is_primary, sort_order')
    .in('product_id', productIds)
    .eq('section', 'gallery')
    .eq('kind', 'image')
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error || !assets) {
    // Si hay error, devolver productos sin imágenes
    return products.map(p => ({ ...p, primaryImageUrl: null, secondaryImageUrl: null }));
  }

  // Agrupar assets por product_id
  const assetsByProduct = new Map<number, typeof assets>();
  assets.forEach(asset => {
    if (!assetsByProduct.has(asset.product_id)) {
      assetsByProduct.set(asset.product_id, []);
    }
    assetsByProduct.get(asset.product_id)!.push(asset);
  });

  // Helper para obtener URL pública
  const getPublicUrl = (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  // Enriquecer cada producto con sus imágenes
  return products.map(product => {
    const productAssets = assetsByProduct.get(product.id) || [];
    
    return {
      ...product,
      primaryImageUrl: productAssets[0] 
        ? getPublicUrl(productAssets[0].storage_bucket, productAssets[0].storage_path)
        : null,
      secondaryImageUrl: productAssets[1]
        ? getPublicUrl(productAssets[1].storage_bucket, productAssets[1].storage_path)
        : null,
    };
  });
}
