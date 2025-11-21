import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase"; 
import { getFilteredProducts } from "@/lib/products"; 
import { PAGE_SIZE } from "@/config";

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const supabase = createClient({ request, cookies });
  
  console.log("------------------------------------------");
  console.log("API RECIBIÓ LLAMADA:", url.toString());
  
  const categoryId = Number(url.searchParams.get("categoryId"));
  const subParam = url.searchParams.get("subcategoryId");
  const subcategoryId = subParam ? Number(subParam) : null;
  
  console.log("🔍 PARAMS PARSEADOS:", {
    categoryId,
    subParamRaw: subParam,
    subcategoryIdFinal: subcategoryId,
    page: url.searchParams.get("page")
  });
  
  const page = Number(url.searchParams.get("page")) || 1;

  const filters: Record<string, any> = {};
  url.searchParams.forEach((value, key) => {
    if (!['categoryId', 'subcategoryId', 'page'].includes(key)) {
      filters[key] = value;
    }
  });

  console.log("FILTROS EXTRA:", filters);

  const { data, total } = await getFilteredProducts(
    supabase, 
    categoryId, 
    subcategoryId, 
    filters,
    page,
    PAGE_SIZE
  );

  console.log(`RESPUESTA DB: Encontrados ${total} productos.`);
  console.log("------------------------------------------");

  return new Response(JSON.stringify({ products: data, total: total }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
};