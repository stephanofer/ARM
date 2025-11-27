import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

// GET: List all categories
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });
    
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, categories }), {
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

// POST: Create a new category
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
    const { name, slug, image_url } = body;
    
    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "El nombre es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if slug exists
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .single();
    
    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: "Ya existe una categoría con ese slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        image_url: image_url || null,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, category }), {
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
