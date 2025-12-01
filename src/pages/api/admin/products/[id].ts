import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  updateProduct,
  deleteProduct,
  deleteProductAsset,
  setAssetAsPrimary,
  setAssetAsSecondary,
  validateProductData,
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
  delete_assets: number[];
  set_primary_asset: number | null;
  set_secondary_asset: number | null;
}

// GET - Obtener producto por ID
export const GET: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });
    const productId = parseInt(params.id || "");

    if (!productId || isNaN(productId)) {
      return new Response(
        JSON.stringify({ success: false, error: "ID de producto inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        categories(id, name),
        subcategories(id, name),
        product_assets(*)
      `)
      .eq("id", productId)
      .single();

    if (error || !product) {
      return new Response(
        JSON.stringify({ success: false, error: "Producto no encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Agregar URLs públicas a los assets
    const assets = (product.product_assets || []).map((asset: any) => {
      const { data } = supabase.storage
        .from(asset.storage_bucket)
        .getPublicUrl(asset.storage_path);
      return {
        ...asset,
        public_url: data?.publicUrl || null,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          ...product,
          product_assets: assets,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting product:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Error al obtener producto" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// PUT - Actualizar producto
export const PUT: APIRoute = async ({ params, request, cookies }) => {
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

    const productId = parseInt(params.id || "");
    if (!productId || isNaN(productId)) {
      return new Response(
        JSON.stringify({ success: false, error: "ID de producto inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
      delete_assets,
      set_primary_asset,
      set_secondary_asset,
    } = body;

    // Construir datos de actualización
    const updateData: any = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description || null;
    if (brand !== undefined) updateData.brand = brand || null;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock || 0;
    if (category_id) updateData.category_id = category_id;
    if (subcategory_id) updateData.subcategory_id = subcategory_id;
    if (attributes) updateData.attributes = attributes;

    // Validar datos
    const errors = validateProductData(updateData);
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: errors.join(", ") }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Actualizar producto
    const product = await updateProduct(supabase, productId, updateData);

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
      const newPath = `${productId}/${section}/${timestamp}-${sanitizedName}`;

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
        .eq("product_id", productId)
        .eq("section", section)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = (lastAsset?.sort_order || 0) + 1;

      // Si este nuevo asset será primario, quitar el flag de los existentes
      if (isPrimary) {
        await supabase
          .from("product_assets")
          .update({ is_primary: false })
          .eq("product_id", productId)
          .eq("section", "gallery");
      }

      // Si este nuevo asset será secundario, quitar el flag de los existentes
      if (isSecondary) {
        await supabase
          .from("product_assets")
          .update({ is_secondary: false })
          .eq("product_id", productId)
          .eq("section", "gallery");
      }

      // Crear registro en la base de datos
      const { error: dbError } = await supabase.from("product_assets").insert({
        product_id: productId,
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

    // Procesar archivos de galería (si hay nuevos)
    if (uploaded_files?.gallery) {
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
    }

    // Procesar archivos adicionales
    if (uploaded_files?.additional) {
      for (const file of uploaded_files.additional) {
        try {
          await moveFileAndCreateAsset(file, "additional");
        } catch (error) {
          console.error("Error processing additional file:", error);
        }
      }
    }

    // Procesar archivos descargables
    if (uploaded_files?.download) {
      for (const file of uploaded_files.download) {
        try {
          await moveFileAndCreateAsset(file, "download");
        } catch (error) {
          console.error("Error processing download file:", error);
        }
      }
    }

    // Eliminar assets marcados para eliminar
    if (delete_assets && delete_assets.length > 0) {
      for (const assetId of delete_assets) {
        try {
          await deleteProductAsset(supabase, assetId);
        } catch (deleteError) {
          console.error("Error deleting asset:", deleteError);
        }
      }
    }

    // Actualizar asset primario si se especifica
    if (set_primary_asset) {
      try {
        await setAssetAsPrimary(supabase, set_primary_asset);
      } catch (error) {
        console.error("Error setting primary asset:", error);
      }
    }

    // Actualizar asset secundario (hover) si se especifica
    if (set_secondary_asset !== undefined) {
      try {
        await setAssetAsSecondary(supabase, set_secondary_asset, productId);
      } catch (error) {
        console.error("Error setting secondary asset:", error);
      }
    }

    // Limpiar carpeta temporal si quedó algo
    if (temp_upload_id) {
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
    }

    return new Response(JSON.stringify({ success: true, product }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// DELETE - Eliminar producto
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
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

    const productId = parseInt(params.id || "");
    if (!productId || isNaN(productId)) {
      return new Response(
        JSON.stringify({ success: false, error: "ID de producto inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await deleteProduct(supabase, productId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
