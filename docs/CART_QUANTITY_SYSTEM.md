# Sistema de Cantidades del Carrito

## Descripción General

Sistema centralizado para manejar las cantidades de productos en el carrito de compras. Implementa validación automática, límites configurables y una experiencia de usuario consistente en toda la aplicación.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         cart.ts (Store)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Constantes: MIN_QUANTITY, MAX_QUANTITY, DEFAULT_QUANTITY │  │
│  │  Función:    clampQuantity(value) → número válido         │  │
│  │  Acciones:   addToCart, setQuantity, increase, decrease   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │ ProductCard │    │ CartItems   │    │ AddToCart   │
    │             │    │             │    │ Section     │
    │ Solo botón  │    │ Input +     │    │             │
    │ (qty = 1)   │    │ store       │    │ Quantity    │
    │             │    │             │    │ Selector +  │
    └─────────────┘    └─────────────┘    │ Button      │
                                          └─────────────┘
```

---

## Componentes

### 1. Store: `cart.ts`

**Ubicación:** `src/stores/cart.ts`

#### Constantes

```typescript
export const MIN_QUANTITY = 1;   // Mínimo permitido
export const MAX_QUANTITY = 99;  // Máximo permitido
export const DEFAULT_QUANTITY = 1;
```

#### Función de Validación

```typescript
export function clampQuantity(value: number): number {
  if (isNaN(value) || value < MIN_QUANTITY) return MIN_QUANTITY;
  if (value > MAX_QUANTITY) return MAX_QUANTITY;
  return Math.floor(value);
}
```

**Comportamiento:**
- Valores inválidos (NaN, negativos) → retorna `MIN_QUANTITY`
- Valores mayores a 99 → retorna `MAX_QUANTITY`
- Decimales → se redondean hacia abajo

#### Acciones del Carrito

| Función | Descripción |
|---------|-------------|
| `addToCart(product, quantity)` | Agrega producto. Si existe, **suma** la cantidad |
| `setQuantity(productId, quantity)` | Establece cantidad exacta (con validación) |
| `increaseQuantity(productId)` | Incrementa en 1 (respeta máximo) |
| `decreaseQuantity(productId)` | Decrementa en 1 (respeta mínimo) |
| `removeFromCart(productId)` | Elimina producto del carrito |
| `clearCart()` | Vacía el carrito completamente |

---

### 2. Componente: `QuantitySelector`

**Ubicación:** `src/components/QuantitySelector/`

**Propósito:** Selector de cantidad con estado local. Para elegir cuántas unidades agregar **antes** de añadir al carrito.

```tsx
interface QuantitySelectorProps {
  initialValue?: number;              // Valor inicial (default: 1)
  onChange?: (quantity: number) => void;  // Callback al cambiar
  className?: string;                 // Clase CSS adicional
}
```

**Características:**
- ✅ Botones +/- con estado disabled en límites
- ✅ Input editable con validación en tiempo real
- ✅ Corrección automática al exceder máximo
- ✅ Validación al perder foco (blur)

**Uso típico:**
```tsx
const [quantity, setQuantity] = useState(1);

<QuantitySelector 
  initialValue={1}
  onChange={setQuantity}
