import { useState, useRef, useEffect } from "preact/hooks";
import type { JSX } from "preact";
import styles from "./ProductForm.module.css";

// Types
interface Category {
  id: number;
  name: string;
  subcategories: { id: number; name: string }[];
}

type AssetSection = "gallery" | "additional" | "download";
type AssetKind = "image" | "video" | "file";

interface Asset {
  id: number;
  public_url: string;
  alt: string | null;
  title: string | null;
  is_primary: boolean;
  is_secondary: boolean;
  section: AssetSection;
  kind: AssetKind;
  filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  sort_order: number;
}

interface AssetsGrouped {
  gallery: Asset[];
  additional: Asset[];
  download: Asset[];
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  price: number | null;
  stock: number;
  category_id: number;
  subcategory_id: number;
  attributes: Record<string, string>;
  created_at: string;
}

interface ProductFormProps {
  product?: Product;
  assets?: AssetsGrouped;
  categories: Category[];
  isNew?: boolean;
}

// Utility functions
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProductForm({
  product,
  assets = { gallery: [], additional: [], download: [] },
  categories,
  isNew = false,
}: ProductFormProps) {
  // Form state
  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [description, setDescription] = useState(product?.description || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [stock, setStock] = useState(product?.stock?.toString() || "0");
  const [categoryId, setCategoryId] = useState(product?.category_id?.toString() || "");
  const [subcategoryId, setSubcategoryId] = useState(product?.subcategory_id?.toString() || "");
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>(
    product?.attributes ? Object.entries(product.attributes).map(([key, value]) => ({ key, value })) : []
  );

  // Assets state - grouped by section
  const [galleryAssets, setGalleryAssets] = useState<Asset[]>(assets.gallery);
  const [additionalAssets, setAdditionalAssets] = useState<Asset[]>(assets.additional);
  const [downloadAssets, setDownloadAssets] = useState<Asset[]>(assets.download);

  // Files to upload per section
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<File[]>([]);

  // Previews per section
  const [galleryPreviews, setGalleryPreviews] = useState<{ file: File; url: string; isVideo: boolean }[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<{ file: File; url: string; isVideo: boolean }[]>([]);

  // NEW: Primary/secondary index for new files (before saving)
  const [primaryNewIndex, setPrimaryNewIndex] = useState<number>(0); // Default first image
  const [secondaryNewIndex, setSecondaryNewIndex] = useState<number | null>(null);

  // Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    url: string;
    isVideo: boolean;
    title: string;
  }>({ isOpen: false, url: "", isVideo: false, title: "" });

  // Assets to delete
  const [assetsToDelete, setAssetsToDelete] = useState<number[]>([]);
  const [primaryAssetId, setPrimaryAssetId] = useState<number | null>(
    assets.gallery.find((a) => a.is_primary)?.id || null
  );
  const [secondaryAssetId, setSecondaryAssetId] = useState<number | null>(
    assets.gallery.find((a) => a.is_secondary)?.id || null
  );

  // Active section tab
  const [activeMediaTab, setActiveMediaTab] = useState<AssetSection>("gallery");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(isNew);
  const [isDragging, setIsDragging] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.id.toString() === categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  // Reset subcategory when category changes
  useEffect(() => {
    if (!subcategories.find((s) => s.id.toString() === subcategoryId)) {
      setSubcategoryId("");
    }
  }, [categoryId]);

  // Handle file selection for images and videos (gallery/additional)
  function handleMediaFiles(files: FileList | File[], section: "gallery" | "additional") {
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validVideoTypes = ["video/mp4", "video/webm", "video/ogg"];
    const validTypes = [...validImageTypes, ...validVideoTypes];
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const fileArray = Array.from(files);

    const validFiles: File[] = [];
    const newPreviews: { file: File; url: string; isVideo: boolean }[] = [];

    fileArray.forEach((file) => {
      const isVideo = validVideoTypes.includes(file.type);
      const maxSize = isVideo ? maxVideoSize : maxImageSize;
      
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} no es un tipo de archivo válido`);
        return;
      }
      if (file.size > maxSize) {
        alert(`${file.name} excede el tamaño máximo de ${isVideo ? "100MB" : "10MB"}`);
        return;
      }
      validFiles.push(file);
      newPreviews.push({ file, url: URL.createObjectURL(file), isVideo });
    });

    if (section === "gallery") {
      setGalleryFiles((prev) => [...prev, ...validFiles]);
      setGalleryPreviews((prev) => [...prev, ...newPreviews]);
    } else {
      setAdditionalFiles((prev) => [...prev, ...validFiles]);
      setAdditionalPreviews((prev) => [...prev, ...newPreviews]);
    }
  }

  // Handle file selection for downloads
  function handleDownloadFiles(files: FileList | File[]) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const fileArray = Array.from(files);

    const validFiles: File[] = [];

    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        alert(`${file.name} excede el tamaño máximo de 50MB`);
        return;
      }
      validFiles.push(file);
    });

    setDownloadFiles((prev) => [...prev, ...validFiles]);
  }

  // Remove preview
  function removePreview(section: AssetSection, index: number) {
    if (section === "gallery") {
      URL.revokeObjectURL(galleryPreviews[index].url);
      setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
      setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
      
      // Adjust primary/secondary indices
      if (primaryNewIndex === index) {
        // If removing primary, set first remaining as primary
        setPrimaryNewIndex(0);
      } else if (primaryNewIndex > index) {
        setPrimaryNewIndex((prev) => prev - 1);
      }
      
      if (secondaryNewIndex === index) {
        setSecondaryNewIndex(null);
      } else if (secondaryNewIndex !== null && secondaryNewIndex > index) {
        setSecondaryNewIndex((prev) => prev !== null ? prev - 1 : null);
      }
    } else if (section === "additional") {
      URL.revokeObjectURL(additionalPreviews[index].url);
      setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
      setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      setDownloadFiles((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // Delete existing asset
  function deleteExistingAsset(section: AssetSection, assetId: number) {
    if (confirm("¿Eliminar este archivo?")) {
      setAssetsToDelete((prev) => [...prev, assetId]);

      if (section === "gallery") {
        setGalleryAssets((prev) => prev.filter((a) => a.id !== assetId));
        if (primaryAssetId === assetId) {
          setPrimaryAssetId(null);
        }
        if (secondaryAssetId === assetId) {
          setSecondaryAssetId(null);
        }
      } else if (section === "additional") {
        setAdditionalAssets((prev) => prev.filter((a) => a.id !== assetId));
      } else {
        setDownloadAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    }
  }

  // Set primary asset
  function setAsPrimary(assetId: number) {
    // Si ya es secundaria, limpiarla
    if (secondaryAssetId === assetId) {
      setSecondaryAssetId(null);
    }
    setPrimaryAssetId(assetId);
    setGalleryAssets((prev) => prev.map((a) => ({ 
      ...a, 
      is_primary: a.id === assetId,
      is_secondary: a.id === assetId ? false : a.is_secondary
    })));
  }

  // Set secondary asset (for hover effect)
  function setAsSecondary(assetId: number) {
    // Si ya es primaria, no permitir
    if (primaryAssetId === assetId) {
      return;
    }
    // Toggle: si ya es secundaria, quitarla
    if (secondaryAssetId === assetId) {
      setSecondaryAssetId(null);
      setGalleryAssets((prev) => prev.map((a) => ({ ...a, is_secondary: false })));
    } else {
      setSecondaryAssetId(assetId);
      setGalleryAssets((prev) => prev.map((a) => ({ ...a, is_secondary: a.id === assetId })));
    }
  }

  // Set primary for NEW files (before upload)
  function setNewAsPrimary(index: number) {
    if (galleryPreviews[index]?.isVideo) return; // Videos can't be primary
    if (secondaryNewIndex === index) {
      setSecondaryNewIndex(null);
    }
    setPrimaryNewIndex(index);
  }

  // Set secondary for NEW files (before upload)
  function setNewAsSecondary(index: number) {
    if (galleryPreviews[index]?.isVideo) return; // Videos can't be secondary
    if (primaryNewIndex === index) return; // Can't be both
    if (secondaryNewIndex === index) {
      setSecondaryNewIndex(null);
    } else {
      setSecondaryNewIndex(index);
    }
  }

  // Open preview modal
  function openPreview(url: string, isVideo: boolean, title: string) {
    setPreviewModal({ isOpen: true, url, isVideo, title });
  }

  // Close preview modal
  function closePreview() {
    setPreviewModal({ isOpen: false, url: "", isVideo: false, title: "" });
  }

  // Add attribute
  function addAttribute() {
    setAttributes((prev) => [...prev, { key: "", value: "" }]);
  }

  // Update attribute
  function updateAttribute(index: number, field: "key" | "value", value: string) {
    setAttributes((prev) => prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr)));
  }

  // Remove attribute
  function removeAttribute(index: number) {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  }

  // Handle form submission
  async function handleSubmit(e: JSX.TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build attributes object
      const attributesObj: Record<string, string> = {};
      attributes.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          attributesObj[key.trim()] = value.trim();
        }
      });

      // Prepare form data
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("slug", slug.trim());
      formData.append("description", description.trim());
      formData.append("brand", brand.trim());
      formData.append("price", price);
      formData.append("stock", stock || "0");
      formData.append("category_id", categoryId);
      formData.append("subcategory_id", subcategoryId);
      formData.append("attributes", JSON.stringify(attributesObj));

      // Add files per section with primary/secondary info
      galleryFiles.forEach((file, index) => {
        formData.append("gallery_images", file);
      });
      // Send which new file index should be primary/secondary
      formData.append("primary_new_index", primaryNewIndex.toString());
      if (secondaryNewIndex !== null) {
        formData.append("secondary_new_index", secondaryNewIndex.toString());
      }
      
      additionalFiles.forEach((file) => formData.append("additional_images", file));
      downloadFiles.forEach((file) => formData.append("download_files", file));

      // For edit mode
      if (product) {
        formData.append("delete_assets", JSON.stringify(assetsToDelete));
        formData.append("set_primary_asset", primaryAssetId?.toString() || "");
        formData.append("set_secondary_asset", secondaryAssetId?.toString() || "");
      }

      const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, { method, body: formData });
      const result = await response.json();

      if (result.success) {
        if (product) {
          // Edit mode - redirect if slug changed
          const newSlug = slug.trim();
          if (newSlug !== product.slug) {
            window.location.href = `/admin/productos/${newSlug}`;
          } else {
            window.location.reload();
          }
        } else {
          // Create mode - redirect to edit page
          window.location.href = `/admin/productos/${result.product.slug}?created=true`;
        }
      } else {
        alert(result.error || "Error al guardar el producto");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error inesperado al guardar el producto");
      setIsSubmitting(false);
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!product) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        window.location.href = "/admin/productos";
      } else {
        alert(result.error || "Error al eliminar el producto");
      }
    } catch (error) {
      console.error(error);
      alert("Error inesperado");
    }
  }

  // Drag and drop handlers
  function handleDragOver(e: JSX.TargetedDragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: JSX.TargetedDragEvent<HTMLDivElement>, section: AssetSection) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      if (section === "download") {
        handleDownloadFiles(e.dataTransfer.files);
      } else {
        handleMediaFiles(e.dataTransfer.files, section);
      }
    }
  }

  // Get the relevant data for active tab
  const tabConfigs = {
    gallery: {
      label: "Galería Principal",
      description: product 
        ? "Imágenes y videos del producto. Haz clic en los iconos para configurar:" 
        : "La primera imagen que subas será la principal (thumbnail). Después de guardar podrás elegir la secundaria para el efecto hover.",
      assets: galleryAssets,
      files: galleryFiles,
      previews: galleryPreviews,
      inputRef: galleryInputRef,
      accept: "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm",
      maxSizeLabel: "10MB img / 100MB video",
      showPrimary: true,
      showLegend: product && galleryAssets.length > 0, // Solo mostrar leyenda en edición con assets
    },
    additional: {
      label: "Imágenes Adicionales",
      description: "Imágenes y videos complementarios como especificaciones técnicas, diagramas, etc.",
      assets: additionalAssets,
      files: additionalFiles,
      previews: additionalPreviews,
      inputRef: additionalInputRef,
      accept: "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm",
      maxSizeLabel: "10MB img / 100MB video",
      showPrimary: false,
      showLegend: false,
    },
    download: {
      label: "Archivos Descargables",
      description: "PDFs, manuales, fichas técnicas u otros archivos disponibles para descarga.",
      assets: downloadAssets,
      files: downloadFiles,
      previews: [],
      inputRef: downloadInputRef,
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar",
      maxSizeLabel: "50MB",
      showPrimary: false,
      showLegend: false,
    },
  };

  const currentTab = tabConfigs[activeMediaTab];

  return (
    <div class={styles.productFormPage}>
      {/* Success Banner */}
      {showSuccessBanner && (
        <div class={styles.successBanner}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>¡Producto creado exitosamente!</span>
          <button
            type="button"
            class={styles.closeBanner}
            onClick={() => {
              setShowSuccessBanner(false);
              const url = new URL(window.location.href);
              url.searchParams.delete("created");
              window.history.replaceState({}, "", url.toString());
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <header class={styles.pageHeader}>
        <div class={styles.headerLeft}>
          <a href="/admin/productos" class={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <div class={styles.headerContent}>
            <h1 class={styles.pageTitle}>{product ? name || product.name : "Nuevo Producto"}</h1>
            {product && (
              <div class={styles.pageMeta}>
                <a href={`/producto/${product.slug}`} target="_blank" class={styles.viewLink}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Ver en sitio
                </a>
                <span class={styles.metaSeparator}>•</span>
                <span class={styles.metaDate}>
                  Creado:{" "}
                  {new Date(product.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
        <div class={styles.headerActions}>
          {product && (
            <button type="button" class={styles.dangerBtnOutline} onClick={() => setShowDeleteModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Eliminar
            </button>
          )}
          <button type="submit" form="product-form" class={styles.primaryBtn} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg
                  class={styles.spinner}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {product ? "Guardando..." : "Creando..."}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {product ? "Guardar Cambios" : "Crear Producto"}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Form */}
      <form id="product-form" class={styles.productForm} onSubmit={handleSubmit}>
        <div class={styles.formGrid}>
          {/* Main Column */}
          <div class={styles.formMain}>
            {/* Basic Info */}
            <section class={styles.formSection}>
              <h2 class={styles.sectionTitle}>Información Básica</h2>

              <div class={styles.formGroup}>
                <label for="name" class={styles.formLabel}>
                  Nombre del producto <span class={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  class={styles.formInput}
                  value={name}
                  onInput={(e) => setName(e.currentTarget.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div class={styles.formGroup}>
                <label for="slug" class={styles.formLabel}>
                  Slug (URL) <span class={styles.required}>*</span>
                  <button
                    type="button"
                    class={styles.autoGenerate}
                    onClick={() => name.trim() && setSlug(generateSlug(name))}
                  >
                    {product ? "Regenerar" : "Generar"}
                  </button>
                </label>
                <div class={styles.slugInputWrapper}>
                  <span class={styles.slugPrefix}>/producto/</span>
                  <input
                    type="text"
                    id="slug"
                    class={`${styles.formInput} ${styles.slugInput}`}
                    value={slug}
                    onInput={(e) => setSlug(e.currentTarget.value)}
                    required
                    pattern="[a-z0-9-]+"
                  />
                </div>
                <span class={styles.inputHint}>Solo letras minúsculas, números y guiones</span>
              </div>

              <div class={styles.formGroup}>
                <label for="description" class={styles.formLabel}>
                  Descripción
                </label>
                <textarea
                  id="description"
                  class={styles.formTextarea}
                  rows={5}
                  value={description}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                />
              </div>

              <div class={styles.formGroup}>
                <label for="brand" class={styles.formLabel}>
                  Marca
                </label>
                <input
                  type="text"
                  id="brand"
                  class={styles.formInput}
                  value={brand}
                  onInput={(e) => setBrand(e.currentTarget.value)}
                />
              </div>
            </section>

            {/* Inventory */}
            <section class={styles.formSection}>
              <h2 class={styles.sectionTitle}>Inventario</h2>

              <div class={styles.formRow}>
                <div class={styles.formGroup}>
                  <label for="price" class={styles.formLabel}>
                    Precio
                  </label>
                  <div class={styles.priceInputWrapper}>
                    <span class={styles.pricePrefix}>$</span>
                    <input
                      type="number"
                      id="price"
                      class={`${styles.formInput} ${styles.priceInput}`}
                      value={price}
                      onInput={(e) => setPrice(e.currentTarget.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div class={styles.formGroup}>
                  <label for="stock" class={styles.formLabel}>
                    Stock
                  </label>
                  <input
                    type="number"
                    id="stock"
                    class={styles.formInput}
                    value={stock}
                    onInput={(e) => setStock(e.currentTarget.value)}
                    min="0"
                  />
                </div>
              </div>
            </section>

            {/* Media Section with Tabs */}
            <section class={styles.formSection}>
              <h2 class={styles.sectionTitle}>Archivos Multimedia</h2>

              {/* Tabs */}
              <div class={styles.mediaTabs}>
                <button
                  type="button"
                  class={`${styles.mediaTab} ${activeMediaTab === "gallery" ? styles.activeTab : ""}`}
                  onClick={() => setActiveMediaTab("gallery")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Galería
                  {(galleryAssets.length > 0 || galleryFiles.length > 0) && (
                    <span class={styles.tabBadge}>{galleryAssets.length + galleryFiles.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  class={`${styles.mediaTab} ${activeMediaTab === "additional" ? styles.activeTab : ""}`}
                  onClick={() => setActiveMediaTab("additional")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Adicionales
                  {(additionalAssets.length > 0 || additionalFiles.length > 0) && (
                    <span class={styles.tabBadge}>{additionalAssets.length + additionalFiles.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  class={`${styles.mediaTab} ${activeMediaTab === "download" ? styles.activeTab : ""}`}
                  onClick={() => setActiveMediaTab("download")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Descargables
                  {(downloadAssets.length > 0 || downloadFiles.length > 0) && (
                    <span class={styles.tabBadge}>{downloadAssets.length + downloadFiles.length}</span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div class={styles.mediaTabContent}>
                <p class={styles.sectionDescription}>{currentTab.description}</p>

                {/* Legend for gallery controls */}
                {currentTab.showLegend && (
                  <div class={styles.mediaLegend}>
                    <div class={styles.legendItem}>
                      <span class={styles.legendIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </span>
                      <span>Principal (thumbnail en catálogo)</span>
                    </div>
                    <div class={styles.legendItem}>
                      <span class={styles.legendIcon} style={{ background: "#ede9fe", color: "#7c3aed" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      </span>
                      <span>Secundaria (aparece en hover)</span>
                    </div>
                  </div>
                )}

                {/* Existing Assets */}
                {currentTab.assets.length > 0 && (
                  <div class={styles.existingImages}>
                    {activeMediaTab === "download" ? (
                      // File list for downloads
                      <div class={styles.fileList}>
                        {downloadAssets.map((asset) => (
                          <div key={asset.id} class={styles.fileItem}>
                            <div class={styles.fileIcon}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </div>
                            <div class={styles.fileInfo}>
                              <span class={styles.fileName}>{asset.filename || asset.title || "Archivo"}</span>
                              <span class={styles.fileMeta}>
                                {formatFileSize(asset.file_size_bytes)} {asset.mime_type && `• ${asset.mime_type}`}
                              </span>
                            </div>
                            <a href={asset.public_url} target="_blank" class={styles.downloadBtn} title="Descargar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </a>
                            <button
                              type="button"
                              class={styles.deleteFileBtn}
                              onClick={() => deleteExistingAsset("download", asset.id)}
                              title="Eliminar"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Image/Video grid for gallery/additional
                      <div class={styles.imageGrid}>
                        {currentTab.assets.map((asset) => (
                          <div key={asset.id} class={styles.imageItem}>
                            <div 
                              class={styles.imagePreviewClick}
                              onClick={() => openPreview(asset.public_url, asset.kind === "video", asset.title || asset.filename || name)}
                              title="Click para ver en grande"
                            >
                              {asset.kind === "video" ? (
                                <video src={asset.public_url} muted />
                              ) : (
                                <img src={asset.public_url} alt={asset.alt || name} />
                              )}
                              <div class={styles.zoomOverlay}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <circle cx="11" cy="11" r="8" />
                                  <path d="m21 21-4.35-4.35" />
                                  <line x1="11" y1="8" x2="11" y2="14" />
                                  <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                              </div>
                            </div>
                            <div class={styles.imageActions}>
                              {currentTab.showPrimary && asset.kind !== "video" && (
                                <>
                                  <button
                                    type="button"
                                    class={`${styles.setPrimary} ${asset.is_primary ? styles.isPrimary : ""}`}
                                    onClick={() => setAsPrimary(asset.id)}
                                    title={asset.is_primary ? "Imagen principal" : "Establecer como principal"}
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill={asset.is_primary ? "currentColor" : "none"}
                                      stroke="currentColor"
                                      stroke-width="2"
                                    >
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    class={`${styles.setSecondary} ${asset.is_secondary ? styles.isSecondary : ""}`}
                                    onClick={() => setAsSecondary(asset.id)}
                                    title={asset.is_secondary ? "Imagen secundaria (hover)" : "Establecer como secundaria (hover)"}
                                    disabled={asset.is_primary}
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill={asset.is_secondary ? "currentColor" : "none"}
                                      stroke="currentColor"
                                      stroke-width="2"
                                    >
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M12 2a10 10 0 0 1 0 20" fill={asset.is_secondary ? "currentColor" : "none"} />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {asset.kind === "video" && (
                                <span class={styles.videoBadge} title="Video">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                </span>
                              )}
                              <button
                                type="button"
                                class={styles.deleteImage}
                                onClick={() => deleteExistingAsset(activeMediaTab, asset.id)}
                                title="Eliminar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                            {asset.is_primary && <span class={styles.primaryBadge}>Principal</span>}
                            {asset.is_secondary && <span class={styles.secondaryBadge}>Hover</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Zone */}
                <div
                  class={`${styles.uploadZone} ${isDragging ? styles.dragover : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, activeMediaTab)}
                  onClick={(e) => {
                    // Evitar doble click: solo abrir si el click no viene del input
                    if ((e.target as HTMLElement).tagName !== "INPUT") {
                      currentTab.inputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={currentTab.inputRef}
                    type="file"
                    class={styles.uploadInput}
                    multiple
                    accept={currentTab.accept}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.currentTarget.files && e.currentTarget.files.length > 0) {
                        if (activeMediaTab === "download") {
                          handleDownloadFiles(e.currentTarget.files);
                        } else {
                          handleMediaFiles(e.currentTarget.files, activeMediaTab);
                        }
                        // Resetear el input para permitir seleccionar el mismo archivo
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <div class={styles.uploadContent}>
                    <div class={styles.uploadIcon}>
                      {activeMediaTab === "download" ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      )}
                    </div>
                    <p class={styles.uploadText}>
                      Arrastra archivos o <span>haz clic para subir</span>
                    </p>
                    <p class={styles.uploadHint}>
                      {activeMediaTab === "download"
                        ? `PDF, DOC, XLS, ZIP hasta ${currentTab.maxSizeLabel}`
                        : `PNG, JPG, WEBP, GIF, MP4, WebM hasta ${currentTab.maxSizeLabel}`}
                    </p>
                  </div>
                </div>

                {/* Preview Grid for images and videos */}
                {activeMediaTab !== "download" && currentTab.previews.length > 0 && (
                  <>
                    {/* Show legend for new gallery files */}
                    {activeMediaTab === "gallery" && galleryPreviews.length > 0 && (
                      <div class={styles.mediaLegend}>
                        <div class={styles.legendItem}>
                          <span class={styles.legendIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </span>
                          <span>Principal (thumbnail)</span>
                        </div>
                        <div class={styles.legendItem}>
                          <span class={styles.legendIcon} style={{ background: "#ede9fe", color: "#7c3aed" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          </span>
                          <span>Secundaria (hover)</span>
                        </div>
                      </div>
                    )}
                    <div class={styles.imagePreviewGrid}>
                      {currentTab.previews.map((preview, index) => {
                        const isPrimary = activeMediaTab === "gallery" && primaryNewIndex === index && !preview.isVideo;
                        const isSecondary = activeMediaTab === "gallery" && secondaryNewIndex === index && !preview.isVideo;
                        
                        return (
                          <div key={preview.file.name} class={`${styles.imagePreviewItem} ${isPrimary ? styles.isPrimaryNew : ""} ${isSecondary ? styles.isSecondaryNew : ""}`}>
                            <div 
                              class={styles.imagePreviewClick}
                              onClick={() => openPreview(preview.url, preview.isVideo, preview.file.name)}
                              title="Click para ver en grande"
                            >
                              {preview.isVideo ? (
                                <video src={preview.url} muted />
                              ) : (
                                <img src={preview.url} alt={preview.file.name} />
                              )}
                              <div class={styles.zoomOverlay}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <circle cx="11" cy="11" r="8" />
                                  <path d="m21 21-4.35-4.35" />
                                  <line x1="11" y1="8" x2="11" y2="14" />
                                  <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                              </div>
                            </div>
                            
                            {/* Actions for gallery items */}
                            {activeMediaTab === "gallery" && !preview.isVideo && (
                              <div class={styles.newImageActions}>
                                <button
                                  type="button"
                                  class={`${styles.setPrimary} ${isPrimary ? styles.isPrimary : ""}`}
                                  onClick={() => setNewAsPrimary(index)}
                                  title={isPrimary ? "Imagen principal" : "Establecer como principal"}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill={isPrimary ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    stroke-width="2"
                                  >
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  class={`${styles.setSecondary} ${isSecondary ? styles.isSecondary : ""}`}
                                  onClick={() => setNewAsSecondary(index)}
                                  title={isSecondary ? "Imagen secundaria" : "Establecer como secundaria"}
                                  disabled={isPrimary}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill={isSecondary ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    stroke-width="2"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            
                            <button type="button" class={styles.removePreview} onClick={() => removePreview(activeMediaTab, index)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                            {preview.isVideo && (
                              <span class={styles.videoBadgeNew}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              </span>
                            )}
                            {isPrimary && <span class={styles.primaryBadge}>Principal</span>}
                            {isSecondary && <span class={styles.secondaryBadge}>Hover</span>}
                            {!isPrimary && !isSecondary && <span class={styles.newBadge}>Nueva</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* File list for new downloads */}
                {activeMediaTab === "download" && downloadFiles.length > 0 && (
                  <div class={styles.fileList}>
                    {downloadFiles.map((file, index) => (
                      <div key={file.name} class={`${styles.fileItem} ${styles.newFile}`}>
                        <div class={styles.fileIcon}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div class={styles.fileInfo}>
                          <span class={styles.fileName}>{file.name}</span>
                          <span class={styles.fileMeta}>{formatFileSize(file.size)} • Nuevo</span>
                        </div>
                        <button
                          type="button"
                          class={styles.deleteFileBtn}
                          onClick={() => removePreview("download", index)}
                          title="Eliminar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside class={styles.formSidebar}>
            {/* Category */}
            <section class={styles.formSection}>
              <h2 class={styles.sectionTitle}>
                Categoría <span class={styles.required}>*</span>
              </h2>

              <div class={styles.formGroup}>
                <label for="category_id" class={styles.formLabel}>
                  Categoría
                </label>
                <select
                  id="category_id"
                  class={styles.formSelect}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.currentTarget.value)}
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div class={styles.formGroup}>
                <label for="subcategory_id" class={styles.formLabel}>
                  Subcategoría
                </label>
                <select
                  id="subcategory_id"
                  class={styles.formSelect}
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.currentTarget.value)}
                  disabled={!categoryId || subcategories.length === 0}
                  required
                >
                  <option value="">
                    {!categoryId
                      ? "Selecciona una categoría primero"
                      : subcategories.length === 0
                        ? "No hay subcategorías"
                        : "Seleccionar subcategoría"}
                  </option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Attributes */}
            <section class={styles.formSection}>
              <h2 class={styles.sectionTitle}>Atributos</h2>

              <div class={styles.attributesList}>
                {attributes.map((attr, index) => (
                  <div key={index} class={styles.attributeItem}>
                    <input
                      type="text"
                      class={`${styles.formInput} ${styles.attrKey}`}
                      placeholder="Nombre"
                      value={attr.key}
                      onInput={(e) => updateAttribute(index, "key", e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      class={`${styles.formInput} ${styles.attrValue}`}
                      placeholder="Valor"
                      value={attr.value}
                      onInput={(e) => updateAttribute(index, "value", e.currentTarget.value)}
                    />
                    <button type="button" class={styles.removeAttr} onClick={() => removeAttribute(index)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" class={styles.addAttributeBtn} onClick={addAttribute}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Añadir atributo
              </button>
            </section>
          </aside>
        </div>
      </form>

      {/* Delete Modal */}
      {showDeleteModal && product && (
        <div class={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div class={styles.modal}>
            <div class={`${styles.modalIcon} ${styles.danger}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 class={styles.modalTitle}>Eliminar producto</h3>
            <p class={styles.modalMessage}>
              ¿Estás seguro de que deseas eliminar <strong>{product.name}</strong>? Esta acción no se puede deshacer y se
              eliminarán todas las imágenes y archivos asociados.
            </p>
            <div class={styles.modalActions}>
              <button class={styles.secondaryBtn} onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button class={styles.dangerBtn} onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div class={styles.previewOverlay} onClick={closePreview}>
          <div class={styles.previewModalContainer} onClick={(e) => e.stopPropagation()}>
            <button type="button" class={styles.previewClose} onClick={closePreview}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div class={styles.previewContent}>
              {previewModal.isVideo ? (
                <video 
                  src={previewModal.url} 
                  controls 
                  autoPlay 
                  class={styles.previewVideo}
                />
              ) : (
                <img 
                  src={previewModal.url} 
                  alt={previewModal.title} 
                  class={styles.previewImage}
                />
              )}
            </div>
            <div class={styles.previewFooter}>
              <span class={styles.previewName}>{previewModal.title}</span>
              {previewModal.isVideo && (
                <span class={styles.previewType}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Video
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
