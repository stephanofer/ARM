# AGENTS.md — ARM Codebase Guide

## Project Overview

Astro 5 SSR e-commerce catalog with Preact islands, Supabase backend, Nanostores state management, deployed on Vercel. Written in TypeScript (strict mode). Language in codebase/UI is Spanish.

## Build / Dev / Test Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build (run to verify changes)
pnpm preview      # Preview production build locally
```

- **Package manager**: pnpm (v10.12.1) — NEVER use npm or yarn
- **No test framework** is configured — no unit/integration tests exist
- **No linter/formatter** (ESLint, Prettier) is configured — follow existing code style manually
- **Type checking**: `pnpm astro check` (uses Astro's built-in TypeScript checker)
- After any change, run `pnpm build` to verify — the Astro build will catch type errors and broken imports

## Architecture

- **SSR by default** (`output: 'server'`), selective `export const prerender = true` on static pages
- **Preact** for interactive islands — NOT React (JSX configured with `jsxImportSource: "preact"`)
- **Supabase** for database, auth, and file storage (server-side only via `@supabase/ssr`)
- **Nanostores** for client-side state (`atom`, `computed`, `persistentMap`)
- **Vercel** adapter for deployment
- **No Tailwind** — plain CSS with scoped styles (Astro) and CSS Modules (Preact)
- **Client Router** enabled via `<ClientRouter />` from `astro:transitions`

## Path Alias

`@/*` maps to `./src/*` — always use this alias for imports:

```ts
import BaseLayout from "@/layouts/BaseLayout.astro";
import { $cart } from "@/stores/cart";
import type { Product } from "@/lib/data/types";
```

## Directory Structure

```
src/
├── assets/svg/          # SVG icons (PascalCase: Cart.svg)
├── components/          # Astro (.astro) + Preact islands (.tsx in folders)
│   ├── AddToCartButton/ # Folder-per-island: Component.tsx + component.module.css
│   ├── admin/           # Admin-specific Preact components
│   └── catalog/         # Catalog Preact components (filters, sort, cards)
├── const/               # Constants (nav.ts, links.ts)
├── layouts/             # BaseLayout.astro, CMSLayout.astro
├── lib/
│   ├── supabase.ts      # Server Supabase client factory
│   └── data/            # Data access layer (types.ts, products.ts, categories.ts, admin.ts)
├── pages/
│   ├── api/             # REST API endpoints (auth/, admin/, products.ts)
│   ├── admin/           # Admin pages
│   └── *.astro          # Public pages
├── sections/            # Page-specific section components (home/, contacto/, sobre-nosotros/)
├── stores/              # Nanostores (cart.ts, catalogStore.ts, filtersStore.ts, etc.)
├── styles/global.css    # CSS custom properties, fonts, global resets
├── config.ts            # App constants (PAGE_SIZE)
├── env.d.ts             # TypeScript env declarations + App.Locals
└── middleware.ts         # Auth guard for /admin routes
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Astro components | PascalCase | `Navbar.astro`, `SectionContainer.astro` |
| Preact components | PascalCase in folder | `CartItems/CartItems.tsx` |
| CSS Modules | Match component name | `CartItems.module.css` |
| Pages | kebab-case (Spanish URLs) | `sobre-nosotros.astro`, `[categorySlug].astro` |
| Lib/store/const files | camelCase | `filtersStore.ts`, `supabase.ts` |
| Sections | PascalCase in page folder | `sections/home/Hero.astro` |
| SVG assets | PascalCase | `Cart.svg`, `Facebook.svg` |
| Store variables | `$` prefix | `$cart`, `$cartCount`, `$filters` |
| Types/interfaces | PascalCase | `Product`, `Category`, `FilterState` |

## Import Ordering

Follow this order (observed convention, blank line between groups):

```ts
// 1. Astro/framework built-ins
import { defineMiddleware } from "astro:middleware";
// 2. External packages
import { useStore } from "@nanostores/preact";
// 3. Internal modules via @/ alias
import { $cart } from "@/stores/cart";
import type { Product } from "@/lib/data/types";
// 4. Relative imports (components in same feature folder)
import styles from "./Component.module.css";
```

- Use `import type { ... }` for type-only imports

## Component Patterns

### Astro Components

```astro
---
interface Props {
  title: string;
  description?: string;
}
const { title, description = "Default" } = Astro.props;
---
<div class="wrapper">{title}</div>
<style>
  .wrapper { /* scoped by default */ }
