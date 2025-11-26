import type { APIRoute } from 'astro';
import { createClient } from '../../lib/supabase';
import {
  getCategoryAndSubcategories,
  getSubcategoryBySlugWithinCategory,
  getProductsByCategory,
  getProductsBySubcategory,
  enrichProductsWithImages,
} from '../../lib/data';
import type { ProductFilters, AttributeFilters } from '../../lib/data';
import { PAGE_SIZE } from '@/config';

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
export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    // Crear cliente de Supabase
    const supabase = createClient({ request, cookies });

    // Leer query params
    const categorySlug = url.searchParams.get('categorySlug');
    const subcategorySlug = url.searchParams.get('subcategoria');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || PAGE_SIZE.toString()); 
    const sort = url.searchParams.get('sort') || undefined;
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const inStock = url.searchParams.get('inStock') === 'true';

    // Validar categorySlug
    if (!categorySlug) {
      return new Response(
        JSON.stringify({ error: 'categorySlug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener categoría y subcategorías
    const categoryData = await getCategoryAndSubcategories(supabase, categorySlug);

    if (!categoryData) {
      return new Response(
        JSON.stringify({ error: 'Category not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { category, subcategories } = categoryData;

    // Construir filtros de atributos desde query params
    const attributeFilters: AttributeFilters = {};
    const reservedParams = [
      'categorySlug',
      'subcategoria',
      'page',
      'pageSize',
      'sort',
      'minPrice',
      'maxPrice',
      'inStock',
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
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
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
            error: 'Subcategory not found or does not belong to this category',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
