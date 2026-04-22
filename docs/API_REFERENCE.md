# 🔌 Documentación de APIs

## Estructura de APIs

```
src/pages/api/
├── auth/
│   ├── signin.ts      # Login de usuario
│   └── signout.ts     # Logout de usuario
├── admin/
│   ├── upload-url.ts  # Generar URLs firmadas para subir archivos
│   ├── products/
│   │   ├── index.ts   # Crear producto (POST)
│   │   └── [id].ts    # CRUD de producto específico
│   ├── categories/
│   │   ├── index.ts   # Listar/Crear categorías
│   │   └── [id].ts    # Actualizar/Eliminar categoría
│   └── subcategories/
│       ├── index.ts   # Listar/Crear subcategorías
│       └── [id].ts    # Actualizar/Eliminar subcategoría
└── products.ts        # API pública para el catálogo
```

---

## 🔐 APIs de Autenticación

### POST `/api/auth/signin`
Iniciar sesión con email y contraseña.

**Request:**
```typescript
// Content-Type: multipart/form-data
const formData = new FormData();
formData.append("email", "admin@ejemplo.com");
formData.append("password", "contraseña123");

const response = await fetch("/api/auth/signin", {
  method: "POST",
  body: formData,
});
```

**Responses:**
```json
// ✅ 200 OK
{ "success": true, "message": "Sesión iniciada correctamente", "redirect": "/admin" }

// ❌ 400 Bad Request
{ "success": false, "message": "Email y contraseña son requeridos" }

// ❌ 400 Bad Request (credenciales inválidas)
{ "success": false, "message": "Invalid login credentials" }
```

---

### POST `/api/auth/signout`
Cerrar sesión del usuario.

**Request:**
```typescript
await fetch("/api/auth/signout", { method: "POST" });
```

**Response:**
```json
{ "success": true, "message": "Sesión cerrada" }
```

---

## 📦 APIs de Productos

### POST `/api/admin/products`
Crear un nuevo producto.

> ⚠️ Requiere autenticación

**Request:**
```typescript
const response = await fetch("/api/admin/products", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Mesa de Roble",
    slug: "mesa-de-roble",
    description: "Mesa fabricada en roble macizo",
    brand: "ARM",
    price: 45000,
    stock: 10,
    category_id: 1,
    subcategory_id: 3,
    attributes: { material: "Roble", color: "Natural" },
    temp_upload_id: "upload_1234567890_abc123",
    uploaded_files: {
      gallery: [
        {
          storage_path: "temp/upload_1234.../gallery/imagen.jpg",
          kind: "image",
          filename: "imagen.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 245000,
          is_primary: true,
          is_secondary: false
        }
      ],
      additional: [],
      download: []
    }
  })
});
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 45,
    "name": "Mesa de Roble",
    "slug": "mesa-de-roble",
    "created_at": "2025-11-27T10:30:00Z"
  }
}
```

---

