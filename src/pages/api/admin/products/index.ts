import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  createProduct,
  uploadProductAsset,
  validateProductData,
  generateSlug,
} from "@/lib/data/admin";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener datos del formulario
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const brand = formData.get("brand") as string;
    const priceStr = formData.get("price") as string;
    const stockStr = formData.get("stock") as string;
    const categoryIdStr = formData.get("category_id") as string;
    const subcategoryIdStr = formData.get("subcategory_id") as string;
    const attributesStr = formData.get("attributes") as string;

    // Parsear valores
    const price = priceStr ? parseFloat(priceStr) : null;
    const stock = parseInt(stockStr) || 0;
    const category_id = parseInt(categoryIdStr);
    const subcategory_id = parseInt(subcategoryIdStr);
    const attributes = attributesStr ? JSON.parse(attributesStr) : {};

    // Validar datos
    const productData = {
      name,
      slug: slug || generateSlug(name),
      description: description || null,
      price: isNaN(price as number) ? null : price,
      stock,
      brand: brand || null,
      category_id,
      subcategory_id,
      attributes,
    };

    const errors = validateProductData(productData);
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: errors.join(", ") }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Crear producto
    const product = await createProduct(supabase, productData);
    console.log("Product created:", product.id);

    // Función helper para determinar el tipo de archivo
    const getFileKind = (file: File): "image" | "video" | "file" => {
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("video/")) return "video";
      return "file";
    };

    // Subir archivos de la galería
    const galleryFiles = formData.getAll("gallery_images") as File[];
    console.log("Gallery files to upload:", galleryFiles.length, galleryFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    for (let i = 0; i < galleryFiles.length; i++) {
      const file = galleryFiles[i];
      if (file && file.size > 0) {
        try {
          console.log(`Uploading gallery file ${i + 1}:`, file.name);
          const asset = await uploadProductAsset(supabase, product.id, file, {
            kind: getFileKind(file),
            section: "gallery",
            is_primary: i === 0, // Primera imagen es primaria
            alt: product.name,
          });
          console.log(`Gallery file ${i + 1} uploaded successfully:`, asset.id);
        } catch (uploadError) {
          console.error("Error uploading gallery file:", file.name, uploadError);
        }
      }
    }

    // Subir archivos adicionales
    const additionalFiles = formData.getAll("additional_images") as File[];
    console.log("Additional files to upload:", additionalFiles.length);
    
    for (const file of additionalFiles) {
      if (file && file.size > 0) {
        try {
          await uploadProductAsset(supabase, product.id, file, {
            kind: getFileKind(file),
            section: "additional",
            alt: product.name,
          });
        } catch (uploadError) {
          console.error("Error uploading additional file:", uploadError);
        }
      }
    }

    // Subir archivos descargables
    const downloadFiles = formData.getAll("download_files") as File[];
    console.log("Download files to upload:", downloadFiles.length);
    
    for (const file of downloadFiles) {
      if (file && file.size > 0) {
        try {
          await uploadProductAsset(supabase, product.id, file, {
            kind: "file",
            section: "download",
            title: file.name,
          });
        } catch (uploadError) {
          console.error("Error uploading download file:", uploadError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, product }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
