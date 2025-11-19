import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });

    const { error } = await supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error.message 
        }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Sesión cerrada",
        redirect: "/ingresar"
      }),
      { status: 200 }
    );
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