### GET `/api/admin/products/[id]`
Obtener un producto por ID con todos sus assets.

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 45,
    "name": "Mesa de Roble",
    "categories": { "id": 1, "name": "Muebles" },
    "subcategories": { "id": 3, "name": "Mesas" },
    "product_assets": [
      {
        "id": 100,
        "kind": "image",
        "section": "gallery",
        "public_url": "https://xxx.supabase.co/storage/v1/..."
      }
    ]
  }
}
```

---

### PUT `/api/admin/products/[id]`
Actualizar un producto existente.

> ⚠️ Requiere autenticación

**Request:**
```typescript
await fetch(`/api/admin/products/${productId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Mesa de Roble Premium",
    price: 55000,
    delete_assets: [100, 101],        // IDs de assets a eliminar
    set_primary_asset: 102,            // ID del asset primario
    set_secondary_asset: 103,          // ID del asset para hover
    uploaded_files: { ... }            // Nuevos archivos
  })
});
```

---

### DELETE `/api/admin/products/[id]`
Eliminar un producto y todos sus archivos.

> ⚠️ Requiere autenticación

```typescript
await fetch(`/api/admin/products/${productId}`, {
  method: "DELETE"
});
```

**Response:**
```json
{ "success": true }
```

---

## 📁 API de Subida de Archivos

### POST `/api/admin/upload-url`
Generar una URL firmada para subir archivos directamente a Supabase Storage.

> ⚠️ Requiere autenticación

**¿Por qué usar URLs firmadas?**
- Evita el límite de 4.5MB de Vercel (límite de payload)
- El archivo va directo del navegador a Supabase
- Soporta archivos de hasta 50MB

**Request:**
```typescript
const response = await fetch("/api/admin/upload-url", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    filename: "foto-producto.jpg",
    contentType: "image/jpeg",
    section: "gallery",            // gallery | additional | download
    tempUploadId: "upload_1234..." // ID único para agrupar archivos
  })
});

const { signedUrl, path } = await response.json();
```

**Response:**
```json
{
  "signedUrl": "https://xxx.supabase.co/storage/v1/object/upload/sign/...",
  "token": "abc123...",
  "path": "temp/upload_1234.../gallery/1701234567-foto-producto.jpg"
}
```

**Uso después de obtener la URL:**
```typescript
// Subir el archivo directamente a Supabase
await fetch(signedUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type },
  body: file  // File object del input
});
```

**Tipos permitidos por sección:**

| Sección | Tipos Permitidos |
|---------|------------------|
| `gallery` | JPG, PNG, WebP, GIF, MP4, WebM |
| `additional` | JPG, PNG, WebP, GIF, MP4, WebM |
| `download` | Todo lo anterior + PDF, ZIP, DOC, DOCX, XLS, XLSX |

---

## 📂 APIs de Categorías

### GET `/api/admin/categories`
Listar todas las categorías.

```typescript
const { categories } = await fetch("/api/admin/categories").then(r => r.json());
// [{ id: 1, name: "Muebles", slug: "muebles" }, ...]
```

### POST `/api/admin/categories`
Crear nueva categoría.

```typescript
await fetch("/api/admin/categories", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Iluminación",
    slug: "iluminacion",
    image_url: null
  })
});
```

### PUT `/api/admin/categories/[id]`
Actualizar categoría.

### DELETE `/api/admin/categories/[id]`
Eliminar categoría.

---

## 📂 APIs de Subcategorías

Misma estructura que categorías, pero incluye `category_id` y `filter_config`.

### POST `/api/admin/subcategories`
```typescript
await fetch("/api/admin/subcategories", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Mesas de Comedor",
    slug: "mesas-de-comedor",
    category_id: 1,
    filter_config: [
      { key: "material", label: "Material", type: "select", options: ["Roble", "Pino"] },
      { key: "capacidad", label: "Capacidad", type: "range", min: 2, max: 12 }
    ]
  })
});
```

---

## 🛡️ Códigos de Respuesta

| Código | Significado |
|--------|-------------|
| 200 | Éxito (GET, PUT) |
| 201 | Creado (POST) |
| 400 | Datos inválidos |
| 401 | No autenticado |
| 404 | No encontrado |
| 500 | Error del servidor |

---

## 📋 Ejemplo Completo: Crear Producto con Imágenes

```typescript
// 1. Generar ID temporal para agrupar uploads
const tempId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// 2. Subir cada imagen
const uploadedFiles = [];
for (const file of imageFiles) {
  // 2a. Obtener URL firmada
  const { signedUrl, path } = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      section: "gallery",
      tempUploadId: tempId
    })
  }).then(r => r.json());

  // 2b. Subir archivo directo a Supabase
  await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });

  uploadedFiles.push({
    storage_path: path,
    kind: "image",
    filename: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    is_primary: uploadedFiles.length === 0  // Primera imagen = primaria
  });
}

// 3. Crear el producto con los archivos ya subidos
await fetch("/api/admin/products", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Mi Producto",
    slug: "mi-producto",
    price: 1500,
    category_id: 1,
    subcategory_id: 1,
    temp_upload_id: tempId,
    uploaded_files: {
      gallery: uploadedFiles,
      additional: [],
      download: []
    }
  })
});
```
