# DoMusMat B2B BIM Catalogue Platform — Design Spec

**Date:** 2026-06-22
**Status:** Approved (pending spec review)

## Vision

**A digital BIM library where designers spec products and the buy order
auto-generates from the design.**

A compliance-rich, delivery-connected B2B BIM product catalogue for **DoMusMat**,
a Portuguese lighting/materials manufacturer. The strategic differentiator: own
the product-data backbone and license only the 3D renderer/front-end (a SaaS
licensing model), so the platform competes on **compliance + downloadable BIM +
design-to-site traceability** rather than visualization alone (unlike
renderer-first platforms like BimObject). The core loop: a designer selects
DoMusMat products → the platform auto-generates the purchase list (BOM) → with
visibility from design to site delivery.

First product: the industrial **Barra LED High Bay** linear luminaire (4
variants). The platform must generalize to any SKU.

## Source documents

- `claudecode_prompt.md` — original build prompt.
- `figma_prompt.md` — visual design brief.
- `product_data.json` — current source of truth (to be extended; see Data layer).
- Screenshot — visual style reference for the grid only, NOT data.

> `domus_mat_claude_code_handoff.md` (a Blender render-pipeline brief) is stale,
> unrelated context and is explicitly out of scope.

## Scope decomposition

This is a platform, not a single feature. It is built in phases. **This spec
covers Phase 1 (MVP).** Phase 2 is documented as a roadmap only and is NOT built
now.

### Phase 1 — MVP (this spec)
Front-end + owned data layer. Four feature groups, all approved:
1. **Catalogue functions** — search, filters, product comparison, saved lists.
2. **BIM downloads center** — per-SKU multi-format downloads + BIM-metadata schema.
3. **Compliance layer** — per-product CE / DoP / Euroclass (fire) / VOC / EPD /
   acoustic / DPP fields, plus a standardized product sheet (unified parameters,
   price range, delivery period, maintenance cycle) and installation details
   (安装说明/安装节点).
4. **BOM + spec export** — generate a Bill of Materials/spec from selected
   products (the design→buy-order loop), exportable (CSV + print/PDF), as the
   foundation for traceability.

Also in MVP: a **supply-chain / delivery-node timeline** visualization
(placeholder-aware) and a **client-side analytics stub** (数据沉淀) capturing
selection events locally behind an interface.

Plus the original catalogue → detail → 3D viewer → B2B order calculator flow.

### Phase 2 — Roadmap (NOT built now; documented for continuity)
- Real backend (Supabase: Postgres data backbone + Auth) — the SaaS-licensed
  full-stack (前后端一体化) platform.
- **Data sedimentation / analytics backend** (数据沉淀): real aggregation of
  designer selection frequency, project-category demand, and regional
  differences (the MVP `AnalyticsSink` swaps to a `SupabaseAnalyticsSink`).
- Role-based accounts (RBAC), project collaboration, shareable projects.
- Quote/request workflow + B2B analytics dashboards.
- **Real supply-chain transparency**: live inventory (库存), shipping, and
  delivery-node feeds replacing the MVP placeholder timeline.
- **3D real-space rendering** (真实空间渲染): a Blender headless render pipeline
  that imports the product GLB into room scenes (hotel/apartment/office/etc.) and
  returns photoreal images — the pipeline described in
  `domus_mat_claude_code_handoff.md`. The MVP ships interactive `<model-viewer>`
  only and leaves a UI hook for this.
- ERP / PIM / CRM + BIM-tool integrations (data flows into sales, design,
  procurement, delivery).
- Plugins & automation; full DPP (Digital Product Passport) workflows.
- BIM files with **embedded** metadata + true version history (requires server
  side BIM file generation).

## Resolved decisions

1. **MVP is front-end + owned data layer.** A typed JSON/TS data backbone is the
   "PIM" single source of truth. Client-side state (saved lists, comparison,
   BOM, quote cart) persists to `localStorage`. The data-access layer is
   abstracted behind a repository interface so a Supabase backend drops in for
   Phase 2 with minimal change. No accounts/collaboration/ERP in the MVP.
2. **Grid data follows the JSON** — 4 real variants; prices "Price on request".
   Screenshot is style reference only. Never fabricate data.
3. **3D viewer:** Google `<model-viewer>` web component.
4. **Missing assets are placeholder-aware.** Build the full BIM-downloads center
   and compliance panel as data-driven UI. Wire the GLB + STL we have; every
   format/field we lack (IFC, RFA, Archicad, DWG, DoP, Euroclass, VOC, EPD, DPP)
   renders as "coming soon"/placeholder. Real files/data drop in with zero code
   change.
5. **Project location:** scaffolded directly in `AAA/`.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- `<model-viewer>` web component, client-only (dynamic import). Loads
  `high_bay_led_bar.glb`.
- State: React Context + `localStorage` persistence for cart, saved lists,
  comparison set, and BOM. No database in MVP.
- Data access behind a `ProductRepository` interface (JSON-backed now;
  Supabase-backed in Phase 2).
- CSV export via a small util; PDF via the browser print stylesheet (no heavy
  PDF lib in MVP).

