import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

interface UploadUrlRequest {
  filename: string;
  contentType: string;
  section: "gallery" | "additional" | "download";
  tempUploadId: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: UploadUrlRequest = await request.json();
    const { filename, contentType, section, tempUploadId } = body;

    // Validaciones
    if (!filename || !contentType || !section || !tempUploadId) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validar sección
    const validSections = ["gallery", "additional", "download"];
    if (!validSections.includes(section)) {
      return new Response(JSON.stringify({ error: "Sección inválida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validar tipo de contenido según sección
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const videoTypes = ["video/mp4", "video/webm"];
    const documentTypes = [
      "application/pdf",
      "application/zip",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const allowedTypes: Record<string, string[]> = {
      gallery: [...imageTypes, ...videoTypes],
      additional: [...imageTypes, ...videoTypes],
      download: [...imageTypes, ...videoTypes, ...documentTypes],
    };

    if (!allowedTypes[section].includes(contentType)) {
      return new Response(
        JSON.stringify({ error: `Tipo de archivo no permitido para ${section}: ${contentType}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sanitizar nombre de archivo
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `temp/${tempUploadId}/${section}/${timestamp}-${sanitizedFilename}`;

    // Crear signed upload URL (expira en 10 minutos)
    const { data, error } = await supabase.storage
      .from("products")
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error("Error creating signed URL:", error);
      return new Response(JSON.stringify({ error: "Error al crear URL de subida" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        signedUrl: data.signedUrl,
        token: data.token,
        path: storagePath,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload URL error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
