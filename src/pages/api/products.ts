import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  getCategoryAndSubcategories,
  getSubcategoryBySlugWithinCategory,
} from "@/lib/data/categories";
import {
  getProductsByCategory,
  getProductsBySubcategory,
  enrichProductsWithImages,
} from "@/lib/data/products";
import type { ProductFilters, AttributeFilters } from "@/lib/data/types";
import { PAGE_SIZE } from "@/config";

/**
 * API endpoint para obtener productos con filtros, paginación y orden
 *
 * Query params esperados:
 * - categorySlug: string (obligatorio)
 * - subcategoria: string (opcional, slug de subcategoría)
 * - page: string (opcional, número de página)
 * - pageSize: string (opcional)
 * - sort: string (opcional)
 * - Cualquier otro param se interpreta como filtro de atributo (size, color, etc.)
 */

// Valores permitidos para sort
const VALID_SORT_OPTIONS = [
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "newest",
  "oldest",
];

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    // Crear cliente de Supabase
    const supabase = createClient({ request, cookies });

    // Leer y sanitizar query params
    const categorySlug = url.searchParams.get("categorySlug");
    const subcategorySlug = url.searchParams.get("subcategoria");

    // Page: sanitizar para evitar NaN o valores inválidos
    const rawPage = url.searchParams.get("page");
    const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    // PageSize: sanitizar con límites
    const rawPageSize = url.searchParams.get("pageSize");
    const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : PAGE_SIZE;
    const pageSize =
      Number.isNaN(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 50
        ? PAGE_SIZE
        : parsedPageSize;

    // Sort: validar contra valores permitidos
    const rawSort = url.searchParams.get("sort");
    const sort =
      rawSort && VALID_SORT_OPTIONS.includes(rawSort) ? rawSort : undefined;

    // Price: sanitizar
    const rawMinPrice = url.searchParams.get("minPrice");
    const rawMaxPrice = url.searchParams.get("maxPrice");
    const parsedMinPrice = rawMinPrice ? parseFloat(rawMinPrice) : undefined;
    const parsedMaxPrice = rawMaxPrice ? parseFloat(rawMaxPrice) : undefined;
    const minPrice =
      parsedMinPrice !== undefined &&
      !Number.isNaN(parsedMinPrice) &&
      parsedMinPrice >= 0
        ? parsedMinPrice
        : undefined;
    const maxPrice =
      parsedMaxPrice !== undefined &&
      !Number.isNaN(parsedMaxPrice) &&
      parsedMaxPrice >= 0
        ? parsedMaxPrice
        : undefined;

    const inStock = url.searchParams.get("inStock") === "true";

    // Validar categorySlug
    if (!categorySlug) {
      return new Response(
        JSON.stringify({ error: "categorySlug is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener categoría y subcategorías
    const categoryData = await getCategoryAndSubcategories(
      supabase,
      categorySlug
    );

    if (!categoryData) {
      return new Response(JSON.stringify({ error: "Category not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { category, subcategories } = categoryData;

    // Construir filtros de atributos desde query params
    const attributeFilters: AttributeFilters = {};
    const reservedParams = [
      "categorySlug",
      "subcategoria",
      "page",
      "pageSize",
      "sort",
      "minPrice",
      "maxPrice",
      "inStock",
    ];

    url.searchParams.forEach((value, key) => {
      if (!reservedParams.includes(key) && value) {
        // Soportar múltiples valores para el mismo key (ej: size=queen&size=king)
        if (attributeFilters[key]) {
          if (Array.isArray(attributeFilters[key])) {
            (attributeFilters[key] as string[]).push(value);
          } else {
            attributeFilters[key] = [attributeFilters[key] as string, value];
          }
        } else {
          attributeFilters[key] = value;
        }
      }
    });

    // Construir objeto de filtros
    const filters: ProductFilters = {
      attributeFilters,
      minPrice: minPrice,
      maxPrice: maxPrice,
      inStock: inStock || undefined,
      sort: sort as any,
    };

    // Determinar si es búsqueda por categoría o subcategoría
    let productsResponse;
    let currentSubcategory = null;

    if (subcategorySlug) {
      // Validar que la subcategoría existe y pertenece a la categoría
      const subcategoryData = await getSubcategoryBySlugWithinCategory(
        supabase,
        categorySlug,
        subcategorySlug
      );

      if (!subcategoryData) {
        return new Response(
          JSON.stringify({
            error: "Subcategory not found or does not belong to this category",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      currentSubcategory = subcategoryData.subcategory;

      // Obtener productos por subcategoría
      productsResponse = await getProductsBySubcategory(
        supabase,
        currentSubcategory.id,
        filters,
        { page, pageSize }
      );
    } else {
      // Obtener productos por categoría
      productsResponse = await getProductsByCategory(
        supabase,
        category.id,
        filters,
        { page, pageSize }
      );
    }

    // Enriquecer productos con URLs de imágenes
    const enrichedProducts = await enrichProductsWithImages(
      supabase,
      productsResponse.items
    );

    // Construir respuesta
    const response = {
      items: enrichedProducts,
      page: productsResponse.page,
      pageSize: productsResponse.pageSize,
      total: productsResponse.total,
      totalPages: productsResponse.totalPages,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      subcategory: currentSubcategory
        ? {
            id: currentSubcategory.id,
            name: currentSubcategory.name,
            slug: currentSubcategory.slug,
            filter_config: currentSubcategory.filter_config,
          }
        : null,
      appliedFilters: {
        subcategorySlug: subcategorySlug || null,
        page,
        pageSize,
        sort: sort || null,
        attributeFilters,
        minPrice: filters.minPrice || null,
        maxPrice: filters.maxPrice || null,
        inStock: filters.inStock || false,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
