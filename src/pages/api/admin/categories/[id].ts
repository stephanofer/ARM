import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

// PUT: Update a category
export const PUT: APIRoute = async ({ request, cookies, params }) => {
  try {
    const supabase = createClient({ request, cookies });
    const id = parseInt(params.id as string);
    
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
    
    // Check if slug exists for another category
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .single();
    
    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: "Ya existe otra categoría con ese slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { data: category, error } = await supabase
      .from("categories")
      .update({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        image_url: image_url || null,
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, category }), {
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

// DELETE: Delete a category
export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  try {
    const supabase = createClient({ request, cookies });
    const id = parseInt(params.id as string);
    
    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if there are subcategories
    const { data: subcats, error: subcatsError } = await supabase
      .from("subcategories")
      .select("id")
      .eq("category_id", id)
      .limit(1);
    
    if (subcats && subcats.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No se puede eliminar: hay subcategorías asociadas" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true }), {
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
