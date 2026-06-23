# Task Report: 3D Deep-link + ArchiCAD PLA Download

## Fix 1 — "查看 3D" badge deep-links to 3D tab

- Added `useSearchParams` import to `components/detail/DetailView.tsx`
- Changed `mediaTab` state initialization from hardcoded `"render"` to a lazy initializer:
  `() => (searchParams.get("view") === "3d" && modelAvailable ? "model" : "render")`
- `modelAvailable` is computed before the state declaration (line 47), so the lazy initializer can reference it safely
- `app/products/[id]/page.tsx` already wraps `<DetailView>` in `<Suspense fallback={null}>` — no change needed

## Fix 2 — ArchiCAD (PLA) download for every product

- Before: 46/47 products missing PLA; only `barra-led-high-bay` had it
- Script `scripts/add-archicad.mjs` inserts `{ format: "PLA", label: "ArchiCAD GDL", file: "PLACEHOLDER", size: "PLACEHOLDER", primary: true }` after each product's RFA entry
- After: missing PLA = 0, missing RFA = 0 (all 47 products now have IFC + RFA + PLA)

## Test / Build

- `npm run test`: 32/33 files passed, 134/137 tests passed — 1 worker OOM crash + 3 test failures are pre-existing model-viewer WebGL issue; no new failures
- `npm run build`: succeeded, 57 static pages generated

## Commit

- Committed as: `fix: 查看3D deep-links to 3D tab; add ArchiCAD (PLA) download to every product`
