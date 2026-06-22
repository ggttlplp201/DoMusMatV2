# DoMusMat BIM Catalogue

A B2B digital BIM library for [domusmat.pt](https://domusmat.pt) — a revamp built around the idea that *designers spec products and the buy order auto-generates from the design*.

Stack: **Next.js 16 App Router · TypeScript · Tailwind v4 · Vitest · GSAP**  
Node 18+ required.

---

## Quick start

```bash
npm install
npm run dev       # http://localhost:3000
npm run test      # vitest run (unit + integration)
npm run build     # production build
```

---

## What it is

A front-end-only catalogue with 47 products across 8 categories (LED lighting, flooring, skirting boards, carpentry, drainage, doors, metalwork, mirrors). No backend in Phase 1 — all client state lives in `localStorage`.

### Data backbone

`data/product_data.json` is the single source of truth, read through a typed `ProductRepository` interface (`lib/repository.ts`). The current implementation is `JsonProductRepository`; Phase 2 swaps it for `SupabaseProductRepository` without touching any component.

Product records carry `"PLACEHOLDER"` strings in fields that have not been published yet. `lib/placeholder.ts` exposes `isPlaceholder()` / `hasRealValue()` / `resolvePlaceholder()`. UI components use these helpers so that features activate automatically once real data is present — no code change required.

Human-readable Portuguese fallbacks (e.g. `"Preço sob consulta"`, `"Disponível a pedido"`) live in `lib/strings.ts → fallbacks`.

### Client state

| Store | Key | Backed by |
|---|---|---|
| Cart / quote | `cart` | `localStorage` via `state/cart.tsx` |
| Saved lists | `lists` | `localStorage` via `state/lists.tsx` |
| Comparison set | `compare` | `localStorage` via `state/compare.tsx` |
| Analytics | `dmm.analytics` | `localStorage` via `lib/analytics.ts` |

Analytics records `view`, `add_to_bom`, `add_to_quote`, and `download` events locally. Phase 2 swaps `LocalAnalyticsSink` for `SupabaseAnalyticsSink` (same interface).

---

## Routes

| Path | Description |
|---|---|
| `/` | Catalogue grid |
| `/products/[id]` | Product detail |
| `/compare` | Side-by-side comparison |
| `/cart` | Quote / order basket |
| `/lists` | Saved lists |

---

## Features

### Catalogue grid (`/`)
- Full-text search across name, ref, and description
- Category filter + lighting-specific filters (colour temperature, IP rating, wattage)
- Sort by name, power, or luminous flux
- Save to list and add to compare from the card
- Per-card Revit / ArchiCAD BIM download menu (`components/catalogue/DownloadMenu.tsx`)

### Product detail (`/products/[id]`)
- **Photo ↔ 3D model toggle** — rendered photo or interactive 3D viewer (`<model-viewer>` / GLB); orbit, zoom, reset, and fullscreen controls. Only the High Bay LED Bar ships a GLB today; other products show the photo. See `// TODO: per-variant GLB models` in `lib/repository.ts`.
- Variant selector (colour, power, finish, etc.)
- Spec table with placeholder-aware cells
- **BIM Downloads Center** — format-agnostic download panel; each asset goes live by setting its `file` and `size` in the product's `bim_assets` array — no code change
- **Compliance panel** — CE declaration, DoP, Euroclass, VOC, EPD, acoustic data, Digital Product Passport fields
- BIM metadata summary (IFC class, parametric properties)
- Standard sheet + installation details
- Supply-chain timeline
- **Sticky B2B order calculator** — quantity stepper, tier price bar, MOQ notice (placeholder-aware)
- **BOM builder** — add variants to a bill of materials; export as CSV or print

### UI
- GSAP tactile press feedback on `AnimatedButton` (`components/ui/AnimatedButton.tsx`)
- Accessible: keyboard-navigable, ARIA labels, sufficient contrast

---

## Images

Product photos are served directly from `domusmat.pt`. The domain is allow-listed in `next.config.ts` under `images.remotePatterns`.

---

## Adding a per-variant GLB

1. Drop the `.glb` file in `public/models/`.
2. Set the product's `model3d` field (and optionally a corresponding `bim_assets` GLB entry with `file` + `size`).
3. The 3D viewer activates automatically.

---

## Known TODOs

- `TODO: confirm reference prefix with client` — datasheet refs use `DMJR-` / `DMSL-` prefixes inconsistently (`lib/repository.ts`)
- Per-variant GLB models (currently only the High Bay LED Bar has one)

---

## Placeholder fields to fill in

Replace `"PLACEHOLDER"` values in `data/product_data.json`:

| Field path | What goes there |
|---|---|
| `commercial.prices` / `currency` / `tiers` / `moq` | B2B pricing tiers and MOQ — the live site publishes none |
| `products[].compliance.*` | CE/DoP/Euroclass/VOC/EPD/acoustic certificates per product |
| `products[].bim_assets[].file` / `.size` | BIM/CAD asset paths and file sizes |
| `products[].bim_metadata` | IFC class, parametric properties |
| `products[].standardization` | Standard sheet references |
| `products[].supply_chain` | Lead times, stock levels, ETA |

---

## Phase 2 roadmap (not built)

- Supabase backend + multi-tenant SaaS, RBAC, project collaboration
- Real analytics aggregation (selection frequency, regional demand)
- Live supply-chain and inventory feeds
- Photorealistic 3D rendering (Blender)
- ERP / PIM / CRM / BIM tool integrations
- Full Digital Product Passport (DPP)
- Embedded-in-file BIM metadata

See `docs/bim-content-production.md` and `docs/superpowers/specs/2026-06-22-domusmat-catalogue-design.md`.

---

## Project structure

```
app/                    Next.js App Router pages
  products/[id]/        Dynamic product detail route
components/
  catalogue/            Grid, cards, filters, sort, download menu
  detail/               Detail view panels (spec, BIM, compliance, …)
  bom/                  BOM builder + CSV export
  calculator/           Sticky order calculator
  compare/              Comparison table
  nav/                  Nav bar + search
  ui/                   Shared primitives (Button, Badge, Chip, …)
data/
  product_data.json     47 products, 8 categories — single source of truth
lib/
  repository.ts         ProductRepository interface + JsonProductRepository
  placeholder.ts        Placeholder detection helpers
  strings.ts            UI copy + PT fallback strings
  analytics.ts          LocalAnalyticsSink (dmm.analytics)
  filter.ts             Catalogue filter logic
  pricing.ts            Tier pricing helpers
  bom.ts                BOM assembly + CSV serialisation
  format.ts             Unit formatting helpers
  types.ts              Zod-parsed Catalogue schema
state/                  React context providers (cart, compare, lists, analytics)
public/models/          GLB / STL assets (high_bay_led_bar.glb today)
```
