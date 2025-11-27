import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

// PUT: Update a subcategory
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
    const { name, slug, category_id, display_order, filter_config } = body;
    
    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "El nombre es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if slug exists for another subcategory
    const { data: existing } = await supabase
      .from("subcategories")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .single();
    
    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: "Ya existe otra subcategoría con ese slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { data: subcategory, error } = await supabase
      .from("subcategories")
      .update({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        category_id,
        display_order: display_order || 0,
        filter_config: filter_config || [],
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, subcategory }), {
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

// DELETE: Delete a subcategory
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
    
    // Check if there are products
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("subcategory_id", id)
      .limit(1);
    
    if (products && products.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No se puede eliminar: hay productos asociados. Muévelos a otra subcategoría primero." 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { error } = await supabase
      .from("subcategories")
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
