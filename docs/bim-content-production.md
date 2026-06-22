# BIM Content Production Guide

A practical guide for producing BIM/CAD assets for the DoMusMat catalogue.

> **Important distinction:** The on-page 3D viewer uses **GLB** (binary glTF) purely for visual display — orbit, zoom, fullscreen. GLB is unrelated to the downloadable BIM files. BIM assets are the files architects and engineers import into Revit, ArchiCAD, or other AEC tools to place a *parametric, data-carrying* representation of the product in their project model.

---

## Why mesh-to-BIM conversion fails

It is tempting to convert existing GLB or STL files into IFC or RFA using automated tools. The result is almost always rejected by BIM workflows:

- **"Dumb solids"** — the geometry carries no parametric data, no IFC property sets, no classification. Revit will import it as a mass family, not a `IfcLightFixture` or `IfcFurnishingElement`.
- **No Psets** — energy analysis, scheduling, quantity take-off, and fire/accessibility checks all depend on property sets (`Pset_LightingEmitter`, `Pset_ManufacturerTypeInformation`, etc.). These cannot be inferred from mesh geometry.
- **Wrong class hierarchy** — an `IfcLightFixture` placed as a ceiling-mounted object behaves differently from a generic solid in clash detection and COBie exports.
- **No type/instance split** — BIM authoring separates type-level properties (manufacturer, model, lumen output) from instance-level ones (host face, orientation, circuit). Mesh conversion conflates both.

The short version: **mesh → BIM conversion yields content that looks right but is rejected by real project workflows.**

---

## Recommended production paths

### Option A: IFC 4 authored parametrically (open standard)

Produce native IFC 4 files using a capable authoring tool. Do not export from mesh.

- Assign the correct IFC class: `IfcLightFixture` for luminaires; `IfcCovering` for flooring and skirting boards; `IfcDoor` for doors; `IfcFurnishingElement` for decorative items.
- Populate standard Psets: `Pset_LightingEmitter` (for luminaires), `Pset_ManufacturerTypeInformation`, `Pset_EnvironmentalImpactValues` (for EPD data).
- Add custom Psets for DoMusMat-specific data (finish, colour, variant ref, DoP reference).
- Tools: **BlenderBIM** (free, powerful IFC 4 authoring), **FreeCAD + IFC** plugin, **Archicad** native IFC export (see Option C).

### Option B: Revit RFA family

The dominant format for the European commercial interior sector.

**Author in Revit Family Editor:**
- Start from the correct host family template (`Wall-Based`, `Ceiling-Based`, `Floor-Based`, etc.).
- Add type parameters for all variant-level data (power, lumen output, CCT, CRI, finish, colour).
- Expose instance parameters for site-specific data (circuit, dimming zone).
- Assign the correct OmniClass / UniClass code.

**Automation options:**
- **Revit API (C#)** — batch-generate families from a spreadsheet of product variants.
- **pyRevit / Dynamo** — script-driven family creation; good for parametric geometry that changes per variant.

**Content services (recommended for scale):**
- [CADENAS PARTcommunity](https://partcommunity.com) — structured BIM content production, multi-format delivery (RFA, IFC, DWG, STEP).
- [ProdLib](https://prodlib.com) — Scandinavian market focus; strong Revit and ArchiCAD coverage; used by lighting and furniture manufacturers.
- [BIMobject](https://bimobject.com) — large distribution platform; also offers content production services.

These services produce the RFA from manufacturer product data and handle multi-format outputs. They are the fastest path to compliant, hostable BIM content at catalogue scale.

### Option C: ArchiCAD via GDL or IFC import

- **GDL (Geometric Description Language)** is ArchiCAD's native parametric object format. GDL objects can carry all parameter types and respond to ArchiCAD's schedules and energy tools.
- Alternatively, a well-authored IFC 4 file (Option A) imports cleanly into ArchiCAD and retains Psets.

---

## Photometric files: the highest-value, most-attainable asset

For lighting products, **IES** (`.ies`, North American standard) and **EULUMDAT** (`.ldt`, European standard) files are the single most useful assets a lighting manufacturer can publish. They are:

- Required by lighting simulation software (DIALux, Relux, AGi32, Autodesk Insight).
- Small files — typically 5–50 KB.
- Produced by a photometric lab as part of CE/LVD testing, which DoMusMat products already undergo.
- Often already in the manufacturer's possession and simply not published.

**Action:** Request `.ies` and `.ldt` files from the lighting supplier or testing lab for each luminaire family. Upload them as BIM assets (see below). These will activate immediately in the download center with no code change.

---

## How the download center works

The download center in `/products/[id]` is **format-agnostic and placeholder-aware**. Each product record in `data/product_data.json` has a `bim_assets` array:

```json
"bim_assets": [
  { "format": "IES", "label": "Ficheiro fotométrico IES", "file": "PLACEHOLDER", "size": "PLACEHOLDER" },
  { "format": "RFA", "label": "Família Revit", "file": "PLACEHOLDER", "size": "PLACEHOLDER" },
  { "format": "IFC", "label": "IFC 4", "file": "PLACEHOLDER", "size": "PLACEHOLDER" }
]
```

**To publish an asset:**
1. Upload the file to `/public/bim/` (or a CDN path).
2. Set `"file"` to the path/URL and `"size"` to the human-readable file size (e.g. `"42 KB"`).
3. The download center displays the asset immediately — no code change, no redeploy needed if using a CDN.

Assets with `"PLACEHOLDER"` show the fallback string `"Disponível a pedido"` and do not render a download link.

**These placeholders are intentional human-engineer fill-in points.** BIM content cannot be auto-generated from mesh geometry (see above) — it requires structured authoring or a content service engagement. The catalogue is built to go live progressively as assets become available, product by product, format by format.

---

## Recommended production order

1. **IES / LDT** — obtain from the testing lab; publish immediately. Highest demand from lighting designers.
2. **IFC 4** — author parametrically (BlenderBIM or content service). Works across platforms.
3. **RFA** — engage a content service (CADENAS, ProdLib, or BIMobject) for Revit family authoring. Prioritise the highest-volume or highest-margin product lines first.
4. **GDL** — if ArchiCAD demand is identified from analytics, commission GDL objects for the top families.

---

## File naming convention

Recommended: `{ref}_{format}_{version}.{ext}`

Examples:
- `DMJR-001_IES_v1.ies`
- `DMJR-001_RFA_v1.rfa`
- `DMJR-001_IFC4_v1.ifc`

Use the variant ref (e.g. `DMJR-001`) rather than the product slug so the filename is stable across catalogue updates.

---

## Checklist before publishing a BIM asset

- [ ] Correct IFC class or Revit family category assigned
- [ ] All variant-level parameters populated (power, CCT, CRI, finish, dimensions)
- [ ] Manufacturer and model name match the catalogue record exactly
- [ ] Psets populated: `Pset_ManufacturerTypeInformation` at minimum; `Pset_LightingEmitter` for luminaires
- [ ] File tested by importing into Revit / ArchiCAD / a BIM viewer
- [ ] `file` and `size` set in `bim_assets` in `product_data.json`
- [ ] Analytics `download` event fires on the download button (confirm in browser console: `localStorage.getItem('dmm.analytics')`)
