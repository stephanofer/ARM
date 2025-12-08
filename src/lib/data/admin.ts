import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Subcategory, Product, ProductAsset } from "./types";

export interface RecentProduct {
  id: number;
  name: string;
  slug: string;
  thumbnail_url: string | null;
  category_name: string;
  subcategory_name: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalSubcategories: number;
  totalAssets: number;
  recentProducts: RecentProduct[];
  productsByCategory: { category: string; count: number }[];
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  stock: number;
  brand: string | null;
  category_id: number;
  subcategory_id: number;
  attributes: Record<string, any>;
}

export interface AssetUploadData {
  file: File;
  kind: "image" | "video" | "file";
  section: "gallery" | "additional" | "download";
  title?: string;
  alt?: string;
  is_primary?: boolean;
}

// ============================
// FUNCIONES DE DASHBOARD
// ============================

/**
 * Obtiene las estadísticas para el dashboard
 */
export async function getDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  // Ejecutar todas las consultas en paralelo
  const [
    productsResult,
    categoriesResult,
    subcategoriesResult,
    assetsResult,
    recentProductsResult,
    productsByCategoryResult,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("subcategories").select("*", { count: "exact", head: true }),
    supabase.from("product_assets").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        created_at,
        categories(name),
        subcategories(name),
        product_assets(storage_bucket, storage_path, is_primary, section)
      `
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("category_id, categories(name)")
      .order("category_id"),
  ]);

  // Procesar productos por categoría
  const categoryCountMap = new Map<string, number>();
  if (productsByCategoryResult.data) {
    productsByCategoryResult.data.forEach((item: any) => {
      const categoryName = item.categories?.name || "Sin categoría";
      categoryCountMap.set(
        categoryName,
        (categoryCountMap.get(categoryName) || 0) + 1
      );
    });
  }

  const productsByCategory = Array.from(categoryCountMap.entries()).map(
    ([category, count]) => ({
      category,
      count,
    })
  );

  // Procesar productos recientes para incluir thumbnail y nombres
  const recentProducts: RecentProduct[] = (recentProductsResult.data || []).map(
    (p: any) => {
      let thumbnail_url: string | null = null;

      // Buscar el asset primario de la galería
      const assets = p.product_assets || [];
      const primaryAsset =
        assets.find((a: any) => a.section === "gallery" && a.is_primary) ||
        assets.find((a: any) => a.section === "gallery");

      if (primaryAsset?.storage_bucket && primaryAsset?.storage_path) {
        const { data } = supabase.storage
          .from(primaryAsset.storage_bucket)
          .getPublicUrl(primaryAsset.storage_path);
        thumbnail_url = data?.publicUrl || null;
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail_url,
        category_name: p.categories?.name || "Sin categoría",
        subcategory_name: p.subcategories?.name || null,
        created_at: p.created_at,
      };
    }
  );

  return {
    totalProducts: productsResult.count || 0,
    totalCategories: categoriesResult.count || 0,
    totalSubcategories: subcategoriesResult.count || 0,
    totalAssets: assetsResult.count || 0,
    recentProducts,
    productsByCategory,
  };
}

// ============================
// FUNCIONES DE CATEGORÍAS
// ============================

/**
 * Obtiene todas las categorías con sus subcategorías
 */
export async function getAllCategoriesWithSubcategories(
  supabase: SupabaseClient
): Promise<(Category & { subcategories: Subcategory[] })[]> {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (catError || !categories) {
    throw new Error("Error fetching categories");
  }

  const { data: subcategories, error: subError } = await supabase
    .from("subcategories")
    .select("*")
    .order("display_order")
    .order("name");

  if (subError) {
    throw new Error("Error fetching subcategories");
  }

  // Agrupar subcategorías por categoría
  return categories.map((cat) => ({
    ...cat,
    subcategories: (subcategories || []).filter(
      (sub) => sub.category_id === cat.id
    ),
  }));
}

// ============================
// FUNCIONES DE PRODUCTOS (ADMIN)
// ============================

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  stock: number;
  brand: string | null;
  category_id: number;
  subcategory_id: number;
  attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
  category_name: string;
  subcategory_name: string | null;
  thumbnail_url: string | null;
}

/**
 * Obtiene productos con paginación y búsqueda para el admin
 */
export async function getAdminProducts(
  supabase: SupabaseClient,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: number;
    subcategoryId?: number;
  } = {}
): Promise<{
  products: AdminProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(
      `
      *,
      categories(name),
      subcategories(name),
      product_assets(storage_bucket, storage_path, is_primary, section)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // Filtros
  if (options.search) {
    query = query.or(
      `name.ilike.%${options.search}%,slug.ilike.%${options.search}%,brand.ilike.%${options.search}%`
    );
  }

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.subcategoryId) {
    query = query.eq("subcategory_id", options.subcategoryId);
  }

  // Paginación
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Error fetching products: ${error.message}`);
  }

  const products: AdminProduct[] = (data || []).map((p: any) => {
    // Buscar el asset primario de la galería
    const assets = p.product_assets || [];
    const primaryAsset =
      assets.find((a: any) => a.section === "gallery" && a.is_primary) ||
      assets.find((a: any) => a.section === "gallery");

    let thumbnail_url: string | null = null;
    if (primaryAsset?.storage_bucket && primaryAsset?.storage_path) {
      const { data: urlData } = supabase.storage
        .from(primaryAsset.storage_bucket)
        .getPublicUrl(primaryAsset.storage_path);
      thumbnail_url = urlData?.publicUrl || null;
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      stock: p.stock,
      brand: p.brand,
      category_id: p.category_id,
      subcategory_id: p.subcategory_id,
      attributes: p.attributes,
      created_at: p.created_at,
      updated_at: p.updated_at,
      category_name: p.categories?.name || "Sin categoría",
      subcategory_name: p.subcategories?.name || null,
      thumbnail_url,
    };
  });

  const total = count || 0;

  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(
  supabase: SupabaseClient,
  data: ProductFormData
): Promise<Product> {
  // Validar que el slug no exista
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("slug", data.slug)
    .single();

  if (existing) {
    throw new Error("Ya existe un producto con ese slug");
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: data.name.trim(),
      slug: data.slug.toLowerCase().trim(),
      description: data.description?.trim() || null,
      price: data.price,
      stock: data.stock,
      brand: data.brand?.trim() || null,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      attributes: data.attributes,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating product: ${error.message}`);
  }

  return product;
}

