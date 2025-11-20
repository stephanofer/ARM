import { useState } from "preact/hooks";
import { getFilteredProducts } from "@/lib/api";

export default function ProductGrid({ initialProducts, filterConfig, subcategorySlug }) {
  const [products, setProducts] = useState(initialProducts);
  const [activeFilters, setActiveFilters] = useState({});
  const [loading, setLoading] = useState(false); // Agregué estado de carga visual

  const handleFilterChange = async (key, value) => {
    setLoading(true);
    const newFilters = { ...activeFilters, [key]: value };
    if (value === "" || value === null) delete newFilters[key]; // Limpieza mejorada
    
    setActiveFilters(newFilters);

    // Nota: Asegúrate que getFilteredProducts maneje el cliente público
    const newProducts = await getFilteredProducts(subcategorySlug, newFilters);
    setProducts(newProducts || []); // Evita nulls
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      
      {/* SIDEBAR */}
      <aside style={{ minWidth: '200px' }}>
        {filterConfig.map(filter => (
          <div key={filter.key} style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 5px 0' }}>{filter.label}</h4>
            
            {/* CASO 1: SELECT (TAMAÑO, MATERIAL) */}
            {filter.type === 'select' && filter.options && (
              <select 
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                style={{ width: '100%', padding: '5px' }}
              >
                <option value="">Todos</option>
                {filter.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {/* CASO 2: BOOLEAN (ALMACENAJE) - Usamos un Checkbox o un Select Sí/No */}
            {filter.type === 'boolean' && (
               <select 
                 onChange={(e) => {
                    // Convertimos el string "true"/"false" a booleano real o string vacío
                    const val = e.target.value === "true" ? true : e.target.value === "false" ? false : "";
                    handleFilterChange(filter.key, val);
                 }}
                 style={{ width: '100%', padding: '5px' }}
               >
                 <option value="">Indiferente</option>
                 <option value="true">Sí</option>
                 <option value="false">No</option>
               </select>
            )}

          </div>
        ))}
      </aside>

      {/* GRID DE PRODUCTOS */}
      <main style={{ flex: 1, opacity: loading ? 0.5 : 1 }}>
        {products.map(p => (
          <div key={p.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
             <strong>{p.name}</strong> 
             <br/>
             {/* Usamos encadenamiento opcional ?. por seguridad */}
             <small>{filterConfig[0]?.key}: {p.attributes?.[filterConfig[0]?.key]}</small>
          </div>
        ))}
        {products.length === 0 && <p>No se encontraron productos.</p>}
      </main>
    </div>
  );
}