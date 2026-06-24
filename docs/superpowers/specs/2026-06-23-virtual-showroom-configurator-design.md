# Virtual Showroom Configurator — Design Spec

**Date:** 2026-06-23
**Status:** Approved (pending spec review)

## Vision

**A browser-embedded 3D configurator where a customer picks products, drops
them into a real room, assigns finishes, and walks around the result.**

An interactive showroom layer for **DoMusMat**, built *on top of* the existing
catalogue (this app). The customer selects products from the catalogue, is taken
to a preset empty room, and assigns **materials and items to different areas** of
the space, viewing it live in 3D. This is the real-time *configurator* tier; it
does **not** try to replace D5 Render — polished output is a separate tier (see
Rendering strategy).

### North star (target end-state)

The final deliverable looks and feels like a **D5 360° panorama "roaming" tour**
(krpano) — reference: D5 showreel personal-krpano tour, supplied 2026-06-23. The
user **drags to look around in 360°** and **clicks to jump between roam points**;
the imagery is **photoreal, path-traced, baked**. Because baked panos can't reflect
live edits, customization and presentation are **two stages** (see Rendering
strategy → reconciliation):

```text
STAGE 1 — CUSTOMIZE (live WebGL configurator)  ──finalize──▶  STAGE 2 — D5 pano-roam tour (baked)
```

This spec builds **Stage 1** (the configurator). Stage 2 (the pano tour) is the
deferred Tier-2 deliverable it feeds. Our prototyped click-walk + drag-look
navigation already matches the pano-roam UX, so the two stages share a feel.

> Derived from `~/Downloads/virtual_showroom_project_spec.md`, narrowed by
> brainstorming on 2026-06-23 and validated by a throwaway interaction prototype
> at `app/configurator-prototype/` (see its `NOTES.md` for the approved
> interaction model). Default room reference:
> `docs/superpowers/specs/assets/configurator-default-floorplan.md`.

## Two distinct products (scope clarification, 2026-06-24)

The "virtual showroom" idea splits into **two separate products**; this spec/build is the **first**:

1. **Customer Visualizer (THIS project)** — a configurator that shows **only the
   items the customer selected** (from the cart) so they can see how their picks
   look and pair together in a room. Entry = cart → playground. Selected-items-only.
2. **Virtual Showroom (separate, future project)** — an IKEA-style space where
   **all DomusMat products** are present in one walkable showroom; users roam and
   **click an item for more info**. All-items, browse-and-inspect. NOT built here.

The two share tech (R3F, GLB assets, click-walk navigation) but differ in purpose
and content. Everything below describes the **Customer Visualizer**.

## Scope of THIS spec

This spec covers **the real-time configurator / customer visualizer (Tier 1)** only.

**In scope:**
- A `/configurator` route inside this Next.js app.
- Entry from the existing catalogue: the cart/saved-list is the "picked parts" set.
- Preset empty rooms (no floor-plan editor).
- Assign surface materials + place/move/rotate/delete items, via the validated
  interaction model.
- The **scene-document** as the single source of truth.
- Tier-1 visual quality (baked lighting + PBR + postprocessing).

**Explicitly OUT (deferred, documented as roadmap):**
- **BOM / quantity calculation** — deferred to a later phase by request.
- User-drawn / uploaded floor plans.
- Accounts / server persistence (save = client-side + shareable link for now).
- Tier 1.5 (in-browser path tracing) and Tier 2 (offline render) — see gates below.
- AI assists, multi-room at launch, AR/VR.

## Locked decisions

