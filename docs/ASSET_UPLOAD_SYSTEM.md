# 📤 Sistema de Subida de Assets

## El Problema

Vercel tiene un límite de **4.5MB** para el payload de requests. Cuando subías archivos grandes a través del API, obtenías error `413 Content Too Large`.

## La Solución: Signed Upload URLs

En lugar de enviar el archivo a través del API de Vercel, el navegador sube **directamente a Supabase Storage**.

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│   NAVEGADOR  │                    │    VERCEL    │                    │   SUPABASE   │
│              │                    │    (API)     │                    │   STORAGE    │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │  1. POST /api/admin/upload-url    │                                   │
       │  { filename, contentType }        │                                   │
       │──────────────────────────────────▶│                                   │
       │                                   │  2. createSignedUploadUrl()       │
       │                                   │──────────────────────────────────▶│
       │                                   │◀──────────────────────────────────│
       │  3. { signedUrl, path }           │                                   │
       │◀──────────────────────────────────│                                   │
       │                                   │                                   │
       │  4. PUT signedUrl (archivo binario) ─────────────────────────────────▶│
       │                                   │                                   │
       │◀────────────────────────────────── 5. 200 OK ─────────────────────────│
       │                                   │                                   │
       │  6. POST /api/admin/products      │                                   │
       │  { name, price, uploaded_files }  │                                   │
       │──────────────────────────────────▶│                                   │
       │                                   │  7. move() temp → final           │
       │                                   │──────────────────────────────────▶│
       │  8. { success: true }             │                                   │
       │◀──────────────────────────────────│                                   │
```

---

## Componentes del Sistema

### 1. Endpoint: `/api/admin/upload-url.ts`

Genera URLs firmadas para subir archivos.

```typescript
// Ubicación: src/pages/api/admin/upload-url.ts

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1. Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response(401);

  // 2. Validar tipo de archivo según sección
  const { filename, contentType, section, tempUploadId } = await request.json();
  
  // 3. Crear ruta temporal
  const storagePath = `temp/${tempUploadId}/${section}/${timestamp}-${filename}`;

  // 4. Generar URL firmada (válida 10 minutos)
  const { data } = await supabase.storage
    .from("products")
    .createSignedUploadUrl(storagePath);

  return { signedUrl: data.signedUrl, path: storagePath };
};
```

### 2. Cliente: `ProductForm.tsx`

El formulario de producto maneja las subidas:

```typescript
// Función que sube un archivo usando Signed URL
async function uploadFileWithSignedUrl(
  file: File,
  section: "gallery" | "additional" | "download",
  tempUploadId: string
) {
  // Paso 1: Obtener URL firmada
  const { signedUrl, path } = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      section,
      tempUploadId,
    }),
  }).then(r => r.json());

  // Paso 2: Subir archivo directamente a Supabase
  await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  // Paso 3: Retornar info del archivo
  return {
    storage_path: path,
    kind: getFileKind(file),
    filename: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
  };
}
```

### 3. API de Productos

Mueve archivos de carpeta temporal a definitiva:

```typescript
// En POST/PUT /api/admin/products

async function moveFileAndCreateAsset(file, section, productId) {
  const oldPath = file.storage_path;  // temp/upload_xxx/gallery/imagen.jpg
  const newPath = `${productId}/${section}/${timestamp}-${filename}`;

  // Mover archivo en Storage
  await supabase.storage.from("products").move(oldPath, newPath);

  // Crear registro en DB
  await supabase.from("product_assets").insert({
    product_id: productId,
    storage_path: newPath,
    kind: file.kind,
    section: section,
    // ...
  });
}
```

---

## Estructura de Storage

```
products/                          ← Bucket de Supabase Storage
├── temp/                          ← Archivos temporales
│   └── upload_1234567890_abc/     ← ID único por sesión de upload
│       ├── gallery/
│       │   └── 1701234567-foto.jpg
│       ├── additional/
│       └── download/
│
├── 45/                            ← Carpeta por producto (ID)
│   ├── gallery/
│   │   ├── 1701234567-foto1.jpg
│   │   └── 1701234568-foto2.jpg
│   ├── additional/
│   │   └── 1701234569-diagrama.png
│   └── download/
│       └── 1701234570-manual.pdf
│
└── 46/
    └── ...
```

---

## Secciones y Tipos Permitidos

| Sección | Descripción | Tipos Permitidos |
|---------|-------------|------------------|
| `gallery` | Galería principal | image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm |
| `additional` | Imágenes adicionales | Igual que gallery |
| `download` | Archivos descargables | Todo lo anterior + application/pdf, application/zip, DOC, DOCX, XLS, XLSX |

---

## Flujo Completo: Crear Producto con Imágenes

```typescript
// 1. Generar ID temporal único
const tempId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// 2. Por cada archivo seleccionado
const uploadedFiles = {
  gallery: [],
  additional: [],
  download: []
};

for (const file of galleryFiles) {
  // 2a. Mostrar progreso
  setProgress({ current: i + 1, total, fileName: file.name });

  // 2b. Subir archivo
  const uploaded = await uploadFileWithSignedUrl(file, "gallery", tempId);
  
  uploadedFiles.gallery.push({
    ...uploaded,
    is_primary: i === 0,  // Primera imagen = primaria
    is_secondary: false,
  });
}

// 3. Enviar datos del producto (solo JSON, sin archivos)
const response = await fetch("/api/admin/products", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Mi Producto",
    slug: "mi-producto",
    price: 1500,
    category_id: 1,
    subcategory_id: 1,
    attributes: {},
    temp_upload_id: tempId,
    uploaded_files: uploadedFiles,
  }),
});

// 4. El API mueve los archivos de temp/ a {productId}/
```

---

## Ventajas del Sistema

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Límite de archivo | 4.5MB (Vercel) | **50MB** (Supabase) |
| Donde sube | A través de Vercel | **Directo a Supabase** |
| Token expuesto | Sí (access token) | **No** (URL firmada) |
| Tiempo válido | Hasta expirar sesión | **10 minutos** |
| Control | Limitado | **Por archivo y sección** |

---

## Manejo de Errores

### Error al obtener URL firmada
```typescript
if (!urlResponse.ok) {
  const error = await urlResponse.json();
  throw new Error(error.error || "Error al obtener URL de subida");
}
```

### Error al subir archivo
```typescript
const uploadResponse = await fetch(signedUrl, { method: "PUT", body: file });
if (!uploadResponse.ok) {
  throw new Error(`Error al subir ${file.name}`);
}
```

### Error al mover archivo
```typescript
const { error: moveError } = await supabase.storage
  .from("products")
  .move(oldPath, newPath);

if (moveError) {
  // Fallback: descargar y volver a subir
  const { data: fileData } = await supabase.storage.from("products").download(oldPath);
  await supabase.storage.from("products").upload(newPath, fileData);
  await supabase.storage.from("products").remove([oldPath]);
}
```

---

## Limpieza de Archivos Temporales

Al finalizar la creación del producto, se intenta limpiar la carpeta temporal:

```typescript
try {
  const { data: tempFiles } = await supabase.storage
    .from("products")
    .list(`temp/${temp_upload_id}`);
  
  if (tempFiles?.length > 0) {
    const paths = tempFiles.map(f => `temp/${temp_upload_id}/${f.name}`);
    await supabase.storage.from("products").remove(paths);
  }
} catch (e) {
  // Ignorar errores de limpieza
}
```

> 💡 Considera crear un cron job para limpiar archivos temporales huérfanos (uploads abandonados).
