import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect}) => {
  try {
    const supabase = createClient({ request, cookies });

    const { error } = await supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error.message 
        }),
        { status: 400}
      );
    }

    return redirect("/ingresar");
  } catch (error) {
    console.error("Error en logout:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Error inesperado" 
      }),
      { status: 500 }
    );
  }
};