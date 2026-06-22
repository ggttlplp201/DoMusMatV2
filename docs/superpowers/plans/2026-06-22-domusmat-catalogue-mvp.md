# DoMusMat B2B BIM Catalogue MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a front-end B2B BIM product catalogue for DoMusMat with catalogue browsing (search/filter/compare/saved lists), an interactive 3D viewer, a placeholder-aware B2B order calculator, a per-SKU BIM downloads center, a compliance layer, and BOM + spec export — all driven by an owned, typed data backbone that never fabricates data.

**Architecture:** Next.js (App Router) + TypeScript + Tailwind. A typed `product_data.json` is the single source of truth ("PIM"), read through a `ProductRepository` interface so a Supabase backend can replace it in Phase 2. Pure logic (placeholder resolution, pricing/lead-time, BOM/CSV) lives in `lib/` and is unit-tested with Vitest. Client state (cart, saved lists, comparison, BOM) lives in React Context persisted to `localStorage`. 3D via Google `<model-viewer>`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Vitest + @testing-library/react, `@google/model-viewer`, Inter (next/font).

## Global Constraints

- **Never fabricate data.** Any field equal to the string `"PLACEHOLDER"` is not-yet-supplied. Render "—", "Price on request", "Contact for lead time", or "Coming soon"; never compute with fake numbers. Real data must activate features with zero code change.
- **BIM/CAD files are human-engineer fill-in points, not auto-generated.** AI/mesh→BIM conversion is explicitly out of scope (it produces rejected "dumb solids"). IFC, RFA, ArchiCAD, DWG, IES, LDT, and PDF ship as placeholder "Coming soon" slots; only GLB/STL are wired. A BIM engineer authors each file natively, drops it in `public/`, and sets `file`/`size` in `bim_assets[ref]` — no code change. These placeholders are intentional, not unfinished work.
- **Palette (exact):** ink `#141414`, white `#FFFFFF`, aluminium `#CDD1D6` and `#AAAEB4`, brand red `#C8102E` (CTAs/active only), neutral fill `#F5F5F0`.
- **Typography:** Inter. Uppercase small-caps section labels with letter-spacing; tabular numerals for specs/prices.
- **Style:** 1px dividers, 4px (`rounded`) radii, subtle shadows only.
- **Responsive:** 1440px desktop → 375px mobile. On detail/mobile the 3D viewer stacks on top and the order calculator becomes a sticky bottom bar.
- **Accessibility:** semantic HTML, labeled controls, keyboard-operable stepper and viewer buttons, alt text on imagery.
- **i18n-ready:** all UI copy goes through `lib/strings.ts`. Product copy is Portuguese; `description_en` is `"PLACEHOLDER"`.
- **Data access:** components never import `product_data.json` directly — always through `ProductRepository`.
- **Documented quirks (leave as code comments, do not resolve):**
  - `// TODO: confirm reference prefix with client` — datasheet uses `DMJR-` (p1) / `DMSL-` (p2); JSON uses `DMJR-`.
  - `// TODO: per-variant GLB models` — all variants currently share `high_bay_led_bar.glb`.
- **Commits:** frequent, conventional-commit messages. No `Co-Authored-By` trailers.

---

## File Structure

```
AAA/
  data/
    product_data.json            # owned backbone, extended (source of truth)
  public/models/
    high_bay_led_bar.glb         # 3D model (real)
    high_bay_led_bar.stl         # CAD asset (real)
  lib/
    types.ts                     # ProductData + derived types
    placeholder.ts               # isPlaceholder / resolvePlaceholder
    repository.ts                # ProductRepository interface + JsonProductRepository
    pricing.ts                   # order calculator logic (placeholder-aware)
    bom.ts                       # BOM build + CSV export
    strings.ts                   # centralized PT/EN copy
    format.ts                    # number/price/dimension formatters (tabular)
  app/
    layout.tsx                   # root layout, font, Providers
    providers.tsx                # CartProvider + ListsProvider + CompareProvider
    globals.css                  # Tailwind + theme tokens + print styles
    page.tsx                     # catalogue grid (/)
    products/[ref]/page.tsx      # detail page
    compare/page.tsx             # comparison view
    lists/page.tsx               # saved lists + BOM builder/export
  components/
    nav/Nav.tsx, SearchBar.tsx, CompareTray.tsx
    Footer.tsx
    catalogue/FilterSidebar.tsx, ProductCard.tsx, SortDropdown.tsx, SaveButton.tsx
    ui/Badge.tsx, Chip.tsx, SectionLabel.tsx
    detail/ModelViewer.tsx, ViewerControls.tsx, VariantSelector.tsx,
           CertBadges.tsx, SpecTable.tsx, BimDownloadsCenter.tsx,
           BimMetadataSummary.tsx, CompliancePanel.tsx
    calculator/OrderCalculator.tsx, QuantityStepper.tsx, TierProgressBar.tsx
    bom/BomBuilder.tsx, BomTable.tsx, ExportButton.tsx
    compare/ComparisonTable.tsx
    lists/SavedLists.tsx
  state/
    cart.tsx, lists.tsx, compare.tsx   # React Context + localStorage
  test/setup.ts
  README.md
```

---

## Task 1: Scaffold project, assets, and design tokens

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `test/setup.ts`, `.gitignore`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (temporary placeholder)
- Copy: `data/product_data.json`, `public/models/high_bay_led_bar.glb`, `public/models/high_bay_led_bar.stl`

**Interfaces:**
- Produces: a runnable Next.js app with Tailwind theme tokens (`ink`, `aluminium`, `aluminium-dark`, `brand`, `neutral`), the Inter font, and Vitest configured.

- [ ] **Step 1: Scaffold Next.js app in place**

Run (AAA must be empty except `docs/`):
```bash
cd "$PWD"
npx create-next-app@latest . --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```
If it refuses due to the `docs/` folder, scaffold in a temp dir and move files in. Expected: `package.json`, `app/`, `tailwind`/`postcss` configs exist.

- [ ] **Step 2: Copy real assets into the repo**

```bash
mkdir -p data public/models
cp /Users/leon/Downloads/product_data.json data/product_data.json
cp /Users/leon/Downloads/high_bay_led_bar.glb public/models/high_bay_led_bar.glb
cp /Users/leon/Downloads/high_bay_led_bar.stl public/models/high_bay_led_bar.stl
```
Expected: three files present, GLB ~14KB, STL ~30KB.

- [ ] **Step 3: Install test + 3D deps**

```bash
npm i @google/model-viewer
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./test/setup.ts"], globals: true },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
```
Create `test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Define Tailwind theme tokens**

In `tailwind.config.ts` extend theme colors and radius:
```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./state/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        aluminium: { DEFAULT: "#CDD1D6", dark: "#AAAEB4" },
        brand: "#C8102E",
        neutral: { fill: "#F5F5F0" },
      },
      borderRadius: { DEFAULT: "4px" },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Root layout with Inter + tabular numerals utility**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "DoMusMat — B2B Catalogue", description: "Industrial lighting BIM catalogue" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.variable} font-sans text-ink bg-white antialiased`}>{children}</body>
    </html>
  );
}
```
Append to `app/globals.css`:
```css
.tabular { font-variant-numeric: tabular-nums; }
.section-label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.6875rem; font-weight: 600; color: #AAAEB4; }
@media print { .no-print { display: none !important; } }
```

- [ ] **Step 7: Temporary home page + verify dev server**

Replace `app/page.tsx` with `export default function Home(){return <main className="p-8">DoMusMat scaffold OK</main>;}`.
Run: `npm run build` — Expected: build succeeds. Run `npm run test` — Expected: "No test files" (exit 0) or passes.

- [ ] **Step 8: Commit**
```bash
git init 2>/dev/null; git add -A
git commit -m "chore: scaffold Next.js + Tailwind tokens, assets, vitest"
```

---

> **PLAN REVISION 2026-06-22 (multi-product website revamp).** Tasks 2, 4, 10,
> and 11 are superseded by the multi-product model. The real catalogue (47
> products, 8 categories) is in `docs/domusmat-catalogue-crawl.md`; the schema is
> in the spec's revised "Data layer" section. Task 2 now builds a multi-product
> `Catalogue` (categories[] + products[] each with variants[]/compliance/bim/
> standardization/supply_chain), Task 4's repository exposes
> `getCategories()/getProducts()/getProduct(id)/getVariant(ref)` and per-product
> getters, Task 10's grid lists products across categories with a category facet,
> and Task 11's detail renders `<model-viewer>` only when `product.model3d` is a
> real path (else an image gallery from `product.images`). Logic/component tasks
> (3,5,6,7,8,9,12–18) are unchanged but operate per-product via the repository.
> The revised Task 2 brief is `.superpowers/sdd/task-2-brief.md`.

## Task 2: Extend the data backbone + TypeScript types

**Files:**
- Modify: `data/product_data.json` (add `bim_assets`, `bim_metadata`, `compliance`)
- Create: `lib/types.ts`
- Test: `lib/types.test.ts`

**Interfaces:**
- Produces: `ProductData`, `Variant`, `BimAsset` (`{format, label, file, size, primary}`), `BimMetadata`, `ComplianceField` (`{status, value, document}`), `Compliance`, and `type Placeholder = "PLACEHOLDER"`. Exports `productData: ProductData` (default import of the JSON, typed).

- [ ] **Step 1: Extend the JSON (real values where known, else "PLACEHOLDER")**

