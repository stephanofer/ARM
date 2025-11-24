import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  Subcategory,
  CategoryWithSubcategories,
  SubcategoryWithCategory,
} from "./types";

export async function getAllCategories(
  supabase: SupabaseClient
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }

  return data || [];
}

export async function getCategoryAndSubcategories(
  supabase: SupabaseClient,
  categorySlug: string
): Promise<CategoryWithSubcategories | null> {
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", categorySlug)
    .single();

  if (categoryError || !category) {
    return null;
  }

  const { data: subcategories, error: subcategoriesError } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", category.id)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (subcategoriesError) {
    console.error("Error fetching subcategories:", subcategoriesError);
    throw new Error("Failed to fetch subcategories");
  }

  return {
    category,
    subcategories: subcategories || [],
  };
}

/**
 * Obtiene una subcategoría específica dentro de una categoría
 * Valida que la subcategoría pertenezca a la categoría
 */
export async function getSubcategoryBySlugWithinCategory(
  supabase: SupabaseClient,
  categorySlug: string,
  subcategorySlug: string
): Promise<SubcategoryWithCategory | null> {
  // Primero obtener la categoría y todas sus subcategorías
  const result = await getCategoryAndSubcategories(supabase, categorySlug);

  if (!result) {
    return null;
  }

  const { category, subcategories } = result;

  // Buscar la subcategoría específica
  const subcategory = subcategories.find((sub) => sub.slug === subcategorySlug);

  if (!subcategory) {
    return null;
  }

  return {
    category,
    subcategory,
    allSubcategories: subcategories,
  };
}