/>
```

---

### 3. Componente: `AddToCartSection`

**Ubicación:** `src/components/AddToCartSection/`

**Propósito:** Wrapper que combina `QuantitySelector` + `AddToCartButton` para la página de producto.

```tsx
interface AddToCartSectionProps {
  product: CartItemData;  // Datos del producto (sin quantity)
}
```

**Flujo:**
1. Usuario ajusta cantidad con `QuantitySelector`
2. Estado `quantity` se guarda localmente
3. Al hacer clic en el botón, se llama `addToCart(product, quantity)`

---

### 4. Componente: `AddToCartButton`

**Ubicación:** `src/components/AddToCartButton/`

**Propósito:** Botón que agrega productos al carrito.

```tsx
interface AddToCartButtonProps {
  product: CartItemData;      // Datos del producto
  quantity?: number;          // Cantidad a agregar (default: 1)
  onAddToCart?: () => void;   // Callback post-agregar
  label?: string;             // Texto del botón
  iconOnly?: boolean;         // Solo mostrar icono
  className?: string;         // Clase CSS adicional
}
```

**Casos de uso:**

| Contexto | Configuración |
|----------|---------------|
| ProductCard (listado) | `quantity` no se pasa → usa 1 |
| AddToCartSection | `quantity` viene del QuantitySelector |

---

### 5. Componente: `CartItems`

**Ubicación:** `src/components/CartItems/`

**Propósito:** Lista de productos en el carrito con controles de cantidad.

**Diferencia clave:** El estado viene directamente del store (`$cart`), no es local.

**Flujo:**
- El valor del input es `item.quantity` (del store)
- Cada cambio llama `setQuantity()` directamente
- No usa `QuantitySelector` porque el estado ya existe en el store

---

## Validación de Input

La validación es idéntica en `QuantitySelector` y `CartItems`:

### En tiempo real (`onInput`)

```typescript
onInput={(e) => {
  const value = parseInt(target.value, 10);
  
  // Si excede el máximo, corregir inmediatamente
  if (value > MAX_QUANTITY) {
    target.value = MAX_QUANTITY.toString();
    updateQuantity(MAX_QUANTITY);
    return;
  }
  
  // Si es válido, actualizar
  if (!isNaN(value) && value >= MIN_QUANTITY) {
    updateQuantity(value);
  }
}}
```

### Al perder foco (`onBlur`)

```typescript
onBlur={(e) => {
  const value = parseInt(target.value, 10);
  const validValue = clampQuantity(value);
  target.value = validValue.toString();
  updateQuantity(validValue);
}}
```

**Comportamiento UX:**
- Usuario escribe "150" → se corrige a "99" inmediatamente
- Usuario borra todo y hace blur → se corrige a "1"
- Usuario escribe "0" y hace blur → se corrige a "1"

---

## Diagrama de Flujo: Agregar al Carrito

### Desde ProductCard (listado de productos)

```
[Click en botón "Agregar"]
         │
         ▼
   addToCart(product, 1)  ← quantity default = 1
         │
         ▼
   ¿Producto existe en carrito?
         │
    ┌────┴────┐
    │ Sí      │ No
    ▼         ▼
  Sumar 1   Crear entrada
  a qty     con qty = 1
```

### Desde Página de Producto

```
[Usuario ajusta cantidad a 5]
         │
         ▼
   QuantitySelector.onChange(5)
         │
         ▼
   Estado local: quantity = 5
         │
[Click en botón "Agregar"]
         │
         ▼
   addToCart(product, 5)
         │
         ▼
   ¿Producto existe?
         │
    ┌────┴────┐
    │ Sí      │ No
    ▼         ▼
  qty += 5  qty = 5
  (max 99)
```

---

## Estilos CSS

### QuantitySelector.module.css
- Diseño horizontal con bordes unificados
- Botones de 40x40px
- Input centrado con bordes laterales

### CartItems (quantity-controls)
- Diseño más compacto para el drawer
- Mismo patrón visual pero adaptado al espacio reducido
- Input de 32px de ancho

Ambos ocultan las flechas nativas del `input[type="number"]`:

```css
.quantityInput::-webkit-outer-spin-button,
.quantityInput::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.quantityInput {
  -moz-appearance: textfield;
}
```

---

## Configuración

Para cambiar los límites de cantidad, solo modifica las constantes en `cart.ts`:

```typescript
// src/stores/cart.ts
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;  // Cambiar aquí para otro límite
```

Todos los componentes importan estas constantes, por lo que el cambio se propaga automáticamente.

---

## Tipos TypeScript

```typescript
// Producto completo del carrito
interface CartItem {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  quantity: number;
  image_url: string | null;
}

// Para agregar al carrito (sin quantity)
type CartItemData = Omit<CartItem, "quantity">;
```

---

## Resumen de Archivos

| Archivo | Propósito |
|---------|-----------|
| `src/stores/cart.ts` | Store + constantes + lógica de validación |
| `src/components/QuantitySelector/` | Selector con estado local |
| `src/components/AddToCartSection/` | Wrapper para página de producto |
| `src/components/AddToCartButton/` | Botón de agregar |
| `src/components/CartItems/` | Lista del carrito con edición |
| `src/components/catalog/ProductCard.tsx` | Card de producto (usa solo el botón) |
