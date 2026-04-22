# 🛒 Sistema de Carrito de Compras

## Resumen

El carrito es un sistema de estado global persistente usando **Nanostores** que permite agregar, modificar y eliminar productos. Se mantiene sincronizado entre componentes y persiste en `localStorage`.

---

## 🗂️ Arquitectura del Carrito

```
📦 CARRITO SYSTEM
├── 🗄️ ESTADO GLOBAL
│   └── src/stores/cart.ts           # Store principal + funciones
├── 🧩 COMPONENTES
│   ├── CartCounter/                 # Icono con badge de cantidad
│   ├── CartItems/                   # Lista de productos en carrito
│   ├── CartDrawer.astro            # Sidebar del carrito
│   ├── AddToCartButton/            # Botón agregar al carrito
│   └── PlaceOrderButton/           # Botón pedido WhatsApp
├── 📄 PÁGINAS
│   └── carrito.astro               # Página completa del carrito
└── 🎨 ESTILOS
    └── *.module.css                # CSS Modules para cada componente
```

---

## 🏪 Store Principal (`src/stores/cart.ts`)

### Estructura del Estado

```typescript
// Estado persiste como Record<productId, CartItem>
const $cart = persistentMap<Record<string, CartItem>>("cart:", {}, {
  encode: JSON.stringify,    // Serialización a localStorage
  decode: JSON.parse,        // Deserialización desde localStorage
});

// Ejemplo del estado interno:
{
  "45": {
    id: 45,
    name: "Mesa de Roble",
    slug: "mesa-de-roble", 
    price: 25000,
    stock: 5,
    brand: "ARM",
    category_id: 1,
    subcategory_id: 3,
    attributes: { material: "Roble", color: "Natural" },
    quantity: 2,              // 🔥 Propiedad del carrito
    image_url: "https://..."  // 🔥 URL de imagen principal
  },
  "67": { ... }
}
```

### Tipo CartItem

```typescript
interface CartItem extends Product {
  quantity: number;        // Cantidad seleccionada por el usuario
  image_url: string | null; // URL de imagen principal para mostrar
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number | null;
  stock: number;
  brand: string | null;
  category_id: number;
  subcategory_id: number;
  attributes: Record<string, any>;
  description: string | null;
  created_at: string;
}
```

---

## ⚡ Funciones del Store

### 1. `addToCart(product: CartItem)`
Agrega un producto o incrementa cantidad si ya existe.

```typescript
addToCart({
  id: 45,
  name: "Mesa de Roble",
  price: 25000,
  stock: 5,
  // ... otros campos de Product
  quantity: 3,                    // Cantidad a agregar
  image_url: "https://imagen.jpg" // Imagen para mostrar
});

// Si el producto YA EXISTE → quantity += 3
// Si es NUEVO → Se agrega con quantity: 3
```

### 2. `increaseQuantity(productId: string)`
Incrementa cantidad en 1.

```typescript
increaseQuantity("45"); // quantity: 2 → quantity: 3
```

### 3. `decreaseQuantity(productId: string)`
Decrementa cantidad (mínimo 1).

```typescript
decreaseQuantity("45"); // quantity: 3 → quantity: 2
// Si quantity === 1, no hace nada (no elimina)
```

### 4. `setQuantity(productId: string, quantity: number)`
Establece cantidad específica.

```typescript
setQuantity("45", 5); // quantity: cualquier_valor → quantity: 5
// Si quantity <= 0, no hace nada
```

### 5. `removeFromCart(productId: string)`
Elimina completamente un producto.

```typescript
removeFromCart("45"); // Producto 45 desaparece del carrito
```

### 6. `clearCart()`
Vacía todo el carrito.

```typescript
clearCart(); // {} carrito completamente vacío
```

### 7. `$cartCount` (computed)
Store computado que devuelve la cantidad total de items.