| Area | Decision | Notes |
|---|---|---|
| Host | This app (Next.js 16 / React 19 / TS / Tailwind v4) | A new route, not a separate Vite app. |
| 3D engine | **react-three-fiber + drei** | React-native, declarative; maps 1:1 onto the scene-document. Not Babylon, not model-viewer (single-object only). |
| State | **Zustand** | The scene-document store + undo. Cleaner than React Context for an editable graph. (Prototype used `useState` — throwaway.) |
| Visual polish | `@react-three/postprocessing` | SSAO + bloom + ACES tone-mapping for Tier 1. |
| Collision | **Custom** (bounds-clamp + `allowedSurfaces`) | Not Rapier — defer physics until a feature needs it. |
| Rooms | **Fixed preset rooms; default = the 40′×30′ house floor plan** | See `assets/configurator-default-floorplan.md`. Multi-room shell, not a single box. |
| Navigation | **Click-to-walk + drag-to-look** | Validated in prototype; matches the pano-roam UX; not WASD, not pointer-lock. |
| Assets | Clean 3D source exists; **client produces GLBs** | Slice A is the gating dependency. |
| Desktop | None (browser only) | Electron/Tauri are future-only. |

## Architecture

```text
Catalogue (existing)
  └─ cart / saved list  ──"Open in playground"──▶  /configurator route
                                                      │
                                   ┌──────────────────┴───────────────────┐
                                   │  Zustand store = the SCENE DOCUMENT   │  ← source of truth
                                   │  { room, surfaces, items }            │
                                   └──────────────────┬───────────────────┘
                                                      │ renders
                                   R3F <Canvas>: room shell + surfaces + placed items
                                   + click-walk camera + postprocessing
```

The **3D is a view of the scene-document.** Save, share, undo, and every future
render tier read the same JSON. Framing the product as "a JSON document + a rules
engine, viewed in 3D" keeps the riskiest parts (data model) explicit.

### Scene-document schema

```jsonc
{
  "room": "house-40x30",                  // which preset shell (default floor plan)
  "surfaces": {                           // material per named surface/zone (per-room floors)
    "floor-master":      "tile-marble-01",
    "floor-family":      "oak-engineered",
    "wall-master-n":     "panel-walnut",
    "ceiling":           "paint-white"
  },
  "items": [                              // placed catalogue products
    { "id": "item-1", "ref": "balizador-de-jardim-led",
      "surface": "floor", "pos": [1.2, 0, 0.8], "rotY": 1.57 }
  ]
}
```

### Product configurator-metadata (added to product JSON)

```jsonc
{
  "ref": "...", "modelUrl": "/models/....glb",
  "realDimsMm": { "w": 600, "h": 2400, "d": 18 },
  "allowedSurfaces": ["wall"],            // floor | wall | ceiling
  "snapMode": "vertical_surface"
}
```

Units: products authored in **mm**, scene in **metres** (1 R3F unit = 1 m).

### Preset room (default = the 40′×30′ house)

The default room is the supplied house floor plan — a **multi-room shell**
(bedrooms, bathroom, master, closet, open-plan family/dining/kitchen, washroom)
with interior walls, doors, and window openings. Full modeling reference + room
schedule: `assets/configurator-default-floorplan.md`. The GLB exposes **named
surface meshes**, with **floors split per-room** (so each area takes its own
finish) and walls per-segment. Static shell → lighting can be baked. Built-in
fixtures (toilet, vanity, kitchen counters, W/D) are modeled into the shell by
default (confirm with client). More rooms are added later as additional presets.

## Interaction model (validated — from prototype `NOTES.md`)

- **Camera:** drag to look (grab-the-world sense, both axes; sensitivity ~0.003
  rad/px); click floor → smooth walk (lerp 0.18, eye height 1.6 m, clamped off walls).
- **Paint:** select material → click a surface to retexture it.
- **Place:** select item → click a *valid* surface (`allowedSurfaces`); stays in
  add-mode for repeats; **Esc** exits add/paint → walk/look.
- **Move:** single-click selects (ring); **double-click → locked move mode**
  (camera + walk freeze, green ring) → drag the item on floor *or* wall (snap +
  orientation recomputed from surface under cursor); **Save ✓** commits + unlocks.
  Rotate (R), Delete (⌫) throughout.

Rules start as **hardcoded surface-type checks**; generalize to a rules engine
only when a product breaks the pattern (YAGNI).

## Rendering strategy (tiers + gates)

The live viewer is never made to *be* D5 — quality is delivered in tiers that
share the same assets + scene-document.