/**
 * Actualiza un producto existente
 */
export async function updateProduct(
  supabase: SupabaseClient,
  productId: number,
  data: Partial<ProductFormData>
): Promise<Product> {
  // Si se está actualizando el slug, verificar que no exista otro producto con ese slug
  if (data.slug) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", data.slug)
      .neq("id", productId)
      .single();

    if (existing) {
      throw new Error("Ya existe otro producto con ese slug");
    }
  }

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.slug !== undefined) updateData.slug = data.slug.toLowerCase().trim();
  if (data.description !== undefined)
    updateData.description = data.description?.trim() || null;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.brand !== undefined) updateData.brand = data.brand?.trim() || null;
  if (data.category_id !== undefined) updateData.category_id = data.category_id;
  if (data.subcategory_id !== undefined)
    updateData.subcategory_id = data.subcategory_id;
  if (data.attributes !== undefined) updateData.attributes = data.attributes;

  const { data: product, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating product: ${error.message}`);
  }

  return product;
}

/**
 * Elimina un producto y todos sus assets
 */
export async function deleteProduct(
  supabase: SupabaseClient,
  productId: number
): Promise<void> {
  // Primero obtener los assets para eliminarlos del storage
  const { data: assets } = await supabase
    .from("product_assets")
    .select("storage_bucket, storage_path")
    .eq("product_id", productId);

  // Eliminar archivos del storage
  if (assets && assets.length > 0) {
    const bucketGroups = new Map<string, string[]>();
    assets.forEach((asset) => {
      if (!bucketGroups.has(asset.storage_bucket)) {
        bucketGroups.set(asset.storage_bucket, []);
      }
      bucketGroups.get(asset.storage_bucket)!.push(asset.storage_path);
    });

    for (const [bucket, paths] of bucketGroups) {
      await supabase.storage.from(bucket).remove(paths);
    }
  }

  // Eliminar el producto (CASCADE eliminará los assets de la DB)
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    throw new Error(`Error deleting product: ${error.message}`);
  }
}

// ============================
// FUNCIONES DE ASSETS
// ============================

/**
 * Sube un asset para un producto
 */
export async function uploadProductAsset(
  supabase: SupabaseClient,
  productId: number,
  file: File,
  options: {
    kind: "image" | "video" | "file";
    section: "gallery" | "additional" | "download";
    title?: string;
    alt?: string;
    is_primary?: boolean;
  }
): Promise<ProductAsset> {
  const bucket = "products";
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `${productId}/${options.section}/${timestamp}-${sanitizedName}`;

  // Subir archivo al storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error uploading file: ${uploadError.message}`);
  }

  // Si es primario, quitar el flag de otros assets de la galería
  if (options.is_primary && options.section === "gallery") {
    await supabase
      .from("product_assets")
      .update({ is_primary: false })
      .eq("product_id", productId)
      .eq("section", "gallery");
  }

  // Obtener el siguiente sort_order
  const { data: lastAsset } = await supabase
    .from("product_assets")
    .select("sort_order")
    .eq("product_id", productId)
    .eq("section", options.section)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (lastAsset?.sort_order || 0) + 1;

  // Crear registro en la base de datos
  const { data: asset, error: dbError } = await supabase
    .from("product_assets")
    .insert({
      product_id: productId,
      kind: options.kind,
      section: options.section,
      storage_bucket: bucket,
      storage_path: path,
      title: options.title || null,
      alt: options.alt || null,
      is_primary: options.is_primary || false,
      sort_order: nextSortOrder,
      filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      is_public: true,
    })
    .select()
    .single();

  if (dbError) {
    // Si falla la DB, eliminar el archivo del storage
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(`Error saving asset: ${dbError.message}`);
  }

  return asset;
}

