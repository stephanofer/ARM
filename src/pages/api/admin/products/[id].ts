import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  updateProduct,
  deleteProduct,
  uploadProductAsset,
  deleteProductAsset,
  setAssetAsPrimary,
  setAssetAsSecondary,
  validateProductData,
} from "@/lib/data/admin";

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

    const formData = await request.formData();

    // Construir datos de actualización
    const updateData: any = {};

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const brand = formData.get("brand") as string;
    const priceStr = formData.get("price") as string;
    const stockStr = formData.get("stock") as string;
    const categoryIdStr = formData.get("category_id") as string;
    const subcategoryIdStr = formData.get("subcategory_id") as string;
    const attributesStr = formData.get("attributes") as string;

    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== null) updateData.description = description || null;
    if (brand !== null) updateData.brand = brand || null;
    if (priceStr !== null) {
      const price = parseFloat(priceStr);
      updateData.price = isNaN(price) ? null : price;
    }
    if (stockStr !== null) {
      updateData.stock = parseInt(stockStr) || 0;
    }
    if (categoryIdStr) updateData.category_id = parseInt(categoryIdStr);
    if (subcategoryIdStr) updateData.subcategory_id = parseInt(subcategoryIdStr);
    if (attributesStr) updateData.attributes = JSON.parse(attributesStr);

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

    // Función helper para determinar el tipo de archivo
    const getFileKind = (file: File): "image" | "video" | "file" => {
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("video/")) return "video";
      return "file";
    };

    // Subir archivos de la galería
    const galleryFiles = formData.getAll("gallery_images") as File[];
    for (const file of galleryFiles) {
      if (file && file.size > 0) {
        try {
          await uploadProductAsset(supabase, productId, file, {
            kind: getFileKind(file),
            section: "gallery",
            alt: product.name,
          });
        } catch (uploadError) {
          console.error("Error uploading gallery file:", uploadError);
        }
      }
    }

    // Subir archivos adicionales
    const additionalFiles = formData.getAll("additional_images") as File[];
    for (const file of additionalFiles) {
      if (file && file.size > 0) {
        try {
          await uploadProductAsset(supabase, productId, file, {
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
    const downloadFilesArr = formData.getAll("download_files") as File[];
    for (const file of downloadFilesArr) {
      if (file && file.size > 0) {
        try {
          await uploadProductAsset(supabase, productId, file, {
            kind: "file",
            section: "download",
            title: file.name,
          });
        } catch (uploadError) {
          console.error("Error uploading download file:", uploadError);
        }
      }
    }

    // Eliminar assets marcados para eliminar
    const deleteAssetsStr = formData.get("delete_assets") as string;
    if (deleteAssetsStr) {
      const deleteAssetIds = JSON.parse(deleteAssetsStr) as number[];
      for (const assetId of deleteAssetIds) {
        try {
          await deleteProductAsset(supabase, assetId);
        } catch (deleteError) {
          console.error("Error deleting asset:", deleteError);
        }
      }
    }

    // Actualizar asset primario si se especifica
    const setPrimaryAssetId = formData.get("set_primary_asset") as string;
    if (setPrimaryAssetId) {
      try {
        await setAssetAsPrimary(supabase, parseInt(setPrimaryAssetId));
      } catch (error) {
        console.error("Error setting primary asset:", error);
      }
    }

    // Actualizar asset secundario (hover) si se especifica
    const setSecondaryAssetId = formData.get("set_secondary_asset") as string;
    if (setSecondaryAssetId !== undefined) {
      try {
        const secondaryId = setSecondaryAssetId ? parseInt(setSecondaryAssetId) : null;
        await setAssetAsSecondary(supabase, secondaryId, productId);
      } catch (error) {
        console.error("Error setting secondary asset:", error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, product }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating product:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
