import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email y contraseña son requeridos",
        }),
        { status: 400 }
      );
    }

    const supabase = createClient({ request, cookies });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message,
        }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sesión iniciada correctamente",
        redirect: "/admin",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en login:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error inesperado",
      }),
      { status: 500 }
    );
  }
};