## Data layer (owned backbone)

Single source of truth: `product_data.json`, **extended** with new sections,
typed by a `ProductData` interface. The JSON's existing philosophy holds:
anything not genuinely known is the string `"PLACEHOLDER"`. We extend, we do not
fabricate.

Existing sections kept: `manufacturer`, `product`, `shared_specifications`,
`variants[]`, `commercial`.

New sections (added with real values where we have them, else `"PLACEHOLDER"`):

- **`bim_assets`** — per-variant (keyed by ref) list of downloadable assets:
  ```
  { format: "GLB"|"STL"|"IFC"|"RFA"|"PLA"(Archicad)|"DWG"|"PDF"|"IES"|"LDT",
    label, file: <path|"PLACEHOLDER">, size: <string|"PLACEHOLDER">,
    primary: boolean }   // IFC + RFA marked primary
  ```
  GLB/STL carry real `file`+`size`; the rest (incl. IES/LDT photometric files)
  are `"PLACEHOLDER"`. Note: the on-page 3D viewer uses the GLB only and is
  independent of BIM files. Good IFC/RFA must be authored natively (mesh→BIM
  conversion produces rejected "dumb solids"); IES/LDT photometric files are the
  highest-value, most-attainable lighting asset. See
  `docs/bim-content-production.md`. The download center is format-agnostic and
  placeholder-aware, so any asset goes live by setting its `file`/`size` — no
  code change.
- **`bim_metadata`** — per-variant embedded-metadata record (displayed in MVP;
  embedded-in-file is Phase 2): `product_id`, `dimensions`, `materials`,
  `performance` (efficacy/lumens/etc), `ifc_properties` (key/value), `version`,
  `version_history` (`"PLACEHOLDER"` for now).
- **`compliance`** — per-product/variant: `ce`, `dop` (Declaration of
  Performance), `euroclass` (fire rating / 消防等级), `voc`, `epd` (Environmental
  Product Declaration), `acoustic` (声学性能), `dpp` (Digital Product Passport
  ref). Each is a structured field with a `status` + optional `document`/`value`;
  unknown ⇒ `"PLACEHOLDER"`.
- **`standardization`** — per-product standardized display fields (统一参数):
  `price_range` (价格区间), `delivery_period` (交付周期), `maintenance_cycle`
  (维护周期), and `installation` (安装说明/安装节点: an object with
  `instructions`, `mounting_nodes[]`, `document`). Unknown ⇒ `"PLACEHOLDER"`.
- **`supply_chain`** — supply-chain transparency (供应链透明), placeholder-aware:
  `stock` (库存), and `delivery_nodes[]` (交付节点: ordered stages such as
  Production → Dispatch → Transit → On-site, each `{ label, status, eta }`).
  No real inventory/logistics feed in MVP ⇒ values `"PLACEHOLDER"`; the
  visualization renders the stage structure with placeholder states.

**Placeholder rule (critical):** `isPlaceholder()` / `resolvePlaceholder()`
helpers drive every readout. UI shows "—", "Price on request", "Contact for lead
time", or "Coming soon" and never computes with fake numbers. Real data ⇒ zero
code change.

## Routes & pages

### `/` — Catalogue grid
- Top nav: logo, categories (Lighting/Materials/Fixtures), search field, B2B
  Login, quote-cart badge, **saved-lists** entry, **compare** tray indicator.
- Left filter sidebar: Power (W), IP rating, Color temperature, Material,
  Certification, Application. Options derived from data.
- **Search** (client-side) over name/ref/specs. **Comparison**: select up to N
  variants → compare view. **Saved lists**: bookmark products to a named list
  (localStorage).
- Main grid: 4 variant cards styled to match the screenshot; prices "Price on
  request"; "View 3D" hover badge; add-to-compare + save controls.
- Section header: breadcrumb + result count + sort dropdown.

### `/products/[ref]` — Product detail page
- **Left (~55%):** `<model-viewer>` with orbit/zoom/reset/fullscreen + thumbnail
  strip (3D vs photos).
- **Right (~45%):** title, PT descriptor, certification badges, variant selector
  (4 refs). Variant selection updates specs, BIM downloads, compliance, BOM line.
  All variants share one GLB — `TODO: per-variant GLB models`.
- **Below, stacked sections:**
  - Technical specification table (zebra).
  - **BIM downloads center** — primary row (IFC, RFA) + secondary (Archicad,
    DWG, GLB, STL, PDF), each with file-type icon, size, and BIM-metadata
    summary (product ID, dims, materials, IFC props, version). GLB/STL enabled;
    rest disabled "coming soon".
  - **Compliance panel** — CE, DoP, Euroclass (fire), VOC, EPD, acoustic,
    DPP-ready, each with status chip + document link (placeholder where absent).
  - **Standardized product sheet** — unified parameters, price range, delivery
    period, maintenance cycle (placeholder-aware).
  - **Installation details** (安装说明/安装节点) — instructions + mounting-node
    list + drawing/document slot (placeholder-aware).
  - **Supply-chain / delivery timeline** (供应链透明) — a horizontal node
    visualization (Production → Dispatch → Transit → On-site) with per-stage
    status + ETA; placeholder states until a real feed exists.
  - Technical-drawing slot; PT description + application tags.
