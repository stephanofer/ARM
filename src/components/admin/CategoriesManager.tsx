import { useState, useEffect } from "preact/hooks";
import type { Category, Subcategory, FilterConfig } from "@/lib/data/types";
import styles from "./CategoriesManager.module.css";

interface CategoryWithSubs extends Category {
  subcategories: Subcategory[];
}

interface Props {
  initialCategories: CategoryWithSubs[];
}

type FilterType = "select" | "checkbox" | "range" | "boolean";

interface EditingFilter extends FilterConfig {
  tempOptions?: string;
}

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] =
    useState<CategoryWithSubs[]>(initialCategories);
  const [activeTab, setActiveTab] = useState<"categories" | "subcategories">(
    "categories"
  );

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    image_url: "",
  });

  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] =
    useState<Subcategory | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState({
    name: "",
    slug: "",
    category_id: "",
    display_order: 0,
    filter_config: [] as EditingFilter[],
  });

  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    type: "category" | "subcategory";
    id: number;
    name: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);
  }

  function openCategoryModal(category?: Category) {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        image_url: category.image_url || "",
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", slug: "", image_url: "" });
    }
    setShowCategoryModal(true);
  }

  async function handleCategorySubmit(e: Event) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          slug: categoryForm.slug || generateSlug(categoryForm.name),
          image_url: categoryForm.image_url.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      if (editingCategory) {
        setCategories((cats) =>
          cats.map((c) =>
            c.id === data.category.id
              ? { ...data.category, subcategories: c.subcategories }
              : c
          )
        );
        setSuccessMessage("Categoría actualizada");
      } else {
        setCategories((cats) => [
          ...cats,
          { ...data.category, subcategories: [] },
        ]);
        setSuccessMessage("Categoría creada");
      }

      setShowCategoryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteModal || deleteModal.type !== "category") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/categories/${deleteModal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar");
      }

      setCategories((cats) => cats.filter((c) => c.id !== deleteModal.id));
      setSuccessMessage("Categoría eliminada");
      setDeleteModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  function openSubcategoryModal(subcategory?: Subcategory) {
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubcategoryForm({
        name: subcategory.name,
        slug: subcategory.slug,
        category_id: subcategory.category_id.toString(),
        display_order: subcategory.display_order,
        filter_config: subcategory.filter_config.map((f) => ({
          ...f,
          tempOptions: f.options?.join(", ") || "",
        })),
      });
    } else {
      setEditingSubcategory(null);
      setSubcategoryForm({
        name: "",
        slug: "",
        category_id: categories[0]?.id.toString() || "",
        display_order: 0,
        filter_config: [],
      });
    }
    setShowSubcategoryModal(true);
  }

  async function handleSubcategorySubmit(e: Event) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const processedFilters: FilterConfig[] =
        subcategoryForm.filter_config.map((f) => {
          const filter: FilterConfig = {
            key: f.key,
            label: f.label,
            type: f.type,
          };

          if (f.type === "select" || f.type === "checkbox") {
            filter.options =
              f.tempOptions
                ?.split(",")
                .map((o) => o.trim())
                .filter((o) => o.length > 0) || [];
          }

          if (f.type === "range") {
            filter.min = f.min;
            filter.max = f.max;
            filter.step = f.step;
          }

          return filter;
        });

      const url = editingSubcategory
        ? `/api/admin/subcategories/${editingSubcategory.id}`
        : "/api/admin/subcategories";

      const response = await fetch(url, {
        method: editingSubcategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subcategoryForm.name.trim(),
          slug: subcategoryForm.slug || generateSlug(subcategoryForm.name),
          category_id: parseInt(subcategoryForm.category_id),
          display_order: subcategoryForm.display_order,
          filter_config: processedFilters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      if (editingSubcategory) {
        setCategories((cats) =>
          cats.map((cat) => ({
            ...cat,
            subcategories: cat.subcategories.map((sub) =>
              sub.id === data.subcategory.id ? data.subcategory : sub
            ),
          }))
        );
        setSuccessMessage("Subcategoría actualizada");
      } else {
        setCategories((cats) =>
          cats.map((cat) =>
            cat.id === data.subcategory.category_id
              ? {
                  ...cat,
                  subcategories: [...cat.subcategories, data.subcategory],
                }
              : cat
          )
        );
        setSuccessMessage("Subcategoría creada");
      }

      setShowSubcategoryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteSubcategory() {
    if (!deleteModal || deleteModal.type !== "subcategory") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/subcategories/${deleteModal.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar");
      }

      setCategories((cats) =>
        cats.map((cat) => ({
          ...cat,
          subcategories: cat.subcategories.filter(
            (sub) => sub.id !== deleteModal.id
          ),
        }))
      );
      setSuccessMessage("Subcategoría eliminada");
      setDeleteModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  function addFilter() {
    setSubcategoryForm((form) => ({
      ...form,
      filter_config: [
        ...form.filter_config,
        { key: "", label: "", type: "select" as FilterType, tempOptions: "" },
      ],
    }));
  }

  function removeFilter(index: number) {
    setSubcategoryForm((form) => ({
      ...form,
      filter_config: form.filter_config.filter((_, i) => i !== index),
    }));
  }

  function updateFilter(index: number, field: keyof EditingFilter, value: any) {
    setSubcategoryForm((form) => ({
      ...form,
      filter_config: form.filter_config.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      ),
    }));
  }

  const allSubcategories = categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({ ...sub, categoryName: cat.name }))
  );

  return (
    <div class={styles.manager}>
      {successMessage && (
        <div class={styles.successMessage}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMessage}
        </div>
      )}

      {error && (
        <div class={styles.errorMessage}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}
      <div class={styles.header}>
        <div class={styles.tabs}>
          <button
            class={`${styles.tab} ${
              activeTab === "categories" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("categories")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Categorías
            <span class={styles.badge}>{categories.length}</span>
          </button>
          <button
            class={`${styles.tab} ${
              activeTab === "subcategories" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("subcategories")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 3h7v7H3z" />
              <path d="M14 3h7v7h-7z" />
              <path d="M14 14h7v7h-7z" />
              <path d="M3 14h7v7H3z" />
            </svg>
            Subcategorías
            <span class={styles.badge}>{allSubcategories.length}</span>
          </button>
        </div>

        <button
          class={styles.addButton}
          onClick={() =>
            activeTab === "categories"
              ? openCategoryModal()
              : openSubcategoryModal()
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {activeTab === "categories"
            ? "Nueva Categoría"
            : "Nueva Subcategoría"}
        </button>
      </div>

      {activeTab === "categories" && (
        <div class={styles.grid}>
          {categories.map((category) => (
            <div key={category.id} class={styles.card}>
              <div class={styles.cardHeader}>
                <div class={styles.cardIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div class={styles.cardInfo}>
                  <h3 class={styles.cardTitle}>{category.name}</h3>
                  <span class={styles.cardSlug}>/{category.slug}</span>
                </div>
                <div class={styles.cardStats}>
                  <span class={styles.statNumber}>
                    {category.subcategories.length}
                  </span>
                  <span class={styles.statLabel}>subs</span>
                </div>
              </div>

              <div class={styles.cardActions}>
                <button
                  class={styles.editBtn}
                  onClick={() => openCategoryModal(category)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar
                </button>
                <button
                  class={styles.deleteBtn}
                  onClick={() =>
                    setDeleteModal({
                      show: true,
                      type: "category",
                      id: category.id,
                      name: category.name,
                    })
                  }
                  disabled={category.subcategories.length > 0}
                  title={
                    category.subcategories.length > 0
                      ? "Elimina las subcategorías primero"
                      : "Eliminar categoría"
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div class={styles.emptyState}>
              <p>No hay categorías. Crea la primera.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "subcategories" && (
        <div class={styles.table}>
          <div class={styles.tableHeader}>
            <span>Subcategoría</span>
            <span>Categoría</span>
            <span>Filtros</span>
            <span>Orden</span>
            <span></span>
          </div>
          {allSubcategories.map((sub) => (
            <div key={sub.id} class={styles.tableRow}>
              <div class={styles.subInfo}>
                <span class={styles.subName}>{sub.name}</span>
                <span class={styles.subSlug}>/{sub.slug}</span>
              </div>
              <span class={styles.categoryBadge}>{sub.categoryName}</span>
              <div class={styles.filtersBadges}>
                {sub.filter_config.length > 0 ? (
                  <>
                    <span class={styles.filterCount}>
                      {sub.filter_config.length} filtros
                    </span>
                    <div class={styles.filtersList}>
                      {sub.filter_config.map((f) => (
                        <span
                          key={f.key}
                          class={styles.filterChip}
                          title={`Tipo: ${f.type}`}
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span class={styles.noFilters}>Sin filtros</span>
                )}
              </div>
              <span class={styles.orderNum}>{sub.display_order}</span>
              <div class={styles.rowActions}>
                <button
                  class={styles.editBtn}
                  onClick={() => openSubcategoryModal(sub)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  class={styles.deleteBtn}
                  onClick={() =>
                    setDeleteModal({
                      show: true,
                      type: "subcategory",
                      id: sub.id,
                      name: sub.name,
                    })
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {allSubcategories.length === 0 && (
            <div class={styles.emptyState}>
              <p>No hay subcategorías. Crea la primera.</p>
            </div>
          )}
        </div>
      )}

      {showCategoryModal && (
        <div
          class={styles.modalOverlay}
          onClick={() => setShowCategoryModal(false)}
        >
          <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div class={styles.modalHeader}>
              <h2>
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <button
                class={styles.closeModal}
                onClick={() => setShowCategoryModal(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCategorySubmit}>
              <div class={styles.formGroup}>
                <label>Nombre *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onInput={(e) =>
                    setCategoryForm((f) => ({
                      ...f,
                      name: e.currentTarget.value,
                    }))
                  }
                  placeholder="Ej: Sillas de Oficina"
                  required
                />
              </div>

              <div class={styles.formGroup}>
                <label>Slug</label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onInput={(e) =>
                    setCategoryForm((f) => ({
                      ...f,
                      slug: e.currentTarget.value,
                    }))
                  }
                  placeholder={
                    generateSlug(categoryForm.name) ||
                    "se-genera-automaticamente"
                  }
                />
                <span class={styles.hint}>
                  Se genera automáticamente si lo dejas vacío
                </span>
              </div>

              <div class={styles.formGroup}>
                <label>URL de imagen (opcional)</label>
                <input
                  type="url"
                  value={categoryForm.image_url}
                  onInput={(e) =>
                    setCategoryForm((f) => ({
                      ...f,
                      image_url: e.currentTarget.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div class={styles.modalActions}>
                <button
                  type="button"
                  class={styles.cancelBtn}
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class={styles.submitBtn}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Guardando..."
                    : editingCategory
                    ? "Actualizar"
                    : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubcategoryModal && (
        <div
          class={styles.modalOverlay}
          onClick={() => setShowSubcategoryModal(false)}
        >
          <div
            class={`${styles.modal} ${styles.largeModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div class={styles.modalHeader}>
              <h2>
                {editingSubcategory
                  ? "Editar Subcategoría"
                  : "Nueva Subcategoría"}
              </h2>
              <button
                class={styles.closeModal}
                onClick={() => setShowSubcategoryModal(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubcategorySubmit}>
              <div class={styles.formRow}>
                <div class={styles.formGroup}>
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={subcategoryForm.name}
                    onInput={(e) =>
                      setSubcategoryForm((f) => ({
                        ...f,
                        name: e.currentTarget.value,
                      }))
                    }
                    placeholder="Ej: Sillas Ejecutivas"
                    required
                  />
                </div>

                <div class={styles.formGroup}>
                  <label>Slug</label>
                  <input
                    type="text"
                    value={subcategoryForm.slug}
                    onInput={(e) =>
                      setSubcategoryForm((f) => ({
                        ...f,
                        slug: e.currentTarget.value,
                      }))
                    }
                    placeholder={
                      generateSlug(subcategoryForm.name) || "automatico"
                    }
                  />
                </div>
              </div>

              <div class={styles.formRow}>
                <div class={styles.formGroup}>
                  <label>Categoría *</label>
                  <select
                    value={subcategoryForm.category_id}
                    onChange={(e) =>
                      setSubcategoryForm((f) => ({
                        ...f,
                        category_id: e.currentTarget.value,
                      }))
                    }
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div class={styles.formGroup}>
                  <label>Orden de visualización</label>
                  <input
                    type="number"
                    value={subcategoryForm.display_order}
                    onInput={(e) =>
                      setSubcategoryForm((f) => ({
                        ...f,
                        display_order: parseInt(e.currentTarget.value) || 0,
                      }))
                    }
                    min={0}
                  />
                </div>
              </div>

              <div class={styles.filtersSection}>
                <div class={styles.filtersSectionHeader}>
                  <h3>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Configuración de Filtros
                  </h3>
                  <p>
                    Define los atributos filtrables para los productos de esta
                    subcategoría
                  </p>
                </div>

                {subcategoryForm.filter_config.map((filter, index) => (
                  <div key={index} class={styles.filterItem}>
                    <div class={styles.filterRow}>
                      <div class={styles.formGroup}>
                        <label>Clave (key)</label>
                        <input
                          type="text"
                          value={filter.key}
                          onInput={(e) =>
                            updateFilter(index, "key", e.currentTarget.value)
                          }
                          placeholder="ej: size"
                          required
                        />
                      </div>

                      <div class={styles.formGroup}>
                        <label>Etiqueta visible</label>
                        <input
                          type="text"
                          value={filter.label}
                          onInput={(e) =>
                            updateFilter(index, "label", e.currentTarget.value)
                          }
                          placeholder="ej: Tamaño"
                          required
                        />
                      </div>

                      <div class={styles.formGroup}>
                        <label>Tipo</label>
                        <select
                          value={filter.type}
                          onChange={(e) =>
                            updateFilter(index, "type", e.currentTarget.value)
                          }
                        >
                          <option value="select">Selector único</option>
                          <option value="checkbox">Checkbox (múltiple)</option>
                          <option value="range">Rango numérico</option>
                          <option value="boolean">Sí/No</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        class={styles.removeFilterBtn}
                        onClick={() => removeFilter(index)}
                        title="Eliminar filtro"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {(filter.type === "select" ||
                      filter.type === "checkbox") && (
                      <div class={styles.filterOptions}>
                        <label>Opciones (separadas por coma)</label>
                        <input
                          type="text"
                          value={filter.tempOptions}
                          onInput={(e) =>
                            updateFilter(
                              index,
                              "tempOptions",
                              e.currentTarget.value
                            )
                          }
                          placeholder="ej: Pequeño, Mediano, Grande"
                        />
                      </div>
                    )}

                    {filter.type === "range" && (
                      <div class={styles.rangeOptions}>
                        <div class={styles.formGroup}>
                          <label>Mínimo</label>
                          <input
                            type="number"
                            value={filter.min}
                            onInput={(e) =>
                              updateFilter(
                                index,
                                "min",
                                parseFloat(e.currentTarget.value)
                              )
                            }
                          />
                        </div>
                        <div class={styles.formGroup}>
                          <label>Máximo</label>
                          <input
                            type="number"
                            value={filter.max}
                            onInput={(e) =>
                              updateFilter(
                                index,
                                "max",
                                parseFloat(e.currentTarget.value)
                              )
                            }
                          />
                        </div>
                        <div class={styles.formGroup}>
                          <label>Paso</label>
                          <input
                            type="number"
                            value={filter.step}
                            onInput={(e) =>
                              updateFilter(
                                index,
                                "step",
                                parseFloat(e.currentTarget.value)
                              )
                            }
                            step="any"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  class={styles.addFilterBtn}
                  onClick={addFilter}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Añadir filtro
                </button>
              </div>

              <div class={styles.modalActions}>
                <button
                  type="button"
                  class={styles.cancelBtn}
                  onClick={() => setShowSubcategoryModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class={styles.submitBtn}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Guardando..."
                    : editingSubcategory
                    ? "Actualizar"
                    : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && (
        <div class={styles.modalOverlay} onClick={() => setDeleteModal(null)}>
          <div
            class={styles.deleteModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div class={styles.deleteIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3>
              Eliminar{" "}
              {deleteModal.type === "category" ? "Categoría" : "Subcategoría"}
            </h3>
            <p>
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>{deleteModal.name}</strong>? Esta acción no se puede
              deshacer.
            </p>
            <div class={styles.modalActions}>
              <button
                class={styles.cancelBtn}
                onClick={() => setDeleteModal(null)}
              >
                Cancelar
              </button>
              <button
                class={styles.dangerBtn}
                onClick={
                  deleteModal.type === "category"
                    ? handleDeleteCategory
                    : handleDeleteSubcategory
                }
                disabled={isLoading}
              >
                {isLoading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