```typescript
// Si carrito tiene:
// { "45": { quantity: 2 }, "67": { quantity: 3 } }
// → $cartCount = 5
const totalItems = useStore($cartCount); // 5
```

---

## 🧩 Componentes

### 1. CartCounter (`CartCounter/CartCounter.tsx`)

**Propósito:** Icono de carrito con badge de cantidad en navbar.

```typescript
export function CartCounter() {
  const itemCount = useStore($cartCount); // Reactivo a cambios

  const handleClick = () => {
    // Abre CartDrawer
    document.querySelector(".cart-drawer-overlay").classList.add("active");
    document.body.style.overflow = "hidden"; // Previene scroll
  };

  return (
    <button onClick={handleClick}>
      <svg>/* Icono carrito */</svg>
      <span className="cart-badge">{itemCount}</span> {/* Badge rojo */}
    </button>
  );
}
```

**Estilos badge:**
```css
.cart-badge {
  position: absolute;
  top: 0; right: 0;
  background: #ff6b6b;      /* Rojo llamativo */
  color: white;
  font-size: 0.7rem;
  border-radius: 50%;       /* Círculo perfecto */
  width: 18px; height: 18px;
  border: 2px solid #ead9ca; /* Borde para contraste */
}
```

**Dónde se usa:**
- `Navbar.astro` con `client:only="preact"`

---

### 2. AddToCartButton (`AddToCartButton/AddToCartButton.tsx`)

**Propósito:** Botón para agregar producto desde página individual.

```typescript
interface AddToCartButtonProps {
  product: CartItem; // Producto ya con image_url preparado
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const handleAddToCart = () => {
    // 1. Obtener cantidad del input quantity (DOM query)
    const quantityInput = document.querySelector('#quantity') as HTMLInputElement;
    const quantity = parseInt(quantityInput?.value || "1");
    
    // 2. Validar cantidad
    const validQuantity = isNaN(quantity) || quantity < 1 ? 1 : quantity;
    
    // 3. Agregar al carrito
    addToCart({
      ...product,
      quantity: validQuantity,
    });
  };

  const inStock = product.stock > 0;

  return (
    <button 
      disabled={!inStock}
      onClick={handleAddToCart}
    >
      <svg>/* Icono carrito */</svg>
      <span>{inStock ? "Agregar al carrito" : "No disponible"}</span>
    </button>
  );
}
```

**Características:**
- **Disabled** si `stock === 0`
- **Busca quantity** en input con `id="quantity"`
- **Efecto hover** con ondas CSS
- **Accesible** con `aria-label`

**Dónde se usa:**
- Página del producto (`/producto/[slug]`)

---

### 3. CartItems (`CartItems/CartItems.tsx`)

**Propósito:** Lista completa de productos en el carrito con controles.

```typescript
export function CartItems() {
  const cartItems = Object.values(useStore($cart)); // Array de CartItem[]

  return (
    <>
      {cartItems.length > 0 ? (
        <div className="cart-items-list">
          {cartItems.map((item, index) => (
            <div 
              key={item.id} 
              className="cart-item"
              style={{ animationDelay: `${0.05 + index * 0.05}s` }} // Animación escalonada
            >
              {/* 📸 IMAGEN */}
              <div className="cart-item-image">
                <img src={item.image_url || ""} alt={item.name} />
              </div>

              {/* 📝 DETALLES */}
              <div className="cart-item-details">
                <h3>{item.name}</h3>
                <div className="cart-item-meta">
                  <span>{item.brand || ""}</span>
                </div>

                {/* 🎛️ CONTROLES */}
                <div className="cart-item-actions">
                  <div className="quantity-controls">
                    <button onClick={() => decreaseQuantity(String(item.id))}>-</button>
                    <input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.currentTarget.value);
                        setQuantity(item.id, value > 0 ? value : 1);
                      }}
                    />
                    <button onClick={() => increaseQuantity(item.id)}>+</button>
                  </div>
                  
                  <button onClick={() => removeFromCart(item.id)}>
                    <svg>/* Icono basura */</svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-cart">
          <svg>/* Carrito vacío */</svg>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos para comenzar tu pedido</p>
          <a href="/categorias">Explorar productos</a>
        </div>
      )}
    </>
  );
}
```