</style>
```

- Props: `interface Props` or `type Props` (both used)
- Styling: scoped `<style>` blocks with plain CSS
- Client-side JS: `<script>` with `document.addEventListener("astro:page-load", ...)`

### Preact Islands (.tsx)

```tsx
import { useState, useCallback } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { $cart } from "@/stores/cart";
import styles from "./MyComponent.module.css";

interface Props {
  productId: string;
  name: string;
}

export function MyComponent({ productId, name }: Props) {
  const cart = useStore($cart);
  return <div class={styles["my-component"]}>{name}</div>;
}
```

- **Named exports** (not default exports)
- CSS Modules with **bracket notation**: `styles["kebab-class-name"]`
- Use `class` attribute (NOT `className` — Preact supports both but this codebase uses `class`)
- Hooks from `preact/hooks`, NOT from `react`

### Client Directives

- `client:load` — components that must hydrate immediately (catalog shell, add-to-cart)
- `client:only="preact"` — components needing browser-only APIs (cart items using localStorage)
- Pass data to islands via props: `JSON.parse(JSON.stringify(data))` for serialization

## Supabase Patterns

- **Server-side only**: use `createSupabaseClient({ request, cookies: Astro.cookies })` from `@/lib/supabase`
- Data access through `src/lib/data/` functions that take `SupabaseClient` as first param
- **Environment variables**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (private, server-side)
- Public vars `PUBLIC_SUPABASE_*` declared but client-side Supabase usage is minimal

## Nanostores Patterns

```ts
import { atom, computed } from "nanostores";

interface MyState { items: string[]; loading: boolean; }

export const $myStore = atom<MyState>({ items: [], loading: false });

// Derived state
export const $itemCount = computed($myStore, (state) => state.items.length);

// Setter functions (immutable updates)
export function setLoading(loading: boolean) {
  $myStore.set({ ...$myStore.get(), loading });
}
```

- Use `$` prefix for all store atoms
- Export atom + individual setter functions (not classes)
- Cart uses `persistentMap` from `@nanostores/persistent`

## API Routes

```ts
import type { APIRoute } from "astro";
import { createSupabaseClient } from "@/lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseClient({ request, cookies });
  // ... logic
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

- Export named HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- Success: `{ success: true, ...data }`
- Error: `{ success: false, error: "message" }` with appropriate status code
- Admin routes must verify auth via `supabase.auth.getUser()`

## Error Handling

- **Lib/data layer**: `console.error()` + `throw new Error()`
- **API routes**: try/catch → return JSON error response with HTTP status (400, 401, 404, 500)
- **Pages**: redirect to 404 or parent route on missing data
- **Preact components**: `error` field in store state, dedicated `ErrorState` component

## Styling Guidelines

- **Global theme**: CSS custom properties in `src/styles/global.css`
- Color palette: warm tans/beiges (`--color-primary: #d2b48c`), dark text, light backgrounds
- Fonts: "Clash" (headings), "Inter" (body)
- Fluid typography with `clamp()` for responsive font sizes
- Responsive design via `@media` queries
- Admin pages use separate `--admin-*` CSS variables in CMSLayout

## Environment Variables

Defined in `.env` (see `.env.example`). NEVER commit `.env`:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — server-side only
- `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` — client-accessible

## Key Reminders

1. This is **Preact**, not React — import from `preact/hooks`, use `class` not `className`
2. Always use the `@/` path alias for cross-directory imports
3. Run `pnpm build` to verify changes — it catches type and import errors
4. Store atoms use `$` prefix convention (`$cart`, `$filters`)
5. CSS Modules use kebab-case class names accessed via bracket notation
6. All UI text and URLs are in **Spanish**
7. Pages are SSR by default — add `export const prerender = true` only for fully static pages