/**
 * Elimina un asset
 */
export async function deleteProductAsset(
  supabase: SupabaseClient,
  assetId: number
): Promise<void> {
  // Obtener info del asset
  const { data: asset, error: fetchError } = await supabase
    .from("product_assets")
    .select("storage_bucket, storage_path")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    throw new Error("Asset not found");
  }

  // Eliminar del storage
  const { error: storageError } = await supabase.storage
    .from(asset.storage_bucket)
    .remove([asset.storage_path]);

  if (storageError) {
    console.error("Error removing from storage:", storageError);
  }

  // Eliminar de la DB
  const { error: dbError } = await supabase
    .from("product_assets")
    .delete()
    .eq("id", assetId);

  if (dbError) {
    throw new Error(`Error deleting asset: ${dbError.message}`);
  }
}

/**
 * Actualiza el orden de los assets
 */
export async function updateAssetOrder(
  supabase: SupabaseClient,
  productId: number,
  section: "gallery" | "additional" | "download",
  assetIds: number[]
): Promise<void> {
  // Actualizar cada asset con su nuevo orden
  for (let i = 0; i < assetIds.length; i++) {
    const { error } = await supabase
      .from("product_assets")
      .update({ sort_order: i })
      .eq("id", assetIds[i])
      .eq("product_id", productId)
      .eq("section", section);

    if (error) {
      throw new Error(`Error updating asset order: ${error.message}`);
    }
  }
}

/**
 * Establece un asset como primario
 */
export async function setAssetAsPrimary(
  supabase: SupabaseClient,
  assetId: number
): Promise<void> {
  // Obtener info del asset
  const { data: asset, error: fetchError } = await supabase
    .from("product_assets")
    .select("product_id, section")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    throw new Error("Asset not found");
  }

  if (asset.section !== "gallery") {
    throw new Error("Only gallery assets can be primary");
  }

  // Quitar primario de otros
  await supabase
    .from("product_assets")
    .update({ is_primary: false })
    .eq("product_id", asset.product_id)
    .eq("section", "gallery");

  // Establecer este como primario
  const { error } = await supabase
    .from("product_assets")
    .update({ is_primary: true })
    .eq("id", assetId);

  if (error) {
    throw new Error(`Error setting primary: ${error.message}`);
  }
}

/**
 * Establece un asset como secundario (para hover)
 */
export async function setAssetAsSecondary(
  supabase: SupabaseClient,
  assetId: number | null,
  productId: number
): Promise<void> {
  // Quitar secundario de todos los assets del producto
  await supabase
    .from("product_assets")
    .update({ is_secondary: false })
    .eq("product_id", productId)
    .eq("section", "gallery");

  // Si hay un nuevo secundario, establecerlo
  if (assetId) {
    const { error } = await supabase
      .from("product_assets")
      .update({ is_secondary: true })
      .eq("id", assetId);

    if (error) {
      throw new Error(`Error setting secondary: ${error.message}`);
    }
  }
}

// ============================
// UTILIDADES
// ============================

/**
 * Genera un slug a partir de un nombre
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9]+/g, "-") // Reemplazar caracteres especiales por guiones
    .replace(/^-+|-+$/g, "") // Eliminar guiones al inicio y final
    .substring(0, 100); // Limitar longitud
}

/**
 * Valida los datos de un producto
 */
export function validateProductData(data: Partial<ProductFormData>): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push("El nombre es requerido");
  } else if (data.name.length > 200) {
    errors.push("El nombre no puede exceder 200 caracteres");
  }

  if (!data.slug?.trim()) {
    errors.push("El slug es requerido");
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push(
      "El slug solo puede contener letras minúsculas, números y guiones"
    );
  }

  if (data.price !== undefined && data.price !== null) {
    if (data.price < 0) {
      errors.push("El precio no puede ser negativo");
    }
  }

  if (data.stock !== undefined) {
    if (data.stock < 0) {
      errors.push("El stock no puede ser negativo");
    }
  }

  if (!data.category_id) {
    errors.push("La categoría es requerida");
  }

  if (!data.subcategory_id) {
    errors.push("La subcategoría es requerida");
  }

  return errors;
}