**Funcionalidades:**
- **Lista reactiva** que se actualiza automáticamente
- **Input numérico** editable para cantidad
- **Animación de entrada** con delay escalonado
- **Estado vacío** con link a catálogo
- **Eliminar individual** por producto
- **Validación** de cantidad mínima 1

**Controles de cantidad:**
```css
.quantity-controls {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
}

.qty-btn {
  padding: 0.25rem;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
}

.quantity-display {
  width: 32px;
  text-align: center;
  border: none;
  background: transparent;
  appearance: textfield; /* Oculta flechas del input number */
}
```

**Dónde se usa:**
- `CartDrawer.astro` (sidebar)
- `/carrito` página completa

---

### 4. CartDrawer (`CartDrawer.astro`)

**Propósito:** Sidebar que se abre desde el icono del carrito.

```astro
<div class="cart-drawer-overlay" id="cartDrawerOverlay">
  <aside class="cart-drawer">
    <!-- HEADER -->
    <div class="cart-drawer-header">
      <h2>Tu carrito</h2>
      <button id="closeCartButton">❌</button>
    </div>

    <!-- CONTENIDO -->
    <div class="cart-drawer-content">
      <CartItems client:only="preact" />
    </div>

    <!-- FOOTER -->
    <div class="cart-drawer-footer">
      <div class="cart-summary">
        <div class="summary-row">
          <span>Total de artículos</span>
          <span class="summary-value">0 productos</span> {/* Actualizado por JS */}
        </div>
        <p>Los detalles del pedido se confirmarán en el siguiente paso</p>
      </div>
      
      <div class="cart-actions">
        <a href="/carrito">Ver carrito completo</a>
        <PlaceOrderButton client:only="preact" />
      </div>
    </div>
  </aside>
</div>
```

**Comportamiento:**
```javascript
// Se abre desde CartCounter
function openDrawer() {
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Se cierra con X, ESC o click outside
function closeDrawer() {
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

// Actualización reactiva del contador
$cartCount.subscribe((count) => {
  summaryValue.textContent = `${count} productos`;
});
```

**Estilos de transición:**
```css
.cart-drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0);
  backdrop-filter: blur(0px);
  opacity: 0; visibility: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.cart-drawer-overlay.active {
  opacity: 1; visibility: visible;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
}

.cart-drawer {
  position: fixed; top: 0; right: 0;
  width: 90%; max-width: 480px;
  height: 100%;
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.cart-drawer-overlay.active .cart-drawer {
  transform: translateX(0);
}
```

---

### 5. PlaceOrderButton (`PlaceOrderButton/PlaceOrderButton.tsx`)

**Propósito:** Envía pedido por WhatsApp con productos del carrito.

```typescript
export const PlaceOrderButton = () => {
  const cartItems = useStore($cart);
  const phone = "51981314610";

  const handleClick = () => {
    const items = Object.values(cartItems || {});
    
    // Formatear mensaje de WhatsApp
    let message = `Hola, quiero hacer un pedido:%0A%0A`;
    items.forEach((item, i) => {
      message += `${i + 1}. ${item.name} - Cantidad: ${item.quantity}%0A`;
    });

    // Abrir WhatsApp
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, "_blank");
  };

  return (
    <button 
      onClick={handleClick}
      disabled={Object.keys(cartItems).length === 0} // Disabled si carrito vacío
    >
      <span>Realizar pedido por WhatsApp</span>
      <svg>/* WhatsApp icon */</svg>
    </button>
  );
};
```

**Formato del mensaje:**
```
Hola, quiero hacer un pedido:

1. Mesa de Roble - Cantidad: 2
2. Silla Moderna - Cantidad: 4
```

