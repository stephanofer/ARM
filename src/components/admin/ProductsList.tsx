import { useState } from "preact/hooks";
import styles from "./ProductsList.module.css";

interface Product {
  id: number;
  name: string;
  slug: string;
  category_name: string;
  subcategory_name: string | null;
  stock: number;
  thumbnail_url: string | null;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}

interface ProductsListProps {
  products: Product[];
  categories: Category[];
  total: number;
  totalPages: number;
  currentPage: number;
  search: string;
  categoryId?: number;
  basePath?: string;
}

function buildUrlStatic(
  basePath: string,
  currentSearch: string,
  currentCategory: string | undefined,
  params: { page?: number; search?: string; category?: string }
) {
  const searchParams = new URLSearchParams();

  const page = params.page !== undefined ? params.page : 1;
  const search = params.search !== undefined ? params.search : currentSearch;
  const category =
    params.category !== undefined ? params.category : currentCategory;

  if (page > 1) {
    searchParams.set("page", page.toString());
  }
  if (search) {
    searchParams.set("search", search);
  }
  if (category) {
    searchParams.set("category", category);
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export default function ProductsList({
  products: initialProducts,
  categories,
  total,
  totalPages,
  currentPage,
  search: initialSearch,
  categoryId: initialCategoryId,
  basePath = "/admin/productos",
}: ProductsListProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(
    initialCategoryId?.toString() || ""
  );
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set()
  );
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: number | null;
    name: string;
  }>({
    open: false,
    id: null,
    name: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  function buildUrl(params: {
    page?: number;
    search?: string;
    category?: string;
  }) {
    return buildUrlStatic(
      basePath,
      initialSearch,
      initialCategoryId?.toString(),
      params
    );
  }

  function handleSearch(e: Event) {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = buildUrl({
        page: 1,
        search,
        category: categoryId,
      });
    }
  }

  function clearSearch() {
    setSearch("");
    if (typeof window !== "undefined") {
      window.location.href = buildUrl({
        page: 1,
        search: "",
        category: categoryId,
      });
    }
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value);
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  }

  function toggleProduct(id: number) {
    const newSet = new Set(selectedProducts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedProducts(newSet);
  }

  function openDeleteModal(id: number, name: string) {
    setDeleteModal({ open: true, id, name });
  }

  function closeDeleteModal() {
    setDeleteModal({ open: false, id: null, name: "" });
  }

  async function confirmDelete() {
    if (!deleteModal.id) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/products/${deleteModal.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== deleteModal.id));
        closeDeleteModal();

        if (products.length === 1 && typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        alert(result.error || "Error al eliminar el producto");
      }
    } catch (error) {
      console.error(error);
      alert("Error inesperado al eliminar el producto");
    } finally {
      setIsDeleting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div class={styles.productsPage}>
      <header class={styles.pageHeader}>
        <div class={styles.headerContent}>
          <h1 class={styles.pageTitle}>Productos</h1>
          <p class={styles.pageSubtitle}>
            {total} {total === 1 ? "producto" : "productos"} en total
          </p>
        </div>
        <a href="/admin/productos/nuevo" class={styles.primaryBtn}>
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
          Nuevo Producto
        </a>
      </header>

      <div class={styles.filtersBar}>
        <form class={styles.searchForm} onSubmit={handleSearch}>
          <div class={styles.searchInputWrapper}>
            <svg
              class={styles.searchIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              class={styles.searchInput}
              placeholder="Buscar por nombre, slug o marca..."
              value={search}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
            {search && (
              <button
                type="button"
                class={styles.clearSearch}
                onClick={clearSearch}
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
            )}
          </div>
          <select
            class={styles.filterSelect}
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.currentTarget.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button type="submit" class={styles.filterBtn}>
            Filtrar
          </button>
        </form>
      </div>

      {products.length > 0 ? (
        <div class={styles.tableContainer}>
          <table class={styles.productsTable}>
            <thead>
              <tr>
                <th class={styles.thCheckbox}>
                  <input
                    type="checkbox"
                    checked={
                      selectedProducts.size === products.length &&
                      products.length > 0
                    }
                    onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
                  />
                </th>
                <th class={styles.thProduct}>Producto</th>
                <th>Categoría</th>
                <th class={styles.hideTablet}>Subcategoría</th>
                <th class={styles.hideTablet}>Stock</th>
                <th class={styles.hideMobile}>Creado</th>
                <th class={styles.thActions}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td class={styles.tdCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                  </td>
                  <td class={styles.tdProduct}>
                    <div class={styles.productCell}>
                      <div class={styles.productThumb}>
                        {product.thumbnail_url ? (
                          <img
                            src={product.thumbnail_url}
                            alt={product.name}
                            loading="lazy"
                          />
                        ) : (
                          <div class={styles.noImage}>
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                              />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div class={styles.productInfo}>
                        <a
                          href={`/admin/productos/${product.slug}`}
                          class={styles.productName}
                        >
                          {product.name}
                        </a>
                        <span class={styles.productSlug}>/{product.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class={styles.categoryBadge}>
                      {product.category_name}
                    </span>
                  </td>
                  <td class={styles.hideTablet}>
                    <span class={styles.subcategoryText}>
                      {product.subcategory_name || "—"}
                    </span>
                  </td>
                  <td class={styles.hideTablet}>
                    <span
                      class={`${styles.stockBadge} ${
                        product.stock > 0 ? styles.inStock : styles.outOfStock
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td class={styles.hideMobile}>
                    <span class={styles.dateText}>
                      {formatDate(product.created_at)}
                    </span>
                  </td>
                  <td class={styles.tdActions}>
                    <div class={styles.actionsMenu}>
                      <a
                        href={`/admin/productos/${product.slug}`}
                        class={styles.actionBtn}
                        title="Editar"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </a>
                      <a
                        href={`/producto/${product.slug}`}
                        class={styles.actionBtn}
                        target="_blank"
                        title="Ver en sitio"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                      <button
                        class={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() =>
                          openDeleteModal(product.id, product.name)
                        }
                        title="Eliminar"
                      >
                        <svg
                          width="16"
                          height="16"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div class={styles.emptyState}>
          <div class={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              {search ? (
                <>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </>
              ) : (
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              )}
            </svg>
          </div>
          <h3>{search ? "Sin resultados" : "No hay productos"}</h3>
          <p>
            {search
              ? `No se encontraron productos para "${search}"`
              : "Comienza agregando tu primer producto al catálogo"}
          </p>
          {search ? (
            <a href="/admin/productos" class={styles.secondaryBtn}>
              Ver todos los productos
            </a>
          ) : (
            <a href="/admin/productos/nuevo" class={styles.primaryBtn}>
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
              Crear Producto
            </a>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <nav class={styles.pagination} aria-label="Paginación de productos">
          <a
            href={
              currentPage > 1
                ? buildUrl({
                    page: currentPage - 1,
                    search: initialSearch,
                    category: initialCategoryId?.toString(),
                  })
                : "#"
            }
            class={`${styles.paginationBtn} ${
              currentPage <= 1 ? styles.disabled : ""
            }`}
            aria-disabled={currentPage <= 1}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Anterior
          </a>

          <div class={styles.paginationInfo}>
            Página {currentPage} de {totalPages}
          </div>

          <a
            href={
              currentPage < totalPages
                ? buildUrl({
                    page: currentPage + 1,
                    search: initialSearch,
                    category: initialCategoryId?.toString(),
                  })
                : "#"
            }
            class={`${styles.paginationBtn} ${
              currentPage >= totalPages ? styles.disabled : ""
            }`}
            aria-disabled={currentPage >= totalPages}
          >
            Siguiente
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </nav>
      )}

      {deleteModal.open && (
        <div
          class={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}
        >
          <div class={styles.modal}>
            <div class={`${styles.modalIcon} ${styles.danger}`}>
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
            <h3 class={styles.modalTitle}>Eliminar producto</h3>
            <p class={styles.modalMessage}>
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>{deleteModal.name}</strong>? Esta acción no se puede
              deshacer y se eliminarán todas las imágenes asociadas.
            </p>
            <div class={styles.modalActions}>
              <button class={styles.secondaryBtn} onClick={closeDeleteModal}>
                Cancelar
              </button>
              <button
                class={styles.dangerBtn}
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