Add these top-level keys to `data/product_data.json`. `bim_assets` keyed by ref; GLB/STL real, rest placeholder:
```json
"bim_assets": {
  "DMJR-TP120W001": [
    {"format":"IFC","label":"IFC 4","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":true},
    {"format":"RFA","label":"Revit Family","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":true},
    {"format":"PLA","label":"Archicad","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":false},
    {"format":"DWG","label":"AutoCAD DWG","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":false},
    {"format":"GLB","label":"glTF Binary","file":"/models/high_bay_led_bar.glb","size":"14 KB","primary":false},
    {"format":"STL","label":"STL Mesh","file":"/models/high_bay_led_bar.stl","size":"30 KB","primary":false},
    {"format":"IES","label":"Fotometria IES","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":false},
    {"format":"LDT","label":"Fotometria EULUMDAT","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":false},
    {"format":"PDF","label":"Datasheet","file":"PLACEHOLDER","size":"PLACEHOLDER","primary":false}
  ],
  "DMJR-TP150W002": [ /* same shape; GLB/STL same shared files */ ],
  "DMJR-TP200W003": [ /* same shape */ ],
  "DMJR-TP300W004": [ /* same shape */ ]
}
```
Note in JSON `_note`-style comment is not valid JSON; instead the GLB/STL share one model — record `// TODO: per-variant GLB models` in `repository.ts` not the JSON.
Add `bim_metadata` keyed by ref:
```json
"bim_metadata": {
  "DMJR-TP200W003": {
    "product_id":"DMJR-TP200W003",
    "dimensions":{"length_mm":1200,"width_mm":150,"height_mm":67},
    "materials":["Alumínio"],
    "performance":{"power_w":200,"luminous_efficacy":"130-135 lm/W","lumens":"PLACEHOLDER"},
    "ifc_properties":{"IfcType":"IfcLightFixture","Pset_LightFixtureTypeCommon.NumberOfSources":"PLACEHOLDER"},
    "version":"PLACEHOLDER",
    "version_history":"PLACEHOLDER"
  }
  /* one record per ref, dims/power from variants[] */
}
```
Add `compliance` (shared at product level; CE known true, rest placeholder),
including `acoustic` (声学性能):
```json
"compliance": {
  "ce": {"status":"declared","value":"CE","document":"PLACEHOLDER"},
  "dop": {"status":"PLACEHOLDER","value":"PLACEHOLDER","document":"PLACEHOLDER"},
  "euroclass": {"status":"PLACEHOLDER","value":"PLACEHOLDER","document":"PLACEHOLDER"},
  "voc": {"status":"PLACEHOLDER","value":"PLACEHOLDER","document":"PLACEHOLDER"},
  "epd": {"status":"PLACEHOLDER","value":"PLACEHOLDER","document":"PLACEHOLDER"},
  "acoustic": {"status":"PLACEHOLDER","value":"PLACEHOLDER","document":"PLACEHOLDER"},
  "dpp": {"status":"PLACEHOLDER","value":"PLACEHOLDER","document":"PLACEHOLDER"}
}
```
Add `standardization` (统一参数; all placeholder — none in the PDF) and
`supply_chain` (供应链; placeholder states, real feed is Phase 2):
```json
"standardization": {
  "price_range": "PLACEHOLDER",
  "delivery_period": "PLACEHOLDER",
  "maintenance_cycle": "PLACEHOLDER",
  "installation": { "instructions": "PLACEHOLDER", "mounting_nodes": "PLACEHOLDER", "document": "PLACEHOLDER" }
},
"supply_chain": {
  "stock": "PLACEHOLDER",
  "delivery_nodes": [
    {"label":"Produção","status":"PLACEHOLDER","eta":"PLACEHOLDER"},
    {"label":"Expedição","status":"PLACEHOLDER","eta":"PLACEHOLDER"},
    {"label":"Transporte","status":"PLACEHOLDER","eta":"PLACEHOLDER"},
    {"label":"Em obra","status":"PLACEHOLDER","eta":"PLACEHOLDER"}
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `lib/types.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { productData } from "./types";

