import type { Category } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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