- **Tier 1 — live browser viewer (THIS spec):** rasterized, "good enough."
  Recipe: baked lightmaps on the static shell, HDRI environment, PBR materials
  (KTX2), postprocessing (SSAO contact shadows, bloom for LEDs, ACES tone-map),
  TAA/SMAA.
- **Tier 1.5 — in-browser path tracing (deferred):** a "✨ Render" button that
  freezes the current config and progressively path-traces it
  (`three-gpu-pathtracer`). **Gate:** Tier 1 shipped + scene-document stable +
  demand for shareable stills + want to stay backendless. Cheapest quality lever.
- **Tier 2 — D5 360° pano-roam tour (deferred; the north-star deliverable):**
  from a *finalized* scene-document, render **photoreal 360° panoramas at fixed
  roam points** and present them as a **krpano roaming tour** (drag to look,
  click hotspot to jump) — matching the supplied D5 reference. Rendering path:
  **D5 Render** (its native pano-tour export, likely **manual/semi-manual** — no
  public API) or **headless Blender (Cycles, Python, equirectangular cameras)**
  for automation. **Gate (all three):** need photoreal/tour quality + a backend
  (render queue + storage) exists + volume justifies it. Until then, premium
  tours are produced by a designer in D5 by hand (same GLBs → reproducible).

Prerequisite for 1.5 and 2: the scene-document schema is locked.

### Reconciliation: live customization ↔ baked pano tour

Baked panoramas cannot reflect arbitrary live edits, so the product is **two
stages**: customize live (Tier 1 WebGL), then **finalize → render Stage-2 panos
for that exact configuration**. Implication: a faithful D5 pano tour costs **one
render job per finalized config** (minutes/roam-point, on a backend) — which is
precisely why Stage 2 is deferred behind a backend. Cheaper interim approximations
of the look, in priority order: push **Tier 1** (baked shell lighting + HDRI/IBL +
PBR + SSAO/bloom), then add **Tier 1.5** (in-browser path-traced *still* of the
current view) for a shareable high-quality frame without a backend. Full Stage-2
pano tours come last.

## Build slices (sequenced)

1. **A — Assets & schema** *(gating; mostly Blender + schema, little app code)*:
   finalize scene-document + product configurator-metadata; model the **default
   40′×30′ house** GLB with per-room named surface meshes + door/window openings
   (per `assets/configurator-default-floorplan.md`), plus **3–5 product GLBs** +
   tileable materials, via a repeatable export standard (gltf-transform/gltfpack +
   KTX2). Nothing downstream is real until this exists.
2. **B — Viewer + click-walk** *(tracer bullet)*: `/configurator` route, Zustand
   store, load room GLB, click-walk camera, catalogue→configurator entry.
3. **C — Authoring**: surface painting + item place/move/rotate/delete, porting
   the validated prototype mechanics; `allowedSurfaces` rule.
4. **D — Persistence**: save/load the scene-document (client-side + shareable link).
5. **E — later**: Tier 1.5 in-browser render button → **Tier 2 D5 pano-roam tour
   pipeline (the north-star deliverable)** → BOM, AI assists, more rooms.

Order: **A → B → C → D**, then E gated as above.

## Success criteria

- A user can, from the catalogue, open selected parts in a preset room, assign
  finishes + place items, and walk around — no developer help.
- The scene-document round-trips (save → reload → identical scene).
- Tier-1 visuals read as a believable showroom (not a flat prototype).
- Perf: initial room load < 5–10 s on broadband; ≥ 30 FPS on a modern laptop;
  lightweight GLBs; 1K–2K textures.

## Key risks

- **Asset pipeline (top risk):** source → clean web GLB is manual Blender labour,
  not a button. Mitigate: tight export standard, start with 3–5 products.
- **Baked-lighting vs dynamic scene:** bake the *static shell only*; light placed/
  swapped items with cheap real-time PBR + IBL — don't try to bake moving objects.
- **Perf:** Draco/Meshopt + KTX2 + LODs; cap pixel ratio + frame rate; limit
  real-time shadows (lean on SSAO + baked).
```