---

## 📄 Página Carrito (`/carrito`)

**Propósito:** Vista completa del carrito con layout de escritorio.

```astro
<div class="cart-container">
  <!-- COLUMNA IZQUIERDA: Lista de productos -->
  <div class="cart-items-section">
    <div class="cart-header">
      <h1>Carrito</h1>
    </div>
    <CartItems client:only="preact" />
  </div>

  <!-- COLUMNA DERECHA: Resumen y acciones -->
  <aside class="cart-summary">
    <div class="summary-row">
      <span>Total de artículos</span>
      <span class="summary-value">0 productos</span>
    </div>
    
    <div class="summary-info">
      <p>Los detalles del pedido se confirmarán en el siguiente paso</p>
    </div>

    <PlaceOrderButton client:only="preact" />
    <button class="continue-shopping-btn">Continuar comprando</button>
  </aside>
</div>
```

**Layout responsive:**
```css
.cart-container {
  display: grid;
  grid-template-columns: 1fr 420px; /* Desktop: 2 columnas */
  gap: 3rem;
}

@media (max-width: 1024px) {
  .cart-container {
    grid-template-columns: 1fr; /* Mobile: 1 columna */
  }
}
```

---

## 🖼️ Manejo de Imágenes

### Origen de `image_url`

```typescript
// En páginas del producto:
const primaryImage = galleryAssets.find(a => a.is_primary) || galleryAssets[0];

const cartItem: CartItem = {
  ...product,
  quantity: 1,
  image_url: primaryImage?.public_url || null, // 🔥 URL de imagen principal
};
```

### Renderizado en CartItems

```tsx
<div className="cart-item-image">
  <img 
    src={item.image_url || ""} 
    alt={item.name}
    onError={(e) => {
      // Fallback si imagen falla
      e.currentTarget.src = "/placeholder-image.jpg";
    }}
  />
</div>
```

### CSS de imagen

```css
.cart-item-image {
  width: 100px; height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: white; /* Fondo mientras carga */
  flex-shrink: 0;    /* No se comprime */
}

.cart-item-image img {
  width: 100%; height: 100%;
  object-fit: cover; /* Mantiene proporción, recorta si es necesario */
}
```

---

## 🔧 Flujo Completo de Uso

### 1. Agregar Producto

```
Usuario en /producto/mesa-roble
↓
Selecciona cantidad: 3
↓
Click "Agregar al carrito"
↓
AddToCartButton ejecuta addToCart()
↓
Store actualiza: { "45": { ...product, quantity: 3, image_url: "..." } }
↓
CartCounter badge actualiza: 3
```

### 2. Ver Carrito

```
Click en CartCounter
↓
CartDrawer se abre (sidebar)
↓
CartItems renderiza lista
↓
Imagen desde image_url
↓
Controles de cantidad visibles
```

### 3. Modificar Cantidad

```
Usuario cambia input de 3 → 5
↓
CartItems ejecuta setQuantity("45", 5)
↓
Store actualiza quantity
↓
CartCounter badge: 3 → 5
↓
Resumen: "5 productos"
```

### 4. Realizar Pedido

```
Click "Realizar pedido por WhatsApp"
↓
PlaceOrderButton formatea mensaje
↓
Abre WhatsApp con texto:
"1. Mesa de Roble - Cantidad: 5"
```

---

## 🚀 Cómo Extender el Carrito

### Agregar Nueva Propiedad al CartItem

```typescript
// 1. Extender el tipo en types.ts
interface CartItem extends Product {
  quantity: number;
  image_url: string | null;
  selected_variant?: string;     // 🆕 Nueva propiedad
  gift_message?: string;         // 🆕 Mensaje de regalo
  delivery_date?: string;        // 🆕 Fecha de entrega
}
```