- **Add to BOM** action alongside Add to quote. Selecting a product/variant or
  adding to BOM emits an analytics event (see Analytics).

### `/compare` — Comparison view
Side-by-side spec/compliance/price table for the selected variants.

### `/lists` — Saved lists & BOM
- Saved lists (localStorage).
- **BOM builder**: products added to BOM with quantities; generates a
  Bill of Materials / specification table; **export CSV** + print/PDF. Columns:
  ref, name, qty, key specs, compliance status, unit price (placeholder-aware),
  line total. This is the design-to-site traceability foundation.

## B2B Order Calculator (core feature)

Sticky right-rail (bottom bar on mobile). Quantity stepper respecting
`minimum_order_quantity`; live unit price / active volume-discount tier +
`TierProgressBar` / subtotal-total / estimated delivery from `lead_time_tiers`.
All `commercial.*` are `"PLACEHOLDER"` today ⇒ "Price on request" / "Contact for
lead time", totals disabled; logic fully implemented and activates when real
data lands. CTAs: "Add to quote" (brand red), "Add to BOM", "Request custom
pricing". Fine print: B2B net, VAT excluded, login for contract pricing.

## Components

Catalogue: `Nav`, `FilterSidebar`, `SearchBar`, `ProductCard`, `CompareTray`,
`SaveButton`, `Footer`.
Detail: `ModelViewer`, `ViewerControls`, `VariantSelector`, `CertBadges`,
`SpecTable`, `BimDownloadsCenter`, `BimMetadataSummary`, `CompliancePanel`,
`StandardSheet`, `InstallationDetails`, `SupplyChainTimeline`,
`OrderCalculator`, `QuantityStepper`, `TierProgressBar`, `Badge`/`Chip`.
Lists/BOM: `SavedLists`, `BomBuilder`, `BomTable`, `ExportButton`.
Compare: `ComparisonTable`.

Each has one purpose and a typed props interface; data access goes through the
`ProductRepository` so components never read JSON directly.

## Analytics (data sedimentation, 数据沉淀)

A client-side analytics stub behind an `AnalyticsSink` interface
(`track(event)`). The MVP implementation (`LocalAnalyticsSink`) appends events to
`localStorage` (key `dmm.analytics`): product/variant `view`, `add_to_bom`,
`add_to_quote`, `download`, with `ref`, optional `category`, and a `region`
placeholder field. This captures **designer selection frequency, project-category
demand, and regional differences** locally now; in Phase 2 a
`SupabaseAnalyticsSink` (same interface) ships events to a backend for real
aggregation. No backend, no PII in MVP.

## Design system

Palette: ink `#141414`, white, aluminium `#CDD1D6`/`#AAAEB4`, brand red
`#C8102E` (CTAs/active), neutral fill `#F5F5F0`. Inter; uppercase small-caps
labels; tabular numerals. 1px dividers, 4px radii, subtle shadows. Encoded as
Tailwind theme tokens.

## Cross-cutting requirements

- **Responsive** 1440 → 375px (viewer stacks; calculator becomes sticky bottom
  bar; BIM/compliance sections stack).
- **Accessibility:** semantic HTML, labeled controls, keyboard stepper/viewer,
  alt text.
- **i18n-ready:** PT copy centralized; `description_en` placeholder respected.
- **Documented quirks (code comments, do not silently resolve):**
  - `DMJR-`/`DMSL-` reference-prefix discrepancy ⇒
    `TODO: confirm reference prefix with client`.
  - Single shared GLB ⇒ `TODO: per-variant GLB models`.
- **Footer:** manufacturer address/phone/email from JSON.
- **README.md:** how to run; where real commercial/BIM/compliance data goes; how
  to add per-variant GLB; the Phase 2 → Supabase migration path via
  `ProductRepository`.

## Success criteria

`npm run dev` shows end to end with placeholder data behaving correctly:
catalogue with working search/filters/compare/saved-lists → detail page with a
loadable, orbit/zoom/reset/fullscreen 3D model, variant selector driving specs +
BIM downloads + compliance, a BIM-downloads center (GLB/STL enabled, rest "coming
soon"), a placeholder-aware compliance panel → add products to a BOM → generate
and export a BOM (CSV + print). Prices "Price on request"; lead time "Contact for
lead time"; totals disabled. No fabricated data anywhere.

## Out of scope (Phase 1)

Real auth/RBAC, backend persistence, collaboration, shareable projects,
quote/request workflow, **real analytics aggregation** (MVP only captures events
locally), **real supply-chain/inventory feeds** (MVP shows a placeholder
timeline), **3D real-space/Blender rendering** (MVP ships interactive
`<model-viewer>` only), ERP/PIM/CRM/BIM integrations, plugins, automation, full
DPP workflows, embedded-in-file BIM metadata + version history, generating new
3D/BIM models. All recorded in the Phase 2 roadmap above.
