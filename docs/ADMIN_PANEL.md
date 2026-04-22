# 🎛️ Panel de Administración

## Visión General

El panel de administración permite gestionar productos, categorías y subcategorías del e-commerce ARM.

**URL:** `/admin`

---

## 🔐 Acceso y Seguridad

### Protección de Rutas

El middleware (`src/middleware.ts`) protege automáticamente todas las rutas `/admin/*`:

```typescript
// Si no hay usuario autenticado → Redirige a /ingresar
if (pathname.startsWith("/admin") && !user) {
  return redirect("/ingresar");
}
```

### Login

**Página:** `/ingresar`

```
Email: [tu-email]
Password: [tu-contraseña]
↓
POST /api/auth/signin
↓
Redirige a /admin
```

---

## 📊 Dashboard (`/admin`)

Página principal con estadísticas y accesos rápidos.

### Estadísticas

| Métrica | Descripción |
|---------|-------------|
| Productos | Total de productos en el sistema |
| Categorías | Total de categorías |
| Subcategorías | Total de subcategorías |
| Imágenes | Total de assets (imágenes/videos) |

### Productos Recientes

Tabla con los últimos 5 productos creados:
- Thumbnail
- Nombre
- Categoría
- Fecha de creación
- Botón "Editar"

### Acciones Rápidas

- ➕ Nuevo Producto
- 🔍 Buscar Productos
- 📁 Gestionar Categorías
- 🌐 Ver Sitio Web

---

## 📦 Gestión de Productos

### Lista de Productos (`/admin/productos`)

Tabla con todos los productos:
- Búsqueda por nombre
- Filtro por categoría
- Ordenamiento
- Paginación

### Crear Producto (`/admin/productos/nuevo`)

Formulario con:

#### Información Básica
- **Nombre** (requerido)
- **Slug** (auto-generado, editable)
- **Descripción**
- **Marca**

#### Inventario
- **Precio**
- **Stock**

#### Categorización
- **Categoría** (requerido)
- **Subcategoría** (requerido)

#### Archivos Multimedia (Tabs)

| Tab | Contenido | Formatos |
|-----|-----------|----------|
| Galería | Imágenes principales | JPG, PNG, WebP, GIF, MP4 |
| Adicionales | Imágenes complementarias | JPG, PNG, WebP, GIF, MP4 |
| Descargables | PDFs, manuales | PDF, DOC, XLS, ZIP |

#### Atributos

Dos tipos de atributos:

1. **Filtros de Subcategoría**: Definidos en la subcategoría
   - Select, Checkbox, Range, Boolean
   - Se usan para filtrar en el catálogo

2. **Atributos Personalizados**: Key-Value libre
   - Para info adicional del producto

---

### Editar Producto (`/admin/productos/[slug]`)

Mismo formulario que crear, con funcionalidades extra:

#### Gestión de Imágenes
- 🌟 Marcar como **Principal** (thumbnail en catálogo)
- 🔵 Marcar como **Secundaria** (efecto hover)
- 🗑️ Eliminar imágenes existentes
- ➕ Agregar nuevas imágenes

#### Acciones
- **Guardar Cambios**
- **Eliminar Producto** (con confirmación)
- **Ver en Sitio** (abre en nueva pestaña)

---

## 📁 Gestión de Categorías (`/admin/categorias`)

### Lista de Categorías

Para cada categoría:
- Nombre
- Slug
- Cantidad de productos
- Subcategorías anidadas

### Crear/Editar Categoría

```
Nombre: [Muebles]
Slug: [muebles] (auto-generado)
Imagen: [opcional]
```

### Subcategorías

Cada categoría tiene subcategorías con:
- Nombre
- Slug
- **Filter Config**: Configuración de filtros

#### Configuración de Filtros

```json
[
  {
    "key": "material",
    "label": "Material",
    "type": "select",
    "options": ["Roble", "Pino", "MDF"]
  },
  {
    "key": "capacidad",
    "label": "Capacidad",
    "type": "range",
    "min": 2,
    "max": 12,
    "step": 1
  },
  {
    "key": "plegable",
    "label": "Es Plegable",
    "type": "boolean"
  }
]
```

Tipos de filtros:
- `select`: Dropdown con opciones
- `checkbox`: Múltiples opciones seleccionables
- `range`: Valor numérico con min/max
- `boolean`: Sí/No

---

## 🖥️ Estructura de Archivos

```
src/pages/admin/
├── index.astro              # Dashboard
├── productos/
│   ├── index.astro          # Lista de productos
│   ├── nuevo.astro          # Crear producto
│   └── [productSlug].astro  # Editar producto
└── categorias/
    └── index.astro          # Gestión de categorías

src/components/admin/
├── ProductForm.tsx          # Formulario de producto (Preact)
├── ProductsList.tsx         # Lista de productos
└── CategoriesManager.tsx    # Gestor de categorías
```

---

## 🔄 Flujo de Trabajo Típico

### Agregar Producto Nuevo

```
1. /admin/productos/nuevo
2. Completar información básica
3. Seleccionar categoría → subcategoría
4. Arrastrar imágenes a la galería
5. Completar atributos de filtro
6. Click "Crear Producto"
7. → Redirige a /admin/productos/[slug]
```

### Editar Producto

```
1. /admin/productos → Click en producto
2. Modificar campos necesarios
3. Agregar/eliminar imágenes
4. Cambiar imagen principal si es necesario
5. Click "Guardar Cambios"
6. → Recarga la página con cambios aplicados
```

### Crear Categoría con Filtros

```
1. /admin/categorias
2. Click "Nueva Categoría"
3. Nombre: "Muebles", Slug: "muebles"
4. Guardar
5. Click "Agregar Subcategoría"
6. Nombre: "Mesas", Slug: "mesas"
7. Configurar filtros:
   - Material (select): Roble, Pino
   - Capacidad (range): 2-12
8. Guardar
```

---

## ⌨️ Atajos y Tips

- **Generar Slug**: Click en "Generar" junto al campo slug
- **Drag & Drop**: Arrastra archivos sobre la zona de upload
- **Vista Previa**: Click en cualquier imagen para ver ampliada
- **Primary/Secondary**: Iconos de estrella (⭐) y círculo (●) en imágenes