describe("productData backbone", () => {
  it("has 4 variants with refs", () => {
    expect(productData.variants).toHaveLength(4);
    expect(productData.variants[0].ref).toBe("DMJR-TP120W001");
  });
  it("exposes bim_assets with IFC+RFA marked primary", () => {
    const assets = productData.bim_assets["DMJR-TP120W001"];
    const primaries = assets.filter(a => a.primary).map(a => a.format).sort();
    expect(primaries).toEqual(["IFC", "RFA"]);
  });
  it("keeps unknown commercial + compliance values as PLACEHOLDER", () => {
    expect(productData.commercial.currency).toBe("PLACEHOLDER");
    expect(productData.compliance.dop.status).toBe("PLACEHOLDER");
  });
  it("has real GLB/STL files wired", () => {
    const assets = productData.bim_assets["DMJR-TP120W001"];
    expect(assets.find(a => a.format === "GLB")?.file).toBe("/models/high_bay_led_bar.glb");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- lib/types.test.ts`
Expected: FAIL — `./types` not found.

- [ ] **Step 4: Write `lib/types.ts`**
```ts
import raw from "@/data/product_data.json";

export type Placeholder = "PLACEHOLDER";
export const PLACEHOLDER: Placeholder = "PLACEHOLDER";

export interface Variant { ref: string; power_w: number; length_mm: number; width_mm: number; height_mm: number; lumens: string; }
export interface BimAsset { format: "IFC"|"RFA"|"PLA"|"DWG"|"GLB"|"STL"|"PDF"|"IES"|"LDT"; label: string; file: string; size: string; primary: boolean; }
export interface BimMetadata {
  product_id: string; dimensions: { length_mm: number; width_mm: number; height_mm: number };
  materials: string[]; performance: Record<string, string | number>;
  ifc_properties: Record<string, string>; version: string; version_history: string | string[];
}
export interface ComplianceField { status: string; value: string; document: string; }
export interface Compliance { ce: ComplianceField; dop: ComplianceField; euroclass: ComplianceField; voc: ComplianceField; epd: ComplianceField; acoustic: ComplianceField; dpp: ComplianceField; }
export interface Installation { instructions: string; mounting_nodes: string | string[]; document: string; }
export interface Standardization { price_range: string; delivery_period: string; maintenance_cycle: string; installation: Installation; }
export interface DeliveryNode { label: string; status: string; eta: string; }
export interface SupplyChain { stock: string; delivery_nodes: DeliveryNode[]; }
export interface Commercial {
  currency: string; unit_prices: Record<string, string | number>;
  volume_discount_tiers: string | { min_qty: number; discount_pct: number }[];
  lead_time_tiers: string | { min_qty: number; business_days: number }[];
  minimum_order_quantity: string | number;
}
export interface ProductData {
  manufacturer: { name: string; address: string; phone: string; email: string };
  product: { name: string; category: string; description_pt: string; description_en: string; applications: string[] };
  shared_specifications: Record<string, unknown>;
  variants: Variant[];
  commercial: Commercial;
  bim_assets: Record<string, BimAsset[]>;
  bim_metadata: Record<string, BimMetadata>;
  compliance: Compliance;
  standardization: Standardization;
  supply_chain: SupplyChain;
}
export const productData = raw as unknown as ProductData;
```
Ensure `tsconfig.json` has `"resolveJsonModule": true`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- lib/types.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 6: Commit**
```bash
git add data/product_data.json lib/types.ts lib/types.test.ts tsconfig.json
git commit -m "feat: extend data backbone with bim_assets, bim_metadata, compliance + types"
```

---

## Task 3: Placeholder helpers

**Files:**
- Create: `lib/placeholder.ts`
- Test: `lib/placeholder.test.ts`

**Interfaces:**
- Produces: `isPlaceholder(v: unknown): boolean`, `resolvePlaceholder<T>(v: T, fallback: string): T | string`, `hasRealValue(v: unknown): boolean`. A value is a placeholder when it `=== "PLACEHOLDER"`, is `null`/`undefined`, or is an array/object recursively all-placeholder.

- [ ] **Step 1: Write the failing test**

`lib/placeholder.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isPlaceholder, resolvePlaceholder, hasRealValue } from "./placeholder";

describe("placeholder", () => {
  it("flags the sentinel string", () => { expect(isPlaceholder("PLACEHOLDER")).toBe(true); });
  it("flags null/undefined", () => { expect(isPlaceholder(null)).toBe(true); expect(isPlaceholder(undefined)).toBe(true); });
  it("accepts real values", () => { expect(isPlaceholder(289)).toBe(false); expect(isPlaceholder("CE")).toBe(false); });
  it("resolves to fallback when placeholder", () => { expect(resolvePlaceholder("PLACEHOLDER", "—")).toBe("—"); });
  it("passes real values through", () => { expect(resolvePlaceholder(289, "—")).toBe(289); });
  it("hasRealValue is the inverse", () => { expect(hasRealValue("CE")).toBe(true); expect(hasRealValue("PLACEHOLDER")).toBe(false); });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm run test -- lib/placeholder.test.ts` → FAIL.

- [ ] **Step 3: Implement**
```ts
export function isPlaceholder(v: unknown): boolean {
  if (v === "PLACEHOLDER" || v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0 || v.every(isPlaceholder);
  return false;
}
export function hasRealValue(v: unknown): boolean { return !isPlaceholder(v); }
export function resolvePlaceholder<T>(v: T, fallback: string): T | string {
  return isPlaceholder(v) ? fallback : v;
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (6 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/placeholder.ts lib/placeholder.test.ts
git commit -m "feat: add placeholder-resolution helpers"
```

---

## Task 4: ProductRepository

**Files:**
- Create: `lib/repository.ts`
- Test: `lib/repository.test.ts`

**Interfaces:**
- Produces: interface `ProductRepository` with `getProduct()`, `getVariants(): Variant[]`, `getVariant(ref): Variant | undefined`, `getBimAssets(ref): BimAsset[]`, `getBimMetadata(ref): BimMetadata | undefined`, `getCompliance(): Compliance`, `getCommercial(): Commercial`, `getManufacturer()`. Exports a singleton `repo: ProductRepository` = `new JsonProductRepository(productData)`. Later tasks consume `repo`.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { repo } from "./repository";

describe("JsonProductRepository", () => {
  it("returns all variants", () => { expect(repo.getVariants().map(v => v.ref)).toContain("DMJR-TP200W003"); });
  it("finds a variant by ref", () => { expect(repo.getVariant("DMJR-TP200W003")?.power_w).toBe(200); });
  it("returns undefined for unknown ref", () => { expect(repo.getVariant("NOPE")).toBeUndefined(); });
  it("returns bim assets for a ref", () => { expect(repo.getBimAssets("DMJR-TP200W003").length).toBeGreaterThan(0); });
  it("exposes compliance + commercial", () => {
    expect(repo.getCompliance().ce.value).toBe("CE");
    expect(repo.getCommercial().currency).toBe("PLACEHOLDER");
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement**
```ts
import { productData } from "./types";
import type { ProductData, Variant, BimAsset, BimMetadata, Compliance, Commercial, Standardization, SupplyChain } from "./types";

export interface ProductRepository {
  getProduct(): ProductData["product"];
  getManufacturer(): ProductData["manufacturer"];
  getVariants(): Variant[];
  getVariant(ref: string): Variant | undefined;
  getBimAssets(ref: string): BimAsset[];
  getBimMetadata(ref: string): BimMetadata | undefined;
  getCompliance(): Compliance;
  getCommercial(): Commercial;
  getStandardization(): Standardization;
  getSupplyChain(): SupplyChain;
}

// TODO: per-variant GLB models — all variants currently resolve to the single shared GLB.
// Phase 2: replace JsonProductRepository with a SupabaseProductRepository (same interface).
export class JsonProductRepository implements ProductRepository {
  constructor(private data: ProductData) {}
  getProduct() { return this.data.product; }
  getManufacturer() { return this.data.manufacturer; }
  getVariants() { return this.data.variants; }
  getVariant(ref: string) { return this.data.variants.find(v => v.ref === ref); }
  getBimAssets(ref: string) { return this.data.bim_assets[ref] ?? []; }
  getBimMetadata(ref: string) { return this.data.bim_metadata[ref]; }
  getCompliance() { return this.data.compliance; }
  getCommercial() { return this.data.commercial; }
  getStandardization() { return this.data.standardization; }
  getSupplyChain() { return this.data.supply_chain; }
}
export const repo: ProductRepository = new JsonProductRepository(productData);
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/repository.ts lib/repository.test.ts
git commit -m "feat: add ProductRepository (JSON-backed, Supabase-ready)"
```

---

## Task 5: Formatters + centralized strings

**Files:**
- Create: `lib/format.ts`, `lib/strings.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Produces: `formatPrice(value, currency): string` ("Price on request" when either is placeholder), `formatDimensions(l,w,h): string` ("1200 × 150 × 67 mm"), `formatLeadTime(days): string`. `lib/strings.ts` exports `t` object of PT UI copy (keys: `priceOnRequest`, `contactForLeadTime`, `comingSoon`, `addToQuote`, `addToBom`, `requestCustomPricing`, `vatNote`, etc.).

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { formatPrice, formatDimensions } from "./format";

describe("format", () => {
  it("formats a real price", () => { expect(formatPrice(289, "EUR")).toBe("€289.00"); });
  it("returns price-on-request when price is placeholder", () => { expect(formatPrice("PLACEHOLDER", "EUR")).toBe("Price on request"); });
  it("returns price-on-request when currency is placeholder", () => { expect(formatPrice(289, "PLACEHOLDER")).toBe("Price on request"); });
  it("formats dimensions", () => { expect(formatDimensions(1200, 150, 67)).toBe("1200 × 150 × 67 mm"); });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `lib/format.ts`**
```ts
import { isPlaceholder } from "./placeholder";
const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
export function formatPrice(value: unknown, currency: unknown): string {
  if (isPlaceholder(value) || isPlaceholder(currency)) return "Price on request";
  const sym = SYMBOLS[String(currency)] ?? `${currency} `;
  return `${sym}${Number(value).toFixed(2)}`;
}
export function formatDimensions(l: number, w: number, h: number): string { return `${l} × ${w} × ${h} mm`; }
export function formatLeadTime(days: unknown): string {
  return isPlaceholder(days) ? "Contact for lead time" : `${days} business days`;
}
```
Create `lib/strings.ts`:
```ts
export const t = {
  priceOnRequest: "Price on request",
  contactForLeadTime: "Contact for lead time",
  comingSoon: "Coming soon",
  addToQuote: "Adicionar ao orçamento",
  addToBom: "Adicionar à lista de materiais",
  requestCustomPricing: "Pedir preço personalizado",
  vatNote: "Preços líquidos B2B · IVA não incluído · inicie sessão para preços de contrato",
  resultsLabel: "resultados",
  compare: "Comparar",
  savedLists: "Listas guardadas",
} as const;
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/format.ts lib/strings.ts lib/format.test.ts
git commit -m "feat: add formatters + centralized PT strings"
```

---

## Task 6: Order-calculator logic (placeholder-aware)

**Files:**
- Create: `lib/pricing.ts`
- Test: `lib/pricing.test.ts`

**Interfaces:**
- Produces: `calculateOrder(input): OrderResult`. Input `{ ref, quantity, commercial: Commercial }`. Output `OrderResult = { available: boolean; unitPrice: number|null; activeTier: {min_qty,discount_pct}|null; nextTier: {min_qty,discount_pct}|null; unitsToNextTier: number|null; discountedUnitPrice: number|null; subtotal: number|null; total: number|null; leadTimeDays: number|null; minOrderQty: number; }`. When any required commercial value is placeholder, `available=false` and numeric fields are `null`. Consumed by `OrderCalculator` (Task 14) and BOM (Task 7).

- [ ] **Step 1: Write the failing test** (covers placeholder + active-data paths)
```ts
import { describe, it, expect } from "vitest";
import { calculateOrder } from "./pricing";
import type { Commercial } from "./types";

const placeholderCommercial = {
  currency: "PLACEHOLDER", unit_prices: { "R1": "PLACEHOLDER" },
  volume_discount_tiers: "PLACEHOLDER", lead_time_tiers: "PLACEHOLDER", minimum_order_quantity: "PLACEHOLDER",
} as unknown as Commercial;

const liveCommercial = {
  currency: "EUR",
  unit_prices: { "R1": 100 },
  volume_discount_tiers: [ { min_qty: 1, discount_pct: 0 }, { min_qty: 10, discount_pct: 5 }, { min_qty: 50, discount_pct: 10 } ],
  lead_time_tiers: [ { min_qty: 1, business_days: 5 }, { min_qty: 50, business_days: 20 } ],
  minimum_order_quantity: 5,
} as unknown as Commercial;

describe("calculateOrder", () => {
  it("degrades gracefully when commercial is placeholder", () => {
    const r = calculateOrder({ ref: "R1", quantity: 10, commercial: placeholderCommercial });
    expect(r.available).toBe(false);
    expect(r.total).toBeNull();
    expect(r.leadTimeDays).toBeNull();
    expect(r.minOrderQty).toBe(1); // safe default when MOQ placeholder
  });
  it("computes price, active+next tier, and lead time with live data", () => {
    const r = calculateOrder({ ref: "R1", quantity: 10, commercial: liveCommercial });
    expect(r.available).toBe(true);
    expect(r.unitPrice).toBe(100);
    expect(r.activeTier?.discount_pct).toBe(5);
    expect(r.discountedUnitPrice).toBe(95);
    expect(r.subtotal).toBe(1000);
    expect(r.total).toBe(950);
    expect(r.nextTier?.discount_pct).toBe(10);
    expect(r.unitsToNextTier).toBe(40);
    expect(r.leadTimeDays).toBe(5);
    expect(r.minOrderQty).toBe(5);
  });
  it("applies the top tier and reports no next tier", () => {
    const r = calculateOrder({ ref: "R1", quantity: 60, commercial: liveCommercial });
    expect(r.activeTier?.discount_pct).toBe(10);
    expect(r.nextTier).toBeNull();
    expect(r.unitsToNextTier).toBeNull();
    expect(r.leadTimeDays).toBe(20);
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `lib/pricing.ts`**
```ts
import { isPlaceholder } from "./placeholder";
import type { Commercial } from "./types";

export interface Tier { min_qty: number; discount_pct: number; }
export interface OrderResult {
  available: boolean; unitPrice: number | null; activeTier: Tier | null; nextTier: Tier | null;
  unitsToNextTier: number | null; discountedUnitPrice: number | null; subtotal: number | null;
  total: number | null; leadTimeDays: number | null; minOrderQty: number;
}
export interface OrderInput { ref: string; quantity: number; commercial: Commercial; }

export function calculateOrder({ ref, quantity, commercial }: OrderInput): OrderResult {
  const moqRaw = commercial.minimum_order_quantity;
  const minOrderQty = isPlaceholder(moqRaw) ? 1 : Number(moqRaw);
  const price = commercial.unit_prices?.[ref];
  const tiers = commercial.volume_discount_tiers;
  const leadTiers = commercial.lead_time_tiers;

  const unavailable = isPlaceholder(commercial.currency) || isPlaceholder(price);
  if (unavailable) {
    return { available: false, unitPrice: null, activeTier: null, nextTier: null, unitsToNextTier: null,
      discountedUnitPrice: null, subtotal: null, total: null, leadTimeDays: null, minOrderQty };
  }
  const unitPrice = Number(price);
  const subtotal = unitPrice * quantity;

  let activeTier: Tier | null = null, nextTier: Tier | null = null;
  if (!isPlaceholder(tiers)) {
    const sorted = [...(tiers as Tier[])].sort((a, b) => a.min_qty - b.min_qty);
    for (const tr of sorted) if (quantity >= tr.min_qty) activeTier = tr;
    nextTier = sorted.find(tr => tr.min_qty > quantity) ?? null;
  }
  const discountPct = activeTier?.discount_pct ?? 0;
  const discountedUnitPrice = +(unitPrice * (1 - discountPct / 100)).toFixed(2);
  const total = +(discountedUnitPrice * quantity).toFixed(2);
  const unitsToNextTier = nextTier ? nextTier.min_qty - quantity : null;

  let leadTimeDays: number | null = null;
  if (!isPlaceholder(leadTiers)) {
    const sorted = [...(leadTiers as { min_qty: number; business_days: number }[])].sort((a, b) => a.min_qty - b.min_qty);
    for (const lt of sorted) if (quantity >= lt.min_qty) leadTimeDays = lt.business_days;
  }
  return { available: true, unitPrice, activeTier, nextTier, unitsToNextTier, discountedUnitPrice, subtotal, total, leadTimeDays, minOrderQty };
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/pricing.ts lib/pricing.test.ts
git commit -m "feat: add placeholder-aware order calculator logic"
```

---

## Task 7: BOM build + CSV export

**Files:**
- Create: `lib/bom.ts`
- Test: `lib/bom.test.ts`

**Interfaces:**
- Produces: `BomLine = { ref, name, quantity, power_w, specs: string, complianceStatus: string, unitPrice: string, lineTotal: string }`; `buildBomLines(items: {ref, quantity}[]): BomLine[]` (resolves via `repo`, placeholder-aware prices through `formatPrice`); `toCsv(lines: BomLine[]): string` (RFC-4180-ish, header row, quoted cells). Consumed by `BomTable`/`ExportButton` (Task 16).

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { buildBomLines, toCsv } from "./bom";

describe("bom", () => {
  it("builds a line per item with placeholder-aware price", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 3 }]);
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toContain("Barra LED High Bay");
    expect(lines[0].quantity).toBe(3);
    expect(lines[0].unitPrice).toBe("Price on request");
    expect(lines[0].lineTotal).toBe("Price on request");
  });
  it("serializes to CSV with a header and quoted cells", () => {
    const csv = toCsv(buildBomLines([{ ref: "DMJR-TP200W003", quantity: 3 }]));
    const rows = csv.trim().split("\n");
    expect(rows[0]).toContain("Reference");
    expect(rows[1]).toContain("\"DMJR-TP200W003\"");
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `lib/bom.ts`**
```ts
import { repo } from "./repository";
import { formatPrice } from "./format";
import { hasRealValue } from "./placeholder";

export interface BomItem { ref: string; quantity: number; }
export interface BomLine {
  ref: string; name: string; quantity: number; power_w: number; specs: string;
  complianceStatus: string; unitPrice: string; lineTotal: string;
}
export function buildBomLines(items: BomItem[]): BomLine[] {
  const product = repo.getProduct();
  const commercial = repo.getCommercial();
  const ce = repo.getCompliance().ce;
  return items.map(({ ref, quantity }) => {
    const v = repo.getVariant(ref);
    const price = commercial.unit_prices?.[ref];
    const unitPrice = formatPrice(price, commercial.currency);
    const lineTotal = hasRealValue(price) && hasRealValue(commercial.currency)
      ? formatPrice(Number(price) * quantity, commercial.currency) : "Price on request";
    return {
      ref, name: product.name, quantity, power_w: v?.power_w ?? 0,
      specs: v ? `${v.power_w}W · ${v.length_mm}mm` : "",
      complianceStatus: hasRealValue(ce.value) ? ce.value : "—",
      unitPrice, lineTotal,
    };
  });
}
const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(lines: BomLine[]): string {
  const header = ["Reference", "Product", "Qty", "Specs", "Compliance", "Unit price", "Line total"];
  const rows = lines.map(l => [l.ref, l.name, l.quantity, l.specs, l.complianceStatus, l.unitPrice, l.lineTotal].map(esc).join(","));
  return [header.map(esc).join(","), ...rows].join("\n");
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add lib/bom.ts lib/bom.test.ts
git commit -m "feat: add BOM builder + CSV export"
```

---

## Task 8: Client state (cart, saved lists, comparison) with localStorage

**Files:**
- Create: `state/usePersistentState.ts`, `state/cart.tsx`, `state/lists.tsx`, `state/compare.tsx`, `app/providers.tsx`
- Modify: `app/layout.tsx` (wrap children in `<Providers>`)
- Test: `state/cart.test.tsx`

**Interfaces:**
- Produces hooks: `useCart()` → `{ items: BomItem[]; add(ref, qty); remove(ref); setQty(ref, qty); count: number; clear() }`; `useLists()` → `{ saved: string[]; toggle(ref); has(ref) }`; `useCompare()` → `{ refs: string[]; toggle(ref); has(ref); canAdd: boolean }` (max 4). All persist to `localStorage` keys `dmm.cart`, `dmm.lists`, `dmm.compare`. Consumed by Nav, ProductCard, calculator, BOM, compare pages.

- [ ] **Step 1: Write the failing test (cart reducer behavior)**
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

beforeEach(() => localStorage.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;

describe("useCart", () => {
  it("adds, increments, and counts items", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add("R1", 2));
    act(() => result.current.add("R1", 3));
    expect(result.current.items.find(i => i.ref === "R1")?.quantity).toBe(5);
    expect(result.current.count).toBe(5);
  });
  it("persists to localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add("R2", 1));
    expect(localStorage.getItem("dmm.cart")).toContain("R2");
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `state/usePersistentState.ts`**
```tsx
"use client";
import { useEffect, useState } from "react";
export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setState(JSON.parse(raw)); } catch {}
    setHydrated(true);
  }, [key]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state, hydrated]);
  return [state, setState] as const;
}
```

- [ ] **Step 4: Implement `state/cart.tsx`**
```tsx
"use client";
import { createContext, useContext } from "react";
import { usePersistentState } from "./usePersistentState";
import type { BomItem } from "@/lib/bom";

interface CartCtx { items: BomItem[]; add(ref: string, qty: number): void; remove(ref: string): void; setQty(ref: string, qty: number): void; clear(): void; count: number; }
const Ctx = createContext<CartCtx | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = usePersistentState<BomItem[]>("dmm.cart", []);
  const add = (ref: string, qty: number) => setItems(prev => {
    const f = prev.find(i => i.ref === ref);
    return f ? prev.map(i => i.ref === ref ? { ...i, quantity: i.quantity + qty } : i) : [...prev, { ref, quantity: qty }];
  });
  const remove = (ref: string) => setItems(prev => prev.filter(i => i.ref !== ref));
  const setQty = (ref: string, qty: number) => setItems(prev => prev.map(i => i.ref === ref ? { ...i, quantity: qty } : i));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return <Ctx.Provider value={{ items, add, remove, setQty, clear, count }}>{children}</Ctx.Provider>;
}
export function useCart() { const c = useContext(Ctx); if (!c) throw new Error("useCart outside CartProvider"); return c; }
```

- [ ] **Step 5: Implement `state/lists.tsx` and `state/compare.tsx`** (same pattern)
```tsx
// state/lists.tsx
"use client";
import { createContext, useContext } from "react";
import { usePersistentState } from "./usePersistentState";
interface ListsCtx { saved: string[]; toggle(ref: string): void; has(ref: string): boolean; }
const Ctx = createContext<ListsCtx | null>(null);
export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = usePersistentState<string[]>("dmm.lists", []);
  const toggle = (ref: string) => setSaved(p => p.includes(ref) ? p.filter(r => r !== ref) : [...p, ref]);
  const has = (ref: string) => saved.includes(ref);
  return <Ctx.Provider value={{ saved, toggle, has }}>{children}</Ctx.Provider>;
}
export function useLists() { const c = useContext(Ctx); if (!c) throw new Error("useLists outside ListsProvider"); return c; }
```
```tsx
// state/compare.tsx
"use client";
import { createContext, useContext } from "react";
import { usePersistentState } from "./usePersistentState";
const MAX = 4;
interface CompareCtx { refs: string[]; toggle(ref: string): void; has(ref: string): boolean; canAdd: boolean; clear(): void; }
const Ctx = createContext<CompareCtx | null>(null);
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [refs, setRefs] = usePersistentState<string[]>("dmm.compare", []);
  const toggle = (ref: string) => setRefs(p => p.includes(ref) ? p.filter(r => r !== ref) : (p.length < MAX ? [...p, ref] : p));
  const has = (ref: string) => refs.includes(ref);
  const clear = () => setRefs([]);
  return <Ctx.Provider value={{ refs, toggle, has, canAdd: refs.length < MAX, clear }}>{children}</Ctx.Provider>;
}
export function useCompare() { const c = useContext(Ctx); if (!c) throw new Error("useCompare outside CompareProvider"); return c; }
```

- [ ] **Step 6: Implement `app/providers.tsx` and wrap layout**
```tsx
"use client";
import { CartProvider } from "@/state/cart";
import { ListsProvider } from "@/state/lists";
import { CompareProvider } from "@/state/compare";
export function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider><ListsProvider><CompareProvider>{children}</CompareProvider></ListsProvider></CartProvider>;
}
```
In `app/layout.tsx` wrap `{children}` with `<Providers>...</Providers>` (import from `@/app/providers`).

- [ ] **Step 7: Run to verify it passes** — `npm run test -- state/cart.test.tsx` → PASS (2 tests).

- [ ] **Step 8: Commit**
```bash
git add state app/providers.tsx app/layout.tsx
git commit -m "feat: add cart/lists/compare context with localStorage persistence"
```

---

## Task 9: UI primitives + app shell (Nav, Footer, SearchBar)

**Files:**
- Create: `components/ui/Badge.tsx`, `components/ui/Chip.tsx`, `components/ui/SectionLabel.tsx`
- Create: `components/nav/Nav.tsx`, `components/nav/SearchBar.tsx`, `components/Footer.tsx`
- Test: `components/ui/Badge.test.tsx`

**Interfaces:**
- Produces: `<Badge>`, `<Chip>{label}`, `<SectionLabel>`, `<Nav>` (logo, categories, search, B2B Login, cart badge from `useCart().count`, compare/saved links), `<Footer>` (manufacturer info from `repo.getManufacturer()`). `<SearchBar value onChange>` controlled. Consumed by all pages.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its label", () => { render(<Chip label="200W" />); expect(screen.getByText("200W")).toBeInTheDocument(); });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement primitives**
```tsx
// components/ui/Chip.tsx
export function Chip({ label }: { label: string }) {
  return <span className="inline-block rounded bg-neutral-fill px-2 py-0.5 text-xs text-ink tabular">{label}</span>;
}
// components/ui/Badge.tsx
export function Badge({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs ${active ? "border-brand text-brand" : "border-aluminium text-ink"}`}>{children}</span>;
}
// components/ui/SectionLabel.tsx
export function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="section-label">{children}</p>; }
```

- [ ] **Step 4: Run to verify it passes** → PASS.

- [ ] **Step 5: Implement `Nav`, `SearchBar`, `Footer`** (Nav is a client component reading `useCart`)
```tsx
// components/nav/Nav.tsx
"use client";
import Link from "next/link";
import { useCart } from "@/state/cart";
import { useCompare } from "@/state/compare";
export function Nav() {
  const { count } = useCart();
  const { refs } = useCompare();
  return (
    <header className="sticky top-0 z-40 border-b border-aluminium bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="inline-block h-4 w-4 rotate-45 bg-brand" aria-hidden /> DoMusMat
        </Link>
        <nav className="hidden gap-4 text-sm text-aluminium-dark md:flex" aria-label="Categorias">
          <span className="rounded bg-neutral-fill px-2 py-1 text-ink">Lighting</span><span>Materials</span><span>Fixtures</span>
        </nav>
        <div className="flex-1" />
        <Link href="/compare" className="text-sm">Comparar ({refs.length})</Link>
        <Link href="/lists" className="text-sm">Listas</Link>
        <button className="rounded border border-aluminium px-3 py-1.5 text-sm">B2B Login</button>
        <Link href="/lists" aria-label="Orçamento" className="relative">
          🛒{count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-xs text-white">{count}</span>}
        </Link>
      </div>
    </header>
  );
}
```
```tsx
// components/nav/SearchBar.tsx
"use client";
export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="search" value={value} onChange={e => onChange(e.target.value)}
    aria-label="Pesquisar produtos" placeholder="Search products, references..."
    className="w-full rounded border border-aluminium px-3 py-2 text-sm" />;
}
```
```tsx
// components/Footer.tsx
import { repo } from "@/lib/repository";
export function Footer() {
  const m = repo.getManufacturer();
  return (
    <footer className="mt-16 border-t border-aluminium bg-neutral-fill">
      <div className="mx-auto max-w-[1440px] px-6 py-10 text-sm text-aluminium-dark">
        <p className="font-semibold text-ink">{m.name}</p>
        <p>{m.address}</p><p>{m.phone} · {m.email}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Commit**
```bash
git add components/ui components/nav components/Footer.tsx
git commit -m "feat: add UI primitives + app shell (nav, search, footer)"
```

---

## Task 10: Catalogue grid page (cards, filters, search, sort, save, compare)

**Files:**
- Create: `components/catalogue/ProductCard.tsx`, `components/catalogue/FilterSidebar.tsx`, `components/catalogue/SortDropdown.tsx`, `components/catalogue/SaveButton.tsx`, `components/catalogue/CatalogueView.tsx`
- Modify: `app/page.tsx`
- Test: `components/catalogue/ProductCard.test.tsx`, `components/catalogue/FilterSidebar.test.tsx`

**Interfaces:**
- Consumes: `repo`, `useLists`, `useCompare`, `formatPrice`, `SearchBar`, `Chip`, `Badge`.
- Produces: `<CatalogueView>` (client) owning search/filter/sort state and rendering the grid; `<ProductCard variant>`; `<FilterSidebar variants selected onChange>` deriving facets (Power, IP, Color temp, Material, Certification, Application) from data; `filterVariants(variants, filters, query)` pure helper exported from `CatalogueView` module or `lib/filter.ts`.

- [ ] **Step 1: Write the failing test for filtering logic**

Create `lib/filter.ts` test `lib/filter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { filterVariants } from "./filter";
import { repo } from "./repository";

const all = repo.getVariants();
describe("filterVariants", () => {
  it("filters by power", () => {
    const out = filterVariants(all, { power: [200], ip: [], colorTemp: [] }, "");
    expect(out.map(v => v.ref)).toEqual(["DMJR-TP200W003"]);
  });
  it("matches search query against ref and power", () => {
    expect(filterVariants(all, { power: [], ip: [], colorTemp: [] }, "300").length).toBe(1);
  });
  it("returns all with empty filters/query", () => {
    expect(filterVariants(all, { power: [], ip: [], colorTemp: [] }, "")).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `lib/filter.ts`**
```ts
import type { Variant } from "./types";
export interface CatalogueFilters { power: number[]; ip: number[]; colorTemp: string[]; }
// All variants of this product line share IP65 (from shared_specifications).
// TODO: read per-variant IP when the data model supports it.
const SHARED_IP = 65;
export function filterVariants(variants: Variant[], f: CatalogueFilters, query: string): Variant[] {
  const ip = SHARED_IP;
  const q = query.trim().toLowerCase();
  return variants.filter(v => {
    if (f.power.length && !f.power.includes(v.power_w)) return false;
    if (f.ip.length && !f.ip.includes(ip)) return false;
    if (q && !(`${v.ref} ${v.power_w}w ${v.length_mm}mm`.toLowerCase().includes(q))) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (3 tests).

- [ ] **Step 5: Implement `ProductCard` + test**
```tsx
// components/catalogue/ProductCard.tsx
"use client";
import Link from "next/link";
import { repo } from "@/lib/repository";
import { formatPrice } from "@/lib/format";
import { Chip } from "@/components/ui/Chip";
import { SaveButton } from "./SaveButton";
import { useCompare } from "@/state/compare";
import type { Variant } from "@/lib/types";

export function ProductCard({ variant }: { variant: Variant }) {
  const commercial = repo.getCommercial();
  const ct = useCompare();
  const price = formatPrice(commercial.unit_prices?.[variant.ref], commercial.currency);
  return (
    <div className="group flex flex-col rounded border border-aluminium bg-white">
      <Link href={`/products/${variant.ref}`} className="relative block bg-neutral-fill p-6">
        <div className="absolute right-3 top-3 hidden rounded border border-aluminium bg-white px-2 py-0.5 text-xs group-hover:block">View 3D</div>
        <div className="flex h-40 items-center justify-center text-aluminium-dark tabular">{variant.power_w}W · IP65</div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs text-aluminium-dark tabular">{variant.ref}</p>
        <p className="font-semibold">Barra LED High Bay {variant.power_w}W</p>
        <div className="flex flex-wrap gap-1">
          <Chip label={`${variant.power_w}W`} /><Chip label="IP65" /><Chip label="4000K" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold tabular">{price}</span>
          <span className="text-xs text-aluminium-dark">excl. VAT</span>
        </div>
        <div className="flex gap-2">
          <SaveButton ref_={variant.ref} />
          <button onClick={() => ct.toggle(variant.ref)} disabled={!ct.has(variant.ref) && !ct.canAdd}
            className={`rounded border px-2 py-1 text-xs ${ct.has(variant.ref) ? "border-brand text-brand" : "border-aluminium"}`}>
            {ct.has(variant.ref) ? "✓ Comparar" : "+ Comparar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```
Test `ProductCard.test.tsx` (wrap in providers): asserts ref, name, "Price on request" render.
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import { CompareProvider } from "@/state/compare";
import { ListsProvider } from "@/state/lists";
import { repo } from "@/lib/repository";

it("shows ref, name and price-on-request", () => {
  const v = repo.getVariant("DMJR-TP200W003")!;
  render(<ListsProvider><CompareProvider><ProductCard variant={v} /></CompareProvider></ListsProvider>);
  expect(screen.getByText("DMJR-TP200W003")).toBeInTheDocument();
  expect(screen.getByText("Barra LED High Bay 200W")).toBeInTheDocument();
  expect(screen.getByText("Price on request")).toBeInTheDocument();
});
```

- [ ] **Step 6: Implement `SaveButton`, `SortDropdown`, `FilterSidebar`, `CatalogueView`**
```tsx
// components/catalogue/SaveButton.tsx
"use client";
import { useLists } from "@/state/lists";
export function SaveButton({ ref_ }: { ref_: string }) {
  const { has, toggle } = useLists();
  return <button onClick={() => toggle(ref_)} aria-pressed={has(ref_)}
    className={`rounded border px-2 py-1 text-xs ${has(ref_) ? "border-brand text-brand" : "border-aluminium"}`}>
    {has(ref_) ? "★ Guardado" : "☆ Guardar"}</button>;
}
```
`FilterSidebar`: render checkbox groups for Power (from `variants.map(v=>v.power_w)`), IP (65), Color temp (3000/4000/5000K), plus static Material/Certification/Application sections; call `onChange`. `SortDropdown`: Featured / Power asc / Power desc. `CatalogueView`: holds `useState` for filters, query, sort; computes `filterVariants` + sort; renders `SearchBar`, breadcrumb + `{count} resultados`, `SortDropdown`, sidebar, and the card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).

- [ ] **Step 7: Wire `app/page.tsx`**
```tsx
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { CatalogueView } from "@/components/catalogue/CatalogueView";
export default function Home() {
  return (<><Nav /><CatalogueView /><Footer /></>);
}
```

- [ ] **Step 8: Run tests + dev smoke**

Run: `npm run test` → all green. Run `npm run build` → succeeds. Manually: `npm run dev`, load `/`, confirm 4 cards, filters narrow the grid, search works, "Price on request" shows, compare/save toggle.

- [ ] **Step 9: Commit**
```bash
git add lib/filter.ts lib/filter.test.ts components/catalogue app/page.tsx
git commit -m "feat: catalogue grid with filters, search, sort, save, compare"
```

---

## Task 11: 3D viewer + detail page shell (model-viewer, variant selector, cert badges, spec table)

**Files:**
- Create: `components/detail/ModelViewer.tsx`, `components/detail/ViewerControls.tsx`, `components/detail/VariantSelector.tsx`, `components/detail/CertBadges.tsx`, `components/detail/SpecTable.tsx`, `components/detail/DetailView.tsx`
- Create: `app/products/[ref]/page.tsx`
- Test: `components/detail/SpecTable.test.tsx`

**Interfaces:**
- Consumes: `repo`, `formatDimensions`, `Badge`, `useCart`, `useCompare`.
- Produces: `<ModelViewer src>` (client, dynamically imports `@google/model-viewer`, orbit/zoom/fullscreen + reset via ref); `<VariantSelector variants selected onSelect>` segmented control; `<CertBadges>` from `shared_specifications.certificates` + IP + energy class; `<SpecTable variant>` zebra key/value; `<DetailView ref_>` orchestrating selected-variant state. Produces `generateStaticParams` for the 4 refs.

- [ ] **Step 1: Write the failing test (SpecTable renders spec rows incl. dimensions)**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpecTable } from "./SpecTable";
import { repo } from "@/lib/repository";

it("renders dimensions and power for a variant", () => {
  render(<SpecTable variant={repo.getVariant("DMJR-TP200W003")!} />);
  expect(screen.getByText("1200 × 150 × 67 mm")).toBeInTheDocument();
  expect(screen.getByText(/200\s*W/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `SpecTable`**
```tsx
import { repo } from "@/lib/repository";
import { formatDimensions } from "@/lib/format";
import type { Variant } from "@/lib/types";
export function SpecTable({ variant }: { variant: Variant }) {
  const s = repo.getProduct(); void s;
  const rows: [string, string][] = [
    ["Potência", `${variant.power_w} W`],
    ["Dimensões (C×L×A)", formatDimensions(variant.length_mm, variant.width_mm, variant.height_mm)],
    ["Tensão", "120–277 V"], ["Eficácia luminosa", "130–135 lm/W"],
    ["Temperatura de cor", "3000/4000/5000 K"], ["CRI", "83"], ["IP", "IP65"],
    ["Ângulo de feixe", "120°"], ["Acabamento", "Branco"], ["Material", "Alumínio"],
    ["Classe energética", "A+"], ["Garantia", "3 anos"],
  ];
  return (
    <table className="w-full text-sm">
      <tbody>{rows.map(([k, v], i) => (
        <tr key={k} className={i % 2 ? "bg-neutral-fill" : ""}>
          <th scope="row" className="py-2 pl-3 pr-4 text-left font-normal text-aluminium-dark">{k}</th>
          <td className="py-2 pr-3 tabular">{v}</td>
        </tr>))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run to verify it passes** → PASS.

- [ ] **Step 5: Implement `ModelViewer` (client, SSR-safe)**
```tsx
"use client";
import { useEffect, useRef } from "react";
export function ModelViewer({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLElement & { resetTurntableRotation?: () => void; cameraOrbit?: string }>(null);
  useEffect(() => { import("@google/model-viewer"); }, []);
  const reset = () => { const el = ref.current as any; if (el) el.cameraOrbit = "0deg 75deg 105%"; };
  const fullscreen = () => { (ref.current as any)?.requestFullscreen?.(); };
  return (
    <div className="relative rounded border border-aluminium bg-gradient-to-b from-white to-neutral-fill">
      {/* @ts-expect-error custom element */}
      <model-viewer ref={ref} src={src} alt={alt} camera-controls auto-rotate touch-action="pan-y"
        shadow-intensity="1" exposure="0.9" style={{ width: "100%", height: "480px" }} />
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button onClick={reset} aria-label="Repor vista" className="rounded border border-aluminium bg-white px-2 py-1 text-xs">Reset</button>
        <button onClick={fullscreen} aria-label="Ecrã inteiro" className="rounded border border-aluminium bg-white px-2 py-1 text-xs">⛶</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement `VariantSelector`, `CertBadges`, `DetailView`, page**

`VariantSelector`: segmented buttons over `variants`, active = brand border, calls `onSelect(ref)`. `CertBadges`: map `["CE","RoHS","ETL","FCC","IP65","A+"]` to `<Badge>`. `DetailView` (client): `useState(selectedRef)`, renders two-column layout — left `ModelViewer src="/models/high_bay_led_bar.glb"` ( `// TODO: per-variant GLB models` ) + thumbnail strip placeholder; right title/descriptor/`CertBadges`/`VariantSelector`; below `SpecTable`, then slots (filled by later tasks) for BIM downloads (Task 12), compliance (Task 13), standardized sheet + installation (Task 14B), supply-chain timeline (Task 14C), and order calculator (Task 14) — leave typed placeholders `{/* BimDownloadsCenter */}` etc. to be filled by those tasks. `app/products/[ref]/page.tsx`:
```tsx
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { DetailView } from "@/components/detail/DetailView";
import { repo } from "@/lib/repository";
import { notFound } from "next/navigation";
export function generateStaticParams() { return repo.getVariants().map(v => ({ ref: v.ref })); }
export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!repo.getVariant(ref)) notFound();
  return (<><Nav /><main className="mx-auto max-w-[1440px] px-6 py-8"><DetailView ref_={ref} /></main><Footer /></>);
}
```

- [ ] **Step 7: Build + smoke** — `npm run build` succeeds; `npm run dev` → open `/products/DMJR-TP200W003`, model loads, orbit/zoom/reset/fullscreen work, variant selector switches spec table.

- [ ] **Step 8: Commit**
```bash
git add components/detail app/products
git commit -m "feat: product detail page with 3D viewer, variant selector, spec table"
```

---

## Task 12: BIM downloads center + metadata summary

**Files:**
- Create: `components/detail/BimDownloadsCenter.tsx`, `components/detail/BimMetadataSummary.tsx`
- Modify: `components/detail/DetailView.tsx` (mount under spec table)
- Test: `components/detail/BimDownloadsCenter.test.tsx`

**Interfaces:**
- Consumes: `repo.getBimAssets(ref)`, `repo.getBimMetadata(ref)`, `hasRealValue`.
- Produces: `<BimDownloadsCenter ref_>` — primary row (IFC, RFA) + secondary grid; each asset renders an enabled download link when `hasRealValue(asset.file)`, else a disabled "Coming soon" button. `<BimMetadataSummary ref_>` — lists product ID, dimensions, materials, IFC properties, version (placeholder-aware).

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BimDownloadsCenter } from "./BimDownloadsCenter";

it("enables GLB/STL and disables IFC/RFA as coming soon", () => {
  render(<BimDownloadsCenter ref_="DMJR-TP200W003" />);
  const glb = screen.getByRole("link", { name: /glb|glTF/i });
  expect(glb).toHaveAttribute("href", "/models/high_bay_led_bar.glb");
  expect(screen.getAllByText(/Coming soon/i).length).toBeGreaterThan(0); // IFC/RFA/DWG/etc
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `BimDownloadsCenter`**
```tsx
import { repo } from "@/lib/repository";
import { hasRealValue } from "@/lib/placeholder";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { BimAsset } from "@/lib/types";

function AssetRow({ a }: { a: BimAsset }) {
  const ready = hasRealValue(a.file);
  if (ready) return (
    <a href={a.file} download className="flex items-center justify-between rounded border border-aluminium px-3 py-2 text-sm hover:border-brand">
      <span>{a.label} <span className="text-aluminium-dark">· {a.format}</span></span>
      <span className="text-xs text-aluminium-dark tabular">{a.size}</span>
    </a>
  );
  return (
    <button disabled className="flex items-center justify-between rounded border border-dashed border-aluminium px-3 py-2 text-sm text-aluminium-dark">
      <span>{a.label} <span>· {a.format}</span></span><span className="text-xs">Coming soon</span>
    </button>
  );
}
export function BimDownloadsCenter({ ref_ }: { ref_: string }) {
  const assets = repo.getBimAssets(ref_);
  const primary = assets.filter(a => a.primary);
  const secondary = assets.filter(a => !a.primary);
  return (
    <section className="space-y-3">
      <SectionLabel>BIM & CAD downloads</SectionLabel>
      <div className="grid gap-2 sm:grid-cols-2">{primary.map(a => <AssetRow key={a.format} a={a} />)}</div>
      <div className="grid gap-2 sm:grid-cols-3">{secondary.map(a => <AssetRow key={a.format} a={a} />)}</div>
    </section>
  );
}
```

- [ ] **Step 4: Implement `BimMetadataSummary`** (placeholder-aware key/value list reading `repo.getBimMetadata(ref_)`; render "—" via `resolvePlaceholder` for missing fields; guard when metadata record is undefined).

- [ ] **Step 5: Mount both in `DetailView`** under the spec table.

- [ ] **Step 6: Run test + build** → PASS; `npm run build` succeeds.

- [ ] **Step 7: Commit**
```bash
git add components/detail/BimDownloadsCenter.tsx components/detail/BimMetadataSummary.tsx components/detail/DetailView.tsx components/detail/BimDownloadsCenter.test.tsx
git commit -m "feat: BIM downloads center + metadata summary (placeholder-aware)"
```

---

## Task 13: Compliance panel

**Files:**
- Create: `components/detail/CompliancePanel.tsx`
- Modify: `components/detail/DetailView.tsx`
- Test: `components/detail/CompliancePanel.test.tsx`

**Interfaces:**
- Consumes: `repo.getCompliance()`, `hasRealValue`.
- Produces: `<CompliancePanel>` rendering CE, DoP, Euroclass, VOC, EPD, DPP rows; each shows a status chip (green "Declared"/"Available" when real, grey "Pending"/"Coming soon" when placeholder) and a document link when present.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompliancePanel } from "./CompliancePanel";

it("shows CE as available and DoP/EPD as pending", () => {
  render(<CompliancePanel />);
  expect(screen.getByText("CE")).toBeInTheDocument();
  expect(screen.getByText("DoP")).toBeInTheDocument();
  expect(screen.getAllByText(/Pending|Coming soon/i).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `CompliancePanel`**
```tsx
import { repo } from "@/lib/repository";
import { hasRealValue } from "@/lib/placeholder";
import { SectionLabel } from "@/components/ui/SectionLabel";
const LABELS: Record<string, string> = { ce: "CE", dop: "DoP", euroclass: "Euroclass (fogo)", voc: "VOC", epd: "EPD", acoustic: "Acústica", dpp: "DPP" };
export function CompliancePanel() {
  const c = repo.getCompliance();
  return (
    <section className="space-y-3">
      <SectionLabel>Compliance</SectionLabel>
      <ul className="divide-y divide-aluminium rounded border border-aluminium">
        {Object.entries(LABELS).map(([key, label]) => {
          const f = (c as any)[key]; const ready = hasRealValue(f.value);
          return (
            <li key={key} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{label}</span>
              <span className="flex items-center gap-3">
                {hasRealValue(f.document) && <a href={f.document} className="text-brand underline">Documento</a>}
                <span className={`rounded px-2 py-0.5 text-xs ${ready ? "bg-green-100 text-green-800" : "bg-neutral-fill text-aluminium-dark"}`}>
                  {ready ? (hasRealValue(f.value) ? f.value : "Declared") : "Pending"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Mount in `DetailView`; run test + build** → PASS; build succeeds.

- [ ] **Step 5: Commit**
```bash
git add components/detail/CompliancePanel.tsx components/detail/DetailView.tsx components/detail/CompliancePanel.test.tsx
git commit -m "feat: per-product compliance panel (CE/DoP/Euroclass/VOC/EPD/DPP)"
```

---

## Task 14: Order calculator UI (sticky)

**Files:**
- Create: `components/calculator/QuantityStepper.tsx`, `components/calculator/TierProgressBar.tsx`, `components/calculator/OrderCalculator.tsx`
- Modify: `components/detail/DetailView.tsx`
- Test: `components/calculator/QuantityStepper.test.tsx`, `components/calculator/OrderCalculator.test.tsx`

**Interfaces:**
- Consumes: `calculateOrder`, `repo.getCommercial`, `formatPrice`, `formatLeadTime`, `useCart`.
- Produces: `<QuantityStepper value min onChange>` (keyboard-operable: −/input/+); `<TierProgressBar result>`; `<OrderCalculator ref_>` (client) computing `calculateOrder` on quantity change, showing price-on-request/contact-for-lead-time when `!result.available`, totals disabled; CTAs "Adicionar ao orçamento" (brand, calls `useCart().add`), "Adicionar à lista de materiais", "Pedir preço personalizado"; VAT fine print.

- [ ] **Step 1: Write the failing tests**
```tsx
// QuantityStepper.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuantityStepper } from "./QuantityStepper";
it("does not go below min", () => {
  const onChange = vi.fn();
  render(<QuantityStepper value={1} min={1} onChange={onChange} />);
  fireEvent.click(screen.getByLabelText("Diminuir quantidade"));
  expect(onChange).not.toHaveBeenCalledWith(0);
});
```
```tsx
// OrderCalculator.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderCalculator } from "./OrderCalculator";
import { CartProvider } from "@/state/cart";
it("shows price-on-request with placeholder commercial data", () => {
  render(<CartProvider><OrderCalculator ref_="DMJR-TP200W003" /></CartProvider>);
  expect(screen.getByText(/Price on request/i)).toBeInTheDocument();
  expect(screen.getByText(/Contact for lead time/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /orçamento/i })).toBeEnabled();
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement `QuantityStepper`**
```tsx
"use client";
export function QuantityStepper({ value, min, onChange }: { value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center rounded border border-aluminium">
      <button aria-label="Diminuir quantidade" className="px-3 py-1" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input aria-label="Quantidade" type="number" min={min} value={value} className="w-16 border-x border-aluminium px-2 py-1 text-center tabular"
        onChange={e => onChange(Math.max(min, Number(e.target.value) || min))} />
      <button aria-label="Aumentar quantidade" className="px-3 py-1" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
```

- [ ] **Step 4: Implement `TierProgressBar` + `OrderCalculator`**
```tsx
// OrderCalculator.tsx
"use client";
import { useState } from "react";
import { repo } from "@/lib/repository";
import { calculateOrder } from "@/lib/pricing";
import { formatPrice, formatLeadTime } from "@/lib/format";
import { t } from "@/lib/strings";
import { useCart } from "@/state/cart";
import { QuantityStepper } from "./QuantityStepper";
import { TierProgressBar } from "./TierProgressBar";

export function OrderCalculator({ ref_ }: { ref_: string }) {
  const commercial = repo.getCommercial();
  const [qty, setQty] = useState(1);
  const r = calculateOrder({ ref: ref_, quantity: qty, commercial });
  const { add } = useCart();
  return (
    <aside className="sticky top-20 space-y-4 rounded border border-aluminium p-4 lg:max-w-sm">
      <p className="section-label">Orçamento / Encomenda</p>
      <p className="text-sm text-aluminium-dark tabular">{ref_}</p>
      <QuantityStepper value={qty} min={r.minOrderQty} onChange={setQty} />
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between"><dt>Preço unitário</dt><dd className="tabular">{formatPrice(r.discountedUnitPrice ?? r.unitPrice, commercial.currency)}</dd></div>
        <div className="flex justify-between"><dt>Total</dt><dd className="tabular">{r.available ? formatPrice(r.total, commercial.currency) : t.priceOnRequest}</dd></div>
        <div className="flex justify-between"><dt>Prazo de entrega</dt><dd>{formatLeadTime(r.leadTimeDays)}</dd></div>
      </dl>
      {r.available && <TierProgressBar result={r} />}
      <button onClick={() => add(ref_, qty)} className="w-full rounded bg-brand py-2 text-white">{t.addToQuote}</button>
      <button onClick={() => add(ref_, qty)} className="w-full rounded border border-aluminium py-2 text-sm">{t.addToBom}</button>
      <button className="w-full rounded border border-aluminium py-2 text-sm">{t.requestCustomPricing}</button>
      <p className="text-xs text-aluminium-dark">{t.vatNote}</p>
    </aside>
  );
}
```
`TierProgressBar`: shows active tier and `unitsToNextTier` hint when `nextTier` present.

- [ ] **Step 5: Mount in `DetailView` (right rail desktop, sticky bottom on mobile via `fixed bottom-0 lg:static`); run tests + build** → PASS; build succeeds.

- [ ] **Step 6: Commit**
```bash
git add components/calculator components/detail/DetailView.tsx
git commit -m "feat: sticky B2B order calculator (placeholder-aware)"
```

---

## Task 14A: Analytics stub (data sedimentation / 数据沉淀)

**Files:**
- Create: `lib/analytics.ts`
- Create: `state/analytics.tsx` (provider + `useAnalytics` hook)
- Modify: `app/providers.tsx` (wrap with `AnalyticsProvider`)
- Modify: `components/catalogue/ProductCard.tsx` (track `view` on click), `components/detail/DetailView.tsx` (track `view` on variant select), `components/calculator/OrderCalculator.tsx` (track `add_to_bom`/`add_to_quote`)
- Test: `lib/analytics.test.ts`

**Interfaces:**
- Produces: `type AnalyticsEvent = { type: "view"|"add_to_bom"|"add_to_quote"|"download"; ref: string; category?: string; region?: string; ts: number }`; interface `AnalyticsSink { track(e: Omit<AnalyticsEvent,"ts">): void; all(): AnalyticsEvent[] }`; class `LocalAnalyticsSink implements AnalyticsSink` (persists to `localStorage` key `dmm.analytics`); `useAnalytics()` hook returning the sink. Phase 2: `SupabaseAnalyticsSink` (same interface).

- [ ] **Step 1: Write the failing test** (ts injected so `Date.now` is not needed inside the unit)
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { LocalAnalyticsSink } from "./analytics";

beforeEach(() => localStorage.clear());
describe("LocalAnalyticsSink", () => {
  it("records events with a region placeholder and reads them back", () => {
    const sink = new LocalAnalyticsSink();
    sink.track({ type: "view", ref: "DMJR-TP200W003" });
    sink.track({ type: "add_to_bom", ref: "DMJR-TP200W003" });
    const all = sink.all();
    expect(all).toHaveLength(2);
    expect(all[0].type).toBe("view");
    expect(all[0].region).toBe("PLACEHOLDER");
  });
  it("persists across instances via localStorage", () => {
    new LocalAnalyticsSink().track({ type: "download", ref: "R9" });
    expect(new LocalAnalyticsSink().all().some(e => e.ref === "R9")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm run test -- lib/analytics.test.ts` → FAIL.

- [ ] **Step 3: Implement `lib/analytics.ts`**
```ts
export type AnalyticsEventType = "view" | "add_to_bom" | "add_to_quote" | "download";
export interface AnalyticsEvent { type: AnalyticsEventType; ref: string; category?: string; region?: string; ts: number; }
export interface AnalyticsSink { track(e: Omit<AnalyticsEvent, "ts">): void; all(): AnalyticsEvent[]; }

const KEY = "dmm.analytics";
// Phase 2: swap for SupabaseAnalyticsSink (same interface) to aggregate
// selection frequency, project-category demand, and regional differences server-side.
export class LocalAnalyticsSink implements AnalyticsSink {
  all(): AnalyticsEvent[] {
    if (typeof localStorage === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  track(e: Omit<AnalyticsEvent, "ts">): void {
    if (typeof localStorage === "undefined") return;
    const event: AnalyticsEvent = { region: "PLACEHOLDER", ...e, ts: Date.now() };
    const next = [...this.all(), event];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (2 tests).

- [ ] **Step 5: Implement `state/analytics.tsx` + wrap providers**
```tsx
"use client";
import { createContext, useContext, useRef } from "react";
import { LocalAnalyticsSink, type AnalyticsSink } from "@/lib/analytics";
const Ctx = createContext<AnalyticsSink | null>(null);
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const sink = useRef<AnalyticsSink>(new LocalAnalyticsSink());
  return <Ctx.Provider value={sink.current}>{children}</Ctx.Provider>;
}
export function useAnalytics(): AnalyticsSink {
  const c = useContext(Ctx); if (!c) throw new Error("useAnalytics outside AnalyticsProvider"); return c;
}
```
Wrap `app/providers.tsx`'s tree with `<AnalyticsProvider>` (outermost).

- [ ] **Step 6: Wire tracking calls** — `ProductCard` `onClick` of the link → `track({type:"view", ref})`; `DetailView` on variant select → `track({type:"view", ref})`; `OrderCalculator` "Add to quote" → `track({type:"add_to_quote", ref})`, "Add to BOM" → `track({type:"add_to_bom", ref})`.

- [ ] **Step 7: Commit**
```bash
git add lib/analytics.ts lib/analytics.test.ts state/analytics.tsx app/providers.tsx components/catalogue/ProductCard.tsx components/detail/DetailView.tsx components/calculator/OrderCalculator.tsx
git commit -m "feat: client-side analytics stub (data sedimentation, Supabase-ready)"
```

---

## Task 14B: Standardized product sheet + installation details

**Files:**
- Create: `components/detail/StandardSheet.tsx`, `components/detail/InstallationDetails.tsx`
- Modify: `components/detail/DetailView.tsx` (mount below the spec table)
- Test: `components/detail/StandardSheet.test.tsx`

**Interfaces:**
- Consumes: `repo.getStandardization()`, `resolvePlaceholder`, `SectionLabel`.
- Produces: `<StandardSheet>` — key/value rows for unified parameters: price range (价格区间), delivery period (交付周期), maintenance cycle (维护周期); placeholder-aware via `resolvePlaceholder(v, "—")`. `<InstallationDetails>` — instructions text, mounting-node list, and a document link (安装说明/安装节点), each placeholder-aware ("Coming soon" when absent).

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandardSheet } from "./StandardSheet";

it("renders standardized rows with em-dash placeholders", () => {
  render(<StandardSheet />);
  expect(screen.getByText("Faixa de preço")).toBeInTheDocument();
  expect(screen.getByText("Prazo de entrega")).toBeInTheDocument();
  expect(screen.getByText("Ciclo de manutenção")).toBeInTheDocument();
  expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `StandardSheet`**
```tsx
import { repo } from "@/lib/repository";
import { resolvePlaceholder } from "@/lib/placeholder";
import { SectionLabel } from "@/components/ui/SectionLabel";
export function StandardSheet() {
  const s = repo.getStandardization();
  const rows: [string, string][] = [
    ["Faixa de preço", String(resolvePlaceholder(s.price_range, "—"))],
    ["Prazo de entrega", String(resolvePlaceholder(s.delivery_period, "—"))],
    ["Ciclo de manutenção", String(resolvePlaceholder(s.maintenance_cycle, "—"))],
  ];
  return (
    <section className="space-y-3">
      <SectionLabel>Ficha padronizada</SectionLabel>
      <dl className="rounded border border-aluminium">
        {rows.map(([k, v], i) => (
          <div key={k} className={`flex justify-between px-3 py-2 text-sm ${i % 2 ? "bg-neutral-fill" : ""}`}>
            <dt className="text-aluminium-dark">{k}</dt><dd className="tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Implement `InstallationDetails`** (reads `repo.getStandardization().installation`; render `instructions` or "Coming soon"; if `mounting_nodes` is an array render a `<ul>`, else "—"; document link when `hasRealValue`).

- [ ] **Step 5: Mount both in `DetailView`; run test + build** → PASS; build succeeds.

- [ ] **Step 6: Commit**
```bash
git add components/detail/StandardSheet.tsx components/detail/InstallationDetails.tsx components/detail/DetailView.tsx components/detail/StandardSheet.test.tsx
git commit -m "feat: standardized product sheet + installation details (placeholder-aware)"
```

---

## Task 14C: Supply-chain / delivery-node timeline

**Files:**
- Create: `components/detail/SupplyChainTimeline.tsx`
- Modify: `components/detail/DetailView.tsx`
- Test: `components/detail/SupplyChainTimeline.test.tsx`

**Interfaces:**
- Consumes: `repo.getSupplyChain()`, `resolvePlaceholder`, `SectionLabel`.
- Produces: `<SupplyChainTimeline>` — a horizontal node row over `delivery_nodes` (Produção → Expedição → Transporte → Em obra), each node showing its label + status/eta (placeholder-aware), plus a stock line. No real feed in MVP.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupplyChainTimeline } from "./SupplyChainTimeline";

it("renders all four delivery-node stages", () => {
  render(<SupplyChainTimeline />);
  ["Produção", "Expedição", "Transporte", "Em obra"].forEach(l =>
    expect(screen.getByText(l)).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `SupplyChainTimeline`**
```tsx
import { repo } from "@/lib/repository";
import { resolvePlaceholder, hasRealValue } from "@/lib/placeholder";
import { SectionLabel } from "@/components/ui/SectionLabel";
export function SupplyChainTimeline() {
  const sc = repo.getSupplyChain();
  return (
    <section className="space-y-3">
      <SectionLabel>Cadeia de abastecimento</SectionLabel>
      <ol className="flex items-center gap-2">
        {sc.delivery_nodes.map((n, i) => (
          <li key={n.label} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded border border-aluminium p-2 text-center">
              <p className="text-sm">{n.label}</p>
              <p className="text-xs text-aluminium-dark">
                {hasRealValue(n.status) ? n.status : "—"} · {String(resolvePlaceholder(n.eta, "ETA —"))}
              </p>
            </div>
            {i < sc.delivery_nodes.length - 1 && <span className="text-aluminium-dark" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <p className="text-xs text-aluminium-dark">Stock: {String(resolvePlaceholder(sc.stock, "Sob consulta"))}</p>
    </section>
  );
}
```

- [ ] **Step 4: Mount in `DetailView`; run test + build** → PASS; build succeeds.

- [ ] **Step 5: Commit**
```bash
git add components/detail/SupplyChainTimeline.tsx components/detail/DetailView.tsx components/detail/SupplyChainTimeline.test.tsx
git commit -m "feat: supply-chain delivery-node timeline (placeholder-aware)"
```

---

## Task 15: Compare page

**Files:**
- Create: `components/compare/ComparisonTable.tsx`, `app/compare/page.tsx`
- Test: `components/compare/ComparisonTable.test.tsx`

**Interfaces:**
- Consumes: `useCompare`, `repo`, `formatDimensions`, `formatPrice`.
- Produces: `<ComparisonTable refs>` rendering a column per selected ref with rows: power, dimensions, IP, color temp, price (placeholder-aware), compliance summary. `app/compare/page.tsx` reads `useCompare().refs`; empty state when none selected.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonTable } from "./ComparisonTable";
it("renders a column per ref with power rows", () => {
  render(<ComparisonTable refs={["DMJR-TP120W001","DMJR-TP300W004"]} />);
  expect(screen.getByText("DMJR-TP120W001")).toBeInTheDocument();
  expect(screen.getByText("DMJR-TP300W004")).toBeInTheDocument();
  expect(screen.getByText("120 W")).toBeInTheDocument();
  expect(screen.getByText("300 W")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `ComparisonTable`** (resolve each ref via `repo.getVariant`; build rows array; render `<table>` with a header per ref and one row per attribute; price via `formatPrice`).

- [ ] **Step 4: Implement `app/compare/page.tsx`** (client wrapper: `const { refs } = useCompare();` → empty state or `<ComparisonTable refs={refs} />`, with `Nav`/`Footer`).

- [ ] **Step 5: Run test + build** → PASS; build succeeds.

- [ ] **Step 6: Commit**
```bash
git add components/compare app/compare
git commit -m "feat: product comparison page"
```

---

## Task 16: Saved lists + BOM builder/export page

**Files:**
- Create: `components/bom/BomTable.tsx`, `components/bom/ExportButton.tsx`, `components/bom/BomBuilder.tsx`, `components/lists/SavedLists.tsx`, `app/lists/page.tsx`
- Test: `components/bom/BomTable.test.tsx`, `components/bom/ExportButton.test.tsx`

**Interfaces:**
- Consumes: `useCart`, `useLists`, `repo`, `buildBomLines`, `toCsv`.
- Produces: `<SavedLists>` (lists saved refs with link + remove); `<BomTable lines>` rendering the BOM; `<ExportButton lines>` downloading a CSV via Blob and offering `window.print()`; `<BomBuilder>` reading `useCart().items`, computing `buildBomLines`, rendering table + totals + export. `app/lists/page.tsx` composes both.

- [ ] **Step 1: Write the failing tests**
```tsx
// BomTable.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BomTable } from "./BomTable";
import { buildBomLines } from "@/lib/bom";
it("renders a row per BOM line", () => {
  render(<BomTable lines={buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }])} />);
  expect(screen.getByText("DMJR-TP200W003")).toBeInTheDocument();
  expect(screen.getByText("Price on request")).toBeInTheDocument();
});
```
```tsx
// ExportButton.test.tsx — assert a download anchor is produced
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportButton } from "./ExportButton";
import { buildBomLines } from "@/lib/bom";
it("creates a CSV object URL on export", () => {
  const spy = vi.fn(() => "blob:mock");
  (URL as any).createObjectURL = spy; (URL as any).revokeObjectURL = vi.fn();
  render(<ExportButton lines={buildBomLines([{ ref: "DMJR-TP200W003", quantity: 1 }])} />);
  fireEvent.click(screen.getByRole("button", { name: /CSV/i }));
  expect(spy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement `BomTable`** (zebra `<table>` with columns Reference/Product/Qty/Specs/Compliance/Unit price/Line total mapping `BomLine`).

- [ ] **Step 4: Implement `ExportButton`**
```tsx
"use client";
import { toCsv } from "@/lib/bom";
import type { BomLine } from "@/lib/bom";
export function ExportButton({ lines }: { lines: BomLine[] }) {
  const exportCsv = () => {
    const blob = new Blob([toCsv(lines)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "domusmat-bom.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex gap-2 no-print">
      <button onClick={exportCsv} className="rounded border border-aluminium px-3 py-1.5 text-sm">Exportar CSV</button>
      <button onClick={() => window.print()} className="rounded border border-aluminium px-3 py-1.5 text-sm">Imprimir / PDF</button>
    </div>
  );
}
```

- [ ] **Step 5: Implement `BomBuilder`, `SavedLists`, `app/lists/page.tsx`** (BomBuilder: `const { items } = useCart(); const lines = buildBomLines(items);` → empty state, else `<BomTable>` + `<ExportButton>`. Page wraps `Nav`/`Footer` and shows `<SavedLists/>` then `<BomBuilder/>`).

- [ ] **Step 6: Run tests + build + full smoke** — `npm run test` all green; `npm run build` succeeds. Manual end-to-end: catalogue → add to quote → `/lists` shows BOM → export CSV downloads → print preview hides nav/buttons.

- [ ] **Step 7: Commit**
```bash
git add components/bom components/lists app/lists
git commit -m "feat: saved lists + BOM builder with CSV/print export"
```

---

## Task 17: Responsive + accessibility pass

**Files:**
- Modify: `components/detail/DetailView.tsx`, `components/catalogue/CatalogueView.tsx`, `app/globals.css`
- Test: manual + `npm run build`

**Interfaces:** No new exports; refines layout/ARIA only.

- [ ] **Step 1: Detail layout responsive** — wrap two columns in `grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8`; on mobile the `OrderCalculator` becomes `fixed inset-x-0 bottom-0` sticky bar (`lg:static`). Verify at 375px the viewer stacks on top.
- [ ] **Step 2: Catalogue sidebar** — `hidden lg:block` with a mobile "Filtros" toggle button that reveals it.
- [ ] **Step 3: A11y sweep** — ensure every `<button>`/icon has an accessible name (`aria-label`), images/model have `alt`, filter checkboxes have `<label htmlFor>`, color contrast for brand-on-white text ≥ 4.5:1 (use brand only on white bg/large text or with white foreground on brand bg).
- [ ] **Step 4: Verify** — `npm run build` succeeds; manual resize 1440→375; keyboard-tab through stepper, viewer buttons, filters.
- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "polish: responsive layout + accessibility pass"
```

---

## Task 18: README + BIM content guide + final verification

**Files:**
- Create/Modify: `README.md`
- Create: `docs/bim-content-production.md`

**Interfaces:** Docs only.

- [ ] **Step 0: Write `docs/bim-content-production.md`** — the realistic authoring guide (the on-page 3D viewer uses GLB and is unrelated to BIM files). Cover: why mesh→BIM (GLB/STL→IFC/RFA) conversion yields rejected "dumb solids"; the recommended paths — **IFC 4** authored parametrically with `IfcLightFixture` + `Pset_LightFixtureTypeCommon` + specs as properties (imports into both Revit and ArchiCAD); **Revit `.RFA`** authored in Revit (Family Editor / Revit API / pyRevit/Dynamo) or via a content service; **ArchiCAD** via GDL or IFC import; and content services (CADENAS PARTcommunity, ProdLib, BIMobject). Emphasize **photometric files (IES `.ies` / EULUMDAT `.ldt`)** as the highest-value, most-attainable lighting asset (export from manufacturer photometric data; used in DIALux/Relux/Revit). State that the catalogue's download center is format-agnostic and placeholder-aware, so each asset goes live by setting its `file`/`size` in `bim_assets[ref]` — no code change.

- [ ] **Step 1: Write `README.md`** covering: the product vision (a digital BIM library where designers spec products and the buy order auto-generates from the design); prerequisites (Node 18+); `npm install && npm run dev`; project structure; **where real data goes** (`data/product_data.json` — replace `"PLACEHOLDER"` values in `commercial`, `compliance` (incl. `acoustic`), `standardization` (price range, delivery period, maintenance cycle, installation), `supply_chain` (stock, delivery_nodes), `bim_assets[ref].file/size`, `bim_metadata`); how the placeholder system works; **how to add per-variant GLB models** (drop files in `public/models/`, point `bim_assets[ref]` GLB `file` at them, update `ModelViewer src` selection per ref — note the existing `// TODO: per-variant GLB models`); the `DMJR-`/`DMSL-` prefix TODO; the analytics events captured locally (`dmm.analytics`) and the `AnalyticsSink` → `SupabaseAnalyticsSink` swap; the `ProductRepository` → Supabase Phase 2 migration path; and the **Phase 2 roadmap** (SaaS/full-stack backend, analytics aggregation/data-sedimentation, real supply-chain feeds, 3D real-space/Blender rendering per `domus_mat_claude_code_handoff.md`, RBAC/collaboration, ERP/PIM/CRM/BIM integrations, full DPP, embedded BIM metadata).
- [ ] **Step 2: Final full verification**

Run:
```bash
npm run test
npm run build
```
Expected: all tests pass; build succeeds with the 4 static product routes generated.

- [ ] **Step 3: Commit**
```bash
git add README.md docs/bim-content-production.md
git commit -m "docs: add README + BIM content production guide"
```

---

## Self-Review Notes (spec coverage)

- Catalogue functions (search/filter/compare/saved lists) → Tasks 8, 10, 15.
- 3D viewer (orbit/zoom/reset/fullscreen) → Task 11.
- B2B order calculator (placeholder-aware, tiers, lead time) → Tasks 6, 14.
- BIM downloads center incl. ArchiCAD/Revit (IFC/RFA primary; PLA/DWG/GLB/STL/PDF secondary) + BIM metadata → Tasks 2, 12.
- Compliance layer (CE/DoP/Euroclass-fire/VOC/EPD/acoustic/DPP) → Tasks 2, 13.
- Standardized product sheet (unified params, price range, delivery period, maintenance cycle) + installation details (安装说明/安装节点) → Tasks 2, 14B.
- Supply-chain transparency / delivery-node visualization (placeholder-aware) → Tasks 2, 14C.
- Data sedimentation / analytics stub (selection frequency, category, region) → Task 14A.
- Design↔buy-order loop (auto-generate purchase list from selection) → Tasks 7, 14, 16.
- BOM + spec export (CSV/print, traceability foundation) → Tasks 7, 16.
- Owned data backbone + repository (SaaS/Supabase-ready) → Tasks 2, 4.
- 3D product content via interactive `<model-viewer>` (real-space Blender render = Phase 2 hook) → Task 11.
- Placeholder/never-fabricate rule → Tasks 3, 5, and enforced throughout.
- Design system, responsive, a11y, i18n, footer, documented quirks → Tasks 1, 9, 17, 18.
- Phase 2 items (real backend/SaaS, analytics aggregation, real supply-chain feeds, Blender real-space rendering, RBAC/collaboration, ERP/PIM/CRM, full DPP, embedded BIM metadata) are intentionally NOT tasked (documented in spec + README).
```
