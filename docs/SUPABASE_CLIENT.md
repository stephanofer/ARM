# 📦 Guía del Cliente Supabase

## Resumen

El proyecto usa **un único cliente de Supabase** configurado para SSR (Server-Side Rendering) con Astro. Este cliente maneja automáticamente las cookies de autenticación.

---

## 🔧 El Cliente Principal

**Ubicación:** `src/lib/supabase.ts`

```typescript
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

export function createClient({ request, cookies }) {
  return createServerClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { /* Lee cookies del request */ },
        setAll(cookiesToSet) { /* Escribe cookies en la respuesta */ },
      },
    }
  );
}
```

### ¿Por qué este enfoque?

- **SSR Compatible**: Funciona en el servidor donde no existe `localStorage`
- **Cookies Automáticas**: Mantiene la sesión del usuario entre requests
- **Seguridad**: Usa `SUPABASE_ANON_KEY` (clave pública) + RLS para proteger datos

---

## 📝 Cómo Usarlo

### En Páginas Astro (.astro)

```astro
---
import { createClient } from "@/lib/supabase";

// Siempre pasar request y cookies del contexto de Astro
const supabase = createClient({ 
  request: Astro.request, 
  cookies: Astro.cookies 
});

// Ahora puedes usar supabase normalmente
const { data: products } = await supabase
  .from("products")
  .select("*");
---
```

### En API Routes (.ts)

```typescript
import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient({ request, cookies });
  
  // Verificar si el usuario está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { 
      status: 401 
    });
  }
  
  // Usuario autenticado, hacer queries
  const { data } = await supabase.from("products").select("*");
  
  return new Response(JSON.stringify({ data }));
};
```

### En el Middleware

```typescript
// src/middleware.ts
import { createClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient({
    request: context.request,
    cookies: context.cookies,
  });

  const { data } = await supabase.auth.getUser();
  
  // Proteger rutas /admin
  if (context.url.pathname.startsWith("/admin") && !data.user) {
    return context.redirect("/ingresar");
  }

  return next();
});
```

---

## 🔑 Autenticación

### Login

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "usuario@ejemplo.com",
  password: "contraseña123",
});
```

### Logout

```typescript
await supabase.auth.signOut();
```

### Obtener Usuario Actual

```typescript
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  console.log("Email:", user.email);
  console.log("ID:", user.id);
}
```

---

## 📊 Operaciones de Base de Datos

### SELECT (Leer)

```typescript
// Todos los productos
const { data } = await supabase.from("products").select("*");

// Con filtros
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("category_id", 5)
  .order("created_at", { ascending: false });

// Con relaciones (JOIN)
const { data } = await supabase
  .from("products")
  .select(`
    *,
    categories(id, name),
    subcategories(id, name)
  `)
  .single();
```

### INSERT (Crear)

```typescript
const { data, error } = await supabase
  .from("products")
  .insert({
    name: "Producto Nuevo",
    slug: "producto-nuevo",
    price: 1500,
    category_id: 1,
  })
  .select()
  .single();
```

### UPDATE (Actualizar)

```typescript
const { data, error } = await supabase
  .from("products")
  .update({ price: 2000 })
  .eq("id", 123)
  .select()
  .single();
```

### DELETE (Eliminar)

```typescript
const { error } = await supabase
  .from("products")
  .delete()
  .eq("id", 123);
```

---

## 📁 Storage (Archivos)

### Subir Archivo (usando Signed URL)

```typescript
// 1. Obtener URL firmada desde el servidor
const { data } = await supabase.storage
  .from("products")
  .createSignedUploadUrl("ruta/archivo.jpg");

// 2. Subir directamente a esa URL
await fetch(data.signedUrl, {
  method: "PUT",
  body: archivo,
  headers: { "Content-Type": "image/jpeg" }
});
```

### Obtener URL Pública

```typescript
const { data } = supabase.storage
  .from("products")
  .getPublicUrl("ruta/imagen.jpg");

console.log(data.publicUrl);
// https://xxx.supabase.co/storage/v1/object/public/products/ruta/imagen.jpg
```

### Mover Archivo

```typescript
await supabase.storage
  .from("products")
  .move("temp/archivo.jpg", "123/gallery/archivo.jpg");
```

### Eliminar Archivo

```typescript
await supabase.storage
  .from("products")
  .remove(["ruta/archivo1.jpg", "ruta/archivo2.jpg"]);
```

---

## ⚠️ Errores Comunes

### 1. "No hay cliente de Supabase"
**Problema:** Intentar usar supabase sin crear el cliente primero.
```typescript
// ❌ Mal
const data = await supabase.from("products").select();

// ✅ Bien
const supabase = createClient({ request, cookies });
const data = await supabase.from("products").select();
```

### 2. "Usuario no autenticado"
**Problema:** Olvidar verificar autenticación en APIs protegidas.
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return new Response("No autorizado", { status: 401 });
}
```

### 3. "RLS Policy Error"
**Problema:** La política RLS no permite la operación.
**Solución:** Verificar que el usuario tenga los permisos correctos en las políticas de Supabase.

---

## 🔒 Variables de Entorno

Requeridas en `.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # Clave pública (anon key)
```

> ⚠️ Nunca uses `SUPABASE_SERVICE_ROLE_KEY` en el cliente. Solo para scripts de admin.
