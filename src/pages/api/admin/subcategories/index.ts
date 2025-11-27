import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

// GET: List all subcategories
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });
    
    const { data: subcategories, error } = await supabase
      .from("subcategories")
      .select("*, categories(name)")
      .order("display_order")
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, subcategories }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// POST: Create a new subcategory
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });
    
    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const body = await request.json();
    const { name, slug, category_id, display_order, filter_config } = body;
    
    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "El nombre es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!category_id) {
      return new Response(
        JSON.stringify({ success: false, error: "La categoría es requerida" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if slug exists
    const { data: existing } = await supabase
      .from("subcategories")
      .select("id")
      .eq("slug", slug)
      .single();
    
    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: "Ya existe una subcategoría con ese slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { data: subcategory, error } = await supabase
      .from("subcategories")
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        category_id,
        display_order: display_order || 0,
        filter_config: filter_config || [],
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, subcategory }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
