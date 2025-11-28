import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  createProduct,
  validateProductData,
  generateSlug,
} from "@/lib/data/admin";

// Tipo para los archivos subidos desde el cliente
interface UploadedFile {
  storage_path: string;
  kind: "image" | "video" | "file";
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  is_primary?: boolean;
  is_secondary?: boolean;
}

interface RequestBody {
  name: string;
  slug: string;
  description: string;
  brand: string;
  price: number | null;
  stock: number;
  category_id: number;
  subcategory_id: number;
  attributes: Record<string, string>;
  temp_upload_id: string;
  uploaded_files: {
    gallery: UploadedFile[];
    additional: UploadedFile[];
    download: UploadedFile[];
  };
}

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

    // Obtener datos JSON
    const body: RequestBody = await request.json();

    const {
      name,
      slug,
      description,
      brand,
      price,
      stock,
      category_id,
      subcategory_id,
      attributes,
      temp_upload_id,
      uploaded_files,
    } = body;

    // Validar datos
    const productData = {
      name,
      slug: slug || generateSlug(name),
      description: description || null,
      price: price,
      stock: stock || 0,
      brand: brand || null,
      category_id,
      subcategory_id,
      attributes: attributes || {},
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

    // Función para mover archivo de carpeta temporal a la definitiva
    async function moveFileAndCreateAsset(
      file: UploadedFile,
      section: "gallery" | "additional" | "download",
      isPrimary: boolean = false,
      isSecondary: boolean = false
    ) {
      const oldPath = file.storage_path;
      const timestamp = Date.now();
      const sanitizedName = file.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const newPath = `${product.id}/${section}/${timestamp}-${sanitizedName}`;

      // Mover archivo en el storage
      const { error: moveError } = await supabase.storage
        .from("products")
        .move(oldPath, newPath);

      if (moveError) {
        console.error(`Error moving file ${oldPath} to ${newPath}:`, moveError);
        // Si falla mover, intentar copiar y luego eliminar
        const { data: fileData } = await supabase.storage
          .from("products")
          .download(oldPath);
        
        if (fileData) {
          await supabase.storage.from("products").upload(newPath, fileData, {
            cacheControl: "3600",
            upsert: true,
          });
          await supabase.storage.from("products").remove([oldPath]);
        } else {
          throw new Error(`Failed to move file: ${file.filename}`);
        }
      }

      // Obtener el siguiente sort_order
      const { data: lastAsset } = await supabase
        .from("product_assets")
        .select("sort_order")
        .eq("product_id", product.id)
        .eq("section", section)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = (lastAsset?.sort_order || 0) + 1;

      // Crear registro en la base de datos
      const { error: dbError } = await supabase.from("product_assets").insert({
        product_id: product.id,
        kind: file.kind,
        section: section,
        storage_bucket: "products",
        storage_path: newPath,
        title: section === "download" ? file.filename : null,
        alt: section !== "download" ? product.name : null,
        is_primary: isPrimary,
        is_secondary: isSecondary,
        sort_order: nextSortOrder,
        filename: file.filename,
        mime_type: file.mime_type,
        file_size_bytes: file.file_size_bytes,
        is_public: true,
      });

      if (dbError) {
        console.error("Error creating asset record:", dbError);
        throw new Error(`Error saving asset: ${dbError.message}`);
      }
    }

    // Procesar archivos de galería
    for (const file of uploaded_files.gallery) {
      try {
        await moveFileAndCreateAsset(
          file,
          "gallery",
          file.is_primary || false,
          file.is_secondary || false
        );
      } catch (error) {
        console.error("Error processing gallery file:", error);
      }
    }

    // Procesar archivos adicionales
    for (const file of uploaded_files.additional) {
      try {
        await moveFileAndCreateAsset(file, "additional");
      } catch (error) {
        console.error("Error processing additional file:", error);
      }
    }

    // Procesar archivos descargables
    for (const file of uploaded_files.download) {
      try {
        await moveFileAndCreateAsset(file, "download");
      } catch (error) {
        console.error("Error processing download file:", error);
      }
    }

    // Limpiar carpeta temporal si quedó algo
    try {
      const { data: tempFiles } = await supabase.storage
        .from("products")
        .list(`temp/${temp_upload_id}`);
      
      if (tempFiles && tempFiles.length > 0) {
        const pathsToDelete = tempFiles.map(f => `temp/${temp_upload_id}/${f.name}`);
        await supabase.storage.from("products").remove(pathsToDelete);
      }
    } catch (e) {
      // Ignorar errores de limpieza
    }

    return new Response(JSON.stringify({ success: true, product }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