```typescript
// 2. Actualizar AddToCartButton
const handleAddToCart = () => {
  const variant = document.querySelector('#variant')?.value;
  const giftMessage = document.querySelector('#gift-message')?.value;
  
  addToCart({
    ...product,
    quantity: validQuantity,
    selected_variant: variant,    // 🆕 
    gift_message: giftMessage,    // 🆕
  });
};
```

```tsx
// 3. Mostrar en CartItems
<div className="cart-item-details">
  <h3>{item.name}</h3>
  {item.selected_variant && (
    <p className="variant-info">Variante: {item.selected_variant}</p>
  )}
  {item.gift_message && (
    <p className="gift-info">🎁 {item.gift_message}</p>
  )}
  <div className="cart-item-meta">...</div>
</div>
```

```typescript
// 4. Incluir en mensaje de WhatsApp
const handleClick = () => {
  let message = `Hola, quiero hacer un pedido:%0A%0A`;
  items.forEach((item, i) => {
    message += `${i + 1}. ${item.name}`;
    if (item.selected_variant) {
      message += ` (${item.selected_variant})`;
    }
    message += ` - Cantidad: ${item.quantity}`;
    if (item.gift_message) {
      message += `%0A   🎁 ${item.gift_message}`;
    }
    message += `%0A`;
  });
};
```

### Agregar Nuevas Funciones al Store

```typescript
// src/stores/cart.ts

export function updateCartItemProperty<K extends keyof CartItem>(
  productId: string, 
  key: K, 
  value: CartItem[K]
) {
  const currentCart = $cart.get();
  if (currentCart[productId]) {
    $cart.setKey(productId, {
      ...currentCart[productId],
      [key]: value,
    });
  }
}

// Uso:
updateCartItemProperty("45", "selected_variant", "Roble Claro");
updateCartItemProperty("45", "gift_message", "Para mamá ❤️");
```

### Persistir Configuración Adicional

```typescript
// Store para configuración del carrito
export const $cartSettings = persistentMap("cart-settings:", {
  delivery_method: "pickup",      // "pickup" | "delivery"
  delivery_address: "",
  preferred_contact: "whatsapp",  // "whatsapp" | "email" | "phone"
});

export function setDeliveryMethod(method: "pickup" | "delivery") {
  $cartSettings.setKey("delivery_method", method);
}
```

---

## 🐛 Debugging y Troubleshooting

### Ver Estado del Carrito en Console

```javascript
// En DevTools Console:
import { $cart, $cartCount } from '/src/stores/cart.ts';

console.log("Estado actual:", $cart.get());
console.log("Cantidad total:", $cartCount.get());

// Limpiar carrito para testing:
$cart.set({});
```

### localStorage Manual

```javascript
// Ver en DevTools → Application → localStorage:
localStorage.getItem("cart:");

// Limpiar manualmente:
localStorage.removeItem("cart:");
```

### Errores Comunes

1. **"Cannot read property 'quantity' of undefined"**
   - El producto no existe en el carrito
   - Validar con `currentCart[productId]` antes de usar

2. **"Image not loading"**
   - `image_url` es null o inválida
   - Agregar imagen de fallback

3. **"Store not reactive"**
   - Usar `useStore($cart)` en componentes Preact
   - Asegurar `client:only="preact"` en Astro

4. **"Quantity resets to 1"**
   - Validación en `setQuantity` rechaza values <= 0
   - Usar `Math.max(1, value)` para garantizar mínimo

---

## 📊 Métricas y Analytics

Para trackear uso del carrito:

```typescript
// store/cart.ts
export function addToCart(product: CartItem) {
  // ... lógica existente
  
  // Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'add_to_cart', {
      currency: 'ARS',
      value: product.price * product.quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        category: product.category_id,
        quantity: product.quantity,
        price: product.price
      }]
    });
  }
}
```

El carrito está completamente preparado para e-commerce y es fácilmente extensible para nuevas funcionalidades! 🚀