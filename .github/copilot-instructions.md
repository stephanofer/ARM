# ARM Codebase Instructions

## Project Overview
This is an **Astro 5** SSR application deployed to **Cloudflare Workers** with server-side rendering enabled. It's a Spanish-language business website with product catalogs, contact forms, and an admin section.

## Architecture & Key Concepts

### Deployment & Runtime
- **SSR Mode**: `output: 'server'` in `astro.config.mjs` - all pages are server-rendered
- **Cloudflare Adapter**: Uses `@astrojs/cloudflare` with Wrangler configuration
- **Node.js Compatibility**: Enabled via `nodejs_compat` flag in `wrangler.jsonc`
- Assets served through Cloudflare's `ASSETS` binding pointing to `./dist`

### Project Structure
- **Sections-based architecture**: Pages like `index.astro` compose multiple section components (e.g., `Hero.astro`, `FeaturedProducts.astro`)
- **Section organization**: Home page sections live in `src/sections/home/`, other page sections in respective folders
- **Two layouts**: `BaseLayout.astro` (main template with Navbar/Footer/Alert) and `CMSLayout.astro` (currently empty)
- **No islands yet**: `src/islands/` directory exists but is empty - interactive components will go here when needed

### Path Aliases
Use `@/*` to import from `src/` directory:
```typescript
import BaseLayout from "@/layouts/BaseLayout.astro";
import Hero from "@/sections/home/Hero.astro";
```

### Component Patterns
- **SectionContainer**: Wrapper component for page sections with optional `id` prop for anchoring
- **Alert component**: Globally displayed via BaseLayout (currently shows in all pages)
- **Minimal styling**: Components are mostly structural stubs - styles are minimal/commented out

## Development Workflow

### Commands
- `pnpm dev` - Start Astro dev server (SSR preview)
- `pnpm build` - Build for Cloudflare Workers
- `pnpm preview` - Preview production build locally
- Deploy with Wrangler (configured in `wrangler.jsonc`)

### Package Manager
**Always use `pnpm`** - enforced via `packageManager` field in `package.json`

## State Management
- **Nanostores** installed for state management (`nanostores` + `@nanostores/persistent`)
- Not yet used in codebase - stores will likely be for cart, user preferences, or admin state

## Styling Conventions
- **Global CSS**: `src/styles/global.css` imported in `MainHead.astro`
- **CSS custom properties**: Fluid typography scale with `clamp()` (`--fs-sm` through `--fs-xxxl`)
- **Font setup commented out**: Inter, Clash, Seven fonts referenced but not active
- **Scoped styles**: Component-specific styles in `<style>` blocks (often commented out)

## Content & Localization
- **Language**: All content is Spanish (`lang="es"` in BaseLayout)
- **Default metadata**: Pages set `title` and `description` props for SEO

## Middleware
Simple logging middleware in `src/middleware.ts` - logs all incoming requests with pathname

## Admin Section
- Basic admin route at `/admin` - currently just a placeholder heading
- No authentication implemented yet

## Key Pages
- `/` - Home (7-section composition)
- `/productos` - Products listing (stub)
- `/sobre-nosotros` - About us (exists but not examined)
- `/contacto` - Contact page (exists with section folder)
- `/404` - Custom error page

## What's NOT Here (Yet)
- No database integration
- No API routes (would go in `src/pages/api/`)
- No interactive islands (directory empty)
- No tests
- No environment variables configured
- No authentication system

## When Adding Features
- New page sections go in `src/sections/{page-name}/`
- Interactive components with client-side JS go in `src/islands/`
- Use `SectionContainer` for consistent section wrapping
- Follow SSR-first approach - minimize client JS unless needed
