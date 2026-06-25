# Virtual Showroom Configurator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real-time, browser-embedded 3D configurator (Tier 1) inside this Next.js app: pick parts from the catalogue, drop into the default house floor plan, assign materials/items per area, and walk around in 3D.

**Architecture:** A `/configurator` route renders a react-three-fiber scene driven by a single Zustand **scene-document** store (`{ room, surfaces, items }`). All editing logic (paint, place, move, rotate, delete, serialize) lives in pure, unit-tested functions + the store; the R3F layer is a thin view over that state, ported from the validated prototype (`app/configurator-prototype/`). Room geometry comes from a **RoomShell provider** that returns a primitive shell now and a GLB-derived shell once slice-A assets exist — so app code never blocks on Blender.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, react-three-fiber + drei + three, Zustand, Vitest + Testing Library.

## Global Constraints

- **Next.js 16 is not the Next.js in training data.** Per `AGENTS.md`, before writing route/config code read the relevant guide in `node_modules/next/dist/docs/`. Follow existing route conventions (`app/<name>/page.tsx`, `"use client"` for interactive components).
- **Units:** products authored in **mm**; scene in **metres** (1 R3F unit = 1 m). Convert at the metadata boundary only.
- **No BOM** in this phase. No backend, no accounts. **Save = client-side (localStorage) + shareable URL** only.
- **3D engine:** react-three-fiber + drei. **State:** Zustand. **Collision:** custom (bounds-clamp + `allowedSurfaces`) — no Rapier.
- **Navigation:** click-to-walk + drag-to-look (grab-the-world sense, both axes; sensitivity 0.003 rad/px; eye height 1.6 m; position lerp 0.18). No WASD, no pointer-lock.
- **Default room:** the 40′×30′ house — see `docs/superpowers/specs/assets/configurator-default-floorplan.md`. Floors split per-room.
- **Tiers 1.5 / 2 (path-traced still, D5 pano-roam tour) are OUT** of this plan — north star only.
- **Perf targets:** room load < 5–10 s; ≥ 30 FPS on a modern laptop; KTX2 textures (1K–2K); Draco/Meshopt GLBs.
- Tests live beside source (existing convention: `state/cart.test.tsx`, `lib/bom.ts`). Run a single file with `npx vitest run <path>`.

---

## File Structure

- `lib/configurator/types.ts` — `SceneDocument`, `PlacedItem`, `SurfaceDef`, `SurfaceKind`, `RoomShell`, `ProductMeta`; `emptyScene()`.
- `lib/configurator/geometry.ts` — pure placement math/rules: `isAllowedSurface`, `snapPos`, `wallRotY`, `clampToBounds`.
- `lib/configurator/serialize.ts` — `encodeScene` / `decodeScene` (URL-safe).
- `lib/configurator/rooms.ts` — room registry: `primitiveHouse()` (dev shell), `roomShellFromGltf()` (real GLB → surfaces), `getRoomShell()`.
- `lib/configurator/products.ts` — `CONFIGURABLE_PRODUCTS: Record<ref, ProductMeta>` for the 3–5 MVP items + `MATERIALS`.
- `state/configurator.ts` — Zustand store: scene-document + tool/selection/edit state + actions.
- `components/configurator/CameraRig.tsx` — click-walk + drag-look (ported from prototype).
- `components/configurator/RoomShellView.tsx` — renders a `RoomShell`'s surfaces (primitive now, GLB later) + surface click/drag handlers.
- `components/configurator/ItemView.tsx` — renders one `PlacedItem` (primitive now, GLB later).
- `components/configurator/Scene.tsx` — assembles lights + RoomShellView + ItemView + CameraRig; routes pointer events to store actions.
- `components/configurator/Hud.tsx` — tool palette (walk / materials / items), edit banner, hints, live scene-doc dump.
- `app/configurator/page.tsx` — the route: reads cart, mounts `<Canvas>` + `<Hud>`, handles save/load-from-URL.
- Modify `app/cart/page.tsx` (or the cart component) — add **"Open in playground"** link to `/configurator`.

Tasks 1–4 and 9 are pure logic with full TDD. Tasks 5–8 are view/integration; their "tests" are scripted **manual verification** against `npm run dev` (WebGL can't run in jsdom). Task 10 is optional polish.

---

### Task 1: Scene-document & domain types

**Files:**
- Create: `lib/configurator/types.ts`
- Test: `lib/configurator/types.test.ts`

**Interfaces:**
- Produces: `SurfaceKind`, `SurfaceDef`, `RoomShell`, `ProductMeta`, `PlacedItem`, `SceneDocument`, `emptyScene(roomId: string): SceneDocument`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/types.test.ts
import { describe, it, expect } from "vitest";
import { emptyScene } from "./types";

describe("emptyScene", () => {
  it("creates an empty document for the given room", () => {
    const s = emptyScene("house-40x30");
    expect(s).toEqual({ room: "house-40x30", surfaces: {}, items: [] });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run lib/configurator/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write the types + factory**

```ts
// lib/configurator/types.ts
export type SurfaceKind = "floor" | "wall" | "ceiling";

/** A paintable / placeable surface. `pos/rot/size/normal` describe the primitive
 *  plane used for the dev shell and for snapping; the real GLB supplies the same
 *  metadata per named mesh. Positions in metres. */
export interface SurfaceDef {
  id: string;                 // e.g. "floor-master", "wall-master-n", "ceiling"
  kind: SurfaceKind;
  pos: [number, number, number];
  rot: [number, number, number];
  size: [number, number];
  normal: [number, number, number];
}

export interface RoomShell {
  id: string;
  surfaces: SurfaceDef[];
  bounds: { min: [number, number]; max: [number, number] }; // walkable x/z extent (m)
  eyeHeight: number;                                         // m
  defaultMaterials: Record<string, string>;                 // surfaceId -> materialId
}

export interface ProductMeta {
  ref: string;
  name: string;
  modelUrl?: string;                                  // undefined → primitive placeholder
  realDimsMm: { w: number; h: number; d: number };
  allowedSurfaces: SurfaceKind[];
}

export interface PlacedItem {
  id: string;
  ref: string;
  surface: string;                                    // surfaceId it is attached to
  pos: [number, number, number];                      // metres
  rotY: number;                                       // radians
}

export interface SceneDocument {
  room: string;
  surfaces: Record<string, string>;                   // surfaceId -> materialId
  items: PlacedItem[];
}

export function emptyScene(roomId: string): SceneDocument {
  return { room: roomId, surfaces: {}, items: [] };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run lib/configurator/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/configurator/types.ts lib/configurator/types.test.ts
git commit -m "feat(configurator): scene-document domain types"
```

---

### Task 2: Placement geometry & rules (pure)

**Files:**
- Create: `lib/configurator/geometry.ts`
- Test: `lib/configurator/geometry.test.ts`

**Interfaces:**
- Consumes: `SurfaceDef`, `SurfaceKind`, `ProductMeta` (Task 1).
- Produces:
  - `isAllowedSurface(meta: ProductMeta, kind: SurfaceKind): boolean`
  - `snapPos(surface: SurfaceDef, point: [number,number,number]): [number,number,number]`
  - `wallRotY(surface: SurfaceDef): number`
  - `clampToBounds(x: number, z: number, bounds, margin?: number): [number, number]`

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/geometry.test.ts
import { describe, it, expect } from "vitest";
import { isAllowedSurface, snapPos, wallRotY, clampToBounds } from "./geometry";
import type { SurfaceDef, ProductMeta } from "./types";

const floor: SurfaceDef = { id: "floor-x", kind: "floor", pos: [0,0,0], rot: [0,0,0], size: [4,3], normal: [0,1,0] };
const wallN: SurfaceDef = { id: "wall-n", kind: "wall", pos: [0,1.35,-1.5], rot: [0,0,0], size: [4,2.7], normal: [0,0,1] };
const panel: ProductMeta = { ref: "p", name: "Panel", realDimsMm: {w:600,h:1200,d:40}, allowedSurfaces: ["wall"] };

describe("rules", () => {
  it("allows only listed surface kinds", () => {
    expect(isAllowedSurface(panel, "wall")).toBe(true);
    expect(isAllowedSurface(panel, "floor")).toBe(false);
  });
});

describe("snapPos", () => {
  it("drops floor items to y=0 keeping x/z", () => {
    expect(snapPos(floor, [1.2, 5, 0.8])).toEqual([1.2, 0, 0.8]);
  });
  it("offsets wall items along the surface normal", () => {
    expect(snapPos(wallN, [1, 1.5, -1.5])).toEqual([1, 1.5, -1.5 + 0.03]);
  });
});

describe("wallRotY", () => {
  it("faces into the room from a north wall (normal +z)", () => {
    expect(wallRotY(wallN)).toBeCloseTo(Math.atan2(0, 1)); // 0
  });
});

describe("clampToBounds", () => {
  it("keeps a point inside the walkable area with a margin", () => {
    const b = { min: [-6, -4.5] as [number,number], max: [6, 4.5] as [number,number] };
    expect(clampToBounds(100, 100, b, 0.4)).toEqual([5.6, 4.1]);
    expect(clampToBounds(0, 0, b, 0.4)).toEqual([0, 0]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run lib/configurator/geometry.test.ts`
Expected: FAIL — cannot find module `./geometry`.

- [ ] **Step 3: Implement**

```ts
// lib/configurator/geometry.ts
import type { SurfaceDef, SurfaceKind, ProductMeta } from "./types";

export function isAllowedSurface(meta: ProductMeta, kind: SurfaceKind): boolean {
  return meta.allowedSurfaces.includes(kind);
}

/** Snap a raw raycast hit onto a surface. Floor → stand on ground; ceiling → hang
 *  at ceiling height; wall → flush against the wall, nudged along its normal. */
export function snapPos(surface: SurfaceDef, point: [number, number, number]): [number, number, number] {
  const [x, y, z] = point;
  if (surface.kind === "floor") return [x, 0, z];
  if (surface.kind === "ceiling") return [x, surface.pos[1], z];
  const [nx, , nz] = surface.normal;
  return [x + nx * 0.03, y, z + nz * 0.03];
}

/** Y rotation so a wall-mounted item faces into the room. */
export function wallRotY(surface: SurfaceDef): number {
  const [nx, , nz] = surface.normal;
  return Math.atan2(nx, nz);
}

export function clampToBounds(
  x: number,
  z: number,
  bounds: { min: [number, number]; max: [number, number] },
  margin = 0.4,
): [number, number] {
  return [
    Math.min(Math.max(x, bounds.min[0] + margin), bounds.max[0] - margin),
    Math.min(Math.max(z, bounds.min[1] + margin), bounds.max[1] - margin),
  ];
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run lib/configurator/geometry.test.ts`
Expected: PASS (all 6).

- [ ] **Step 5: Commit**

```bash
git add lib/configurator/geometry.ts lib/configurator/geometry.test.ts
git commit -m "feat(configurator): placement geometry + allowedSurfaces rule"
```

---

### Task 3: Scene-document serialization

**Files:**
- Create: `lib/configurator/serialize.ts`
- Test: `lib/configurator/serialize.test.ts`

**Interfaces:**
- Consumes: `SceneDocument` (Task 1).
- Produces: `encodeScene(doc): string`, `decodeScene(s): SceneDocument | null`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/serialize.test.ts
import { describe, it, expect } from "vitest";
import { encodeScene, decodeScene } from "./serialize";
import { emptyScene } from "./types";

describe("scene serialization", () => {
  it("round-trips a document", () => {
    const doc = { ...emptyScene("house-40x30"),
      surfaces: { "floor-master": "oak-01" },
      items: [{ id: "item-1", ref: "p", surface: "floor-master", pos: [1,0,1] as [number,number,number], rotY: 0 }] };
    expect(decodeScene(encodeScene(doc))).toEqual(doc);
  });
  it("returns null on garbage", () => {
    expect(decodeScene("not-valid-base64!!")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run lib/configurator/serialize.test.ts`
Expected: FAIL — cannot find module `./serialize`.

- [ ] **Step 3: Implement**

```ts
// lib/configurator/serialize.ts
import type { SceneDocument } from "./types";

// Material/surface ids are ascii slugs, so btoa/atob are safe here.
export function encodeScene(doc: SceneDocument): string {
  return encodeURIComponent(btoa(JSON.stringify(doc)));
}

export function decodeScene(s: string): SceneDocument | null {
  try {
    return JSON.parse(atob(decodeURIComponent(s))) as SceneDocument;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run lib/configurator/serialize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/configurator/serialize.ts lib/configurator/serialize.test.ts
git commit -m "feat(configurator): URL-safe scene-document serialization"
```

---

### Task 4: Zustand scene store (the core)

**Files:**
- Create: `state/configurator.ts`
- Test: `state/configurator.test.ts`
- Modify: `package.json` (add `zustand`)

**Interfaces:**
- Consumes: types (Task 1), `snapPos`/`wallRotY`/`isAllowedSurface` (Task 2).
- Produces: `useConfigurator` store with state `{ scene, tool, selectedId, editingId }` and actions `loadScene`, `setTool`, `paintSurface`, `placeItem`, `moveItem`, `rotateItem`, `deleteItem`, `select`, `beginEdit`, `saveEdit`, `escape`; plus `Tool` type and `__resetItemIds()` (test helper).

- [ ] **Step 1: Install zustand**

Run: `npm install zustand`
Expected: adds `zustand` to dependencies.

- [ ] **Step 2: Write the failing test**

```ts
// state/configurator.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useConfigurator, __resetItemIds } from "./configurator";
import type { ProductMeta, SurfaceDef } from "@/lib/configurator/types";

const floor: SurfaceDef = { id: "floor-master", kind: "floor", pos: [0,0,0], rot: [0,0,0], size: [4,3], normal: [0,1,0] };
const wall: SurfaceDef  = { id: "wall-master-n", kind: "wall", pos: [0,1.35,-1.5], rot: [0,0,0], size: [4,2.7], normal: [0,0,1] };
const lamp: ProductMeta = { ref: "balizador", name: "Bollard", realDimsMm: {w:100,h:900,d:100}, allowedSurfaces: ["floor"] };
const panel: ProductMeta = { ref: "panel", name: "Panel", realDimsMm: {w:600,h:1200,d:40}, allowedSurfaces: ["wall"] };

const s = () => useConfigurator.getState();

beforeEach(() => { useConfigurator.setState({ scene: { room: "house-40x30", surfaces: {}, items: [] }, tool: { kind: "look" }, selectedId: null, editingId: null }); __resetItemIds(); });

describe("paint", () => {
  it("assigns a material to a surface", () => {
    s().paintSurface("floor-master", "oak-01");
    expect(s().scene.surfaces["floor-master"]).toBe("oak-01");
  });
});

describe("place", () => {
  it("places an allowed item and selects it", () => {
    const id = s().placeItem(lamp, floor, [1.2, 9, 0.8]);
    expect(id).toBe("item-1");
    expect(s().scene.items).toHaveLength(1);
    expect(s().scene.items[0]).toMatchObject({ ref: "balizador", surface: "floor-master", pos: [1.2, 0, 0.8], rotY: 0 });
    expect(s().selectedId).toBe("item-1");
  });
  it("rejects an item on a disallowed surface", () => {
    expect(s().placeItem(panel, floor, [0,0,0])).toBeNull();
    expect(s().scene.items).toHaveLength(0);
  });
  it("orients wall items to face into the room", () => {
    s().placeItem(panel, wall, [1, 1.5, -1.5]);
    expect(s().scene.items[0].rotY).toBeCloseTo(0);
    expect(s().scene.items[0].pos[2]).toBeCloseTo(-1.47);
  });
});

describe("move / rotate / delete", () => {
  it("moves an item to a new surface point", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().moveItem(id, floor, [2, 0, 1]);
    expect(s().scene.items[0].pos).toEqual([2, 0, 1]);
  });
  it("rotates by a delta", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().rotateItem(id, Math.PI / 12);
    expect(s().scene.items[0].rotY).toBeCloseTo(Math.PI / 12);
  });
  it("deletes and clears selection/edit", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().beginEdit(id);
    s().deleteItem(id);
    expect(s().scene.items).toHaveLength(0);
    expect(s().selectedId).toBeNull();
    expect(s().editingId).toBeNull();
  });
});

describe("modes", () => {
  it("beginEdit locks to look tool and selects", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().setTool({ kind: "paint", material: "x" });
    s().beginEdit(id);
    expect(s().editingId).toBe(id);
    expect(s().tool).toEqual({ kind: "look" });
  });
  it("escape exits edit first, then exits tool", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().beginEdit(id);
    s().escape();                       // exits edit
    expect(s().editingId).toBeNull();
    s().setTool({ kind: "place", ref: "balizador" });
    s().escape();                       // exits tool
    expect(s().tool).toEqual({ kind: "look" });
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run state/configurator.test.ts`
Expected: FAIL — cannot find module `./configurator`.

- [ ] **Step 4: Implement the store**

```ts
// state/configurator.ts
import { create } from "zustand";
import type { SceneDocument, PlacedItem, SurfaceDef, ProductMeta } from "@/lib/configurator/types";
import { emptyScene } from "@/lib/configurator/types";
import { snapPos, wallRotY, isAllowedSurface } from "@/lib/configurator/geometry";

export type Tool =
  | { kind: "look" }
  | { kind: "paint"; material: string }
  | { kind: "place"; ref: string };

let idCounter = 0;
export function __resetItemIds() { idCounter = 0; } // tests only

interface ConfiguratorState {
  scene: SceneDocument;
  tool: Tool;
  selectedId: string | null;
  editingId: string | null;
  loadScene(doc: SceneDocument): void;
  setTool(tool: Tool): void;
  paintSurface(surfaceId: string, materialId: string): void;
  /** returns the new item id, or null if the surface is disallowed */
  placeItem(meta: ProductMeta, surface: SurfaceDef, point: [number, number, number]): string | null;
  moveItem(id: string, surface: SurfaceDef, point: [number, number, number]): void;
  rotateItem(id: string, deltaY: number): void;
  deleteItem(id: string): void;
  select(id: string | null): void;
  beginEdit(id: string): void;
  saveEdit(): void;
  escape(): void;
}

export const useConfigurator = create<ConfiguratorState>((set) => ({
  scene: emptyScene("house-40x30"),
  tool: { kind: "look" },
  selectedId: null,
  editingId: null,

  loadScene: (doc) => set({ scene: doc, selectedId: null, editingId: null, tool: { kind: "look" } }),
  setTool: (tool) => set({ tool, selectedId: null }),

  paintSurface: (surfaceId, materialId) =>
    set((st) => ({ scene: { ...st.scene, surfaces: { ...st.scene.surfaces, [surfaceId]: materialId } } })),

  placeItem: (meta, surface, point) => {
    if (!isAllowedSurface(meta, surface.kind)) return null;
    const id = `item-${++idCounter}`;
    const item: PlacedItem = {
      id, ref: meta.ref, surface: surface.id,
      pos: snapPos(surface, point),
      rotY: surface.kind === "wall" ? wallRotY(surface) : 0,
    };
    set((st) => ({ scene: { ...st.scene, items: [...st.scene.items, item] }, selectedId: id }));
    return id;
  },

  moveItem: (id, surface, point) =>
    set((st) => ({
      scene: { ...st.scene, items: st.scene.items.map((it) =>
        it.id === id
          ? { ...it, surface: surface.id, pos: snapPos(surface, point), rotY: surface.kind === "wall" ? wallRotY(surface) : it.rotY }
          : it) },
    })),

  rotateItem: (id, deltaY) =>
    set((st) => ({ scene: { ...st.scene, items: st.scene.items.map((it) => it.id === id ? { ...it, rotY: it.rotY + deltaY } : it) } })),

  deleteItem: (id) =>
    set((st) => ({
      scene: { ...st.scene, items: st.scene.items.filter((it) => it.id !== id) },
      selectedId: st.selectedId === id ? null : st.selectedId,
      editingId: st.editingId === id ? null : st.editingId,
    })),

  select: (id) => set({ selectedId: id }),
  beginEdit: (id) => set({ editingId: id, selectedId: id, tool: { kind: "look" } }),
  saveEdit: () => set({ editingId: null, selectedId: null }),
  escape: () => set((st) => st.editingId ? { editingId: null, selectedId: null } : { tool: { kind: "look" }, selectedId: null }),
}));
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run state/configurator.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json state/configurator.ts state/configurator.test.ts
git commit -m "feat(configurator): zustand scene-document store + actions"
```

---

### Task 5: Room provider + product/material registry

**Files:**
- Create: `lib/configurator/rooms.ts`
- Create: `lib/configurator/products.ts`
- Test: `lib/configurator/rooms.test.ts`

**Interfaces:**
- Consumes: `RoomShell`, `SurfaceDef`, `ProductMeta` (Task 1).
- Produces:
  - `primitiveHouse(): RoomShell` — dev shell approximating the 40′×30′ footprint with per-room floor zones + perimeter walls + ceiling (exact interior walls arrive with the GLB).
  - `roomShellFromGltf(root: THREE.Object3D, id: string): RoomShell` — builds surfaces from named meshes (`floor-*`, `wall-*`, `ceiling`).
  - `getRoomShell(id: string, gltf?: THREE.Object3D): RoomShell`.
  - `CONFIGURABLE_PRODUCTS: Record<string, ProductMeta>` and `MATERIALS: { id: string; name: string; color: string }[]` (in `products.ts`).

**Notes:** The 40′×30′ = 12.19 m × 9.14 m footprint is centered at origin → x ∈ [−6.10, 6.10], z ∈ [−4.57, 4.57], ceiling 2.7 m. The primitive shell is a coarse stand-in (perimeter walls + a few per-room floor zones) so the app runs before the GLB exists; real per-room geometry comes from `roomShellFromGltf` once slice A delivers `public/models/house-40x30.glb`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/rooms.test.ts
import { describe, it, expect } from "vitest";
import { primitiveHouse, getRoomShell } from "./rooms";

describe("primitiveHouse", () => {
  it("exposes per-room floor zones, walls and a ceiling", () => {
    const r = primitiveHouse();
    const ids = r.surfaces.map((s) => s.id);
    expect(ids).toContain("floor-master");
    expect(ids).toContain("floor-family");
    expect(ids).toContain("ceiling");
    expect(r.surfaces.some((s) => s.kind === "wall")).toBe(true);
  });
  it("has a walkable bounds inside the 12.19x9.14 footprint", () => {
    const r = primitiveHouse();
    expect(r.bounds.min[0]).toBeCloseTo(-6.1, 1);
    expect(r.bounds.max[1]).toBeCloseTo(4.57, 1);
    expect(r.eyeHeight).toBe(1.6);
  });
  it("getRoomShell falls back to the primitive house for the default id", () => {
    expect(getRoomShell("house-40x30").surfaces.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run lib/configurator/rooms.test.ts`
Expected: FAIL — cannot find module `./rooms`.

- [ ] **Step 3: Implement `rooms.ts`**

Build the primitive shell from the footprint constants. Floor zones are coarse rectangles (a full per-room split lands with the GLB); each is a horizontal plane (`rot:[-PI/2,0,0]`, `normal:[0,1,0]`). Perimeter walls face inward; ceiling faces down.

```ts
// lib/configurator/rooms.ts
import type * as THREE_NS from "three";
import type { RoomShell, SurfaceDef, SurfaceKind } from "./types";

const FT = 0.3048;
const W = 40 * FT;   // 12.19 m  (x)
const D = 30 * FT;   //  9.14 m  (z)
const H = 2.7;       // ceiling height (assumption — confirm)

function floorZone(id: string, cx: number, cz: number, w: number, d: number): SurfaceDef {
  return { id, kind: "floor", pos: [cx, 0, cz], rot: [-Math.PI / 2, 0, 0], size: [w, d], normal: [0, 1, 0] };
}
function perimeterWall(id: string, pos: [number,number,number], rotY: number, len: number, normal: [number,number,number]): SurfaceDef {
  return { id, kind: "wall", pos, rot: [0, rotY, 0], size: [len, H], normal };
}

/** Coarse dev shell: north half = bedrooms/master, south half = open-plan + service.
 *  Replaced by roomShellFromGltf when public/models/house-40x30.glb exists. */
export function primitiveHouse(): RoomShell {
  const surfaces: SurfaceDef[] = [
    // per-room floor zones (coarse) — north band (z<0) then south band (z>0)
    floorZone("floor-bedroom2", -W/2 + W*0.12, -D/2 + D*0.25, W*0.24, D*0.5),
    floorZone("floor-bedroom3", -W/2 + W*0.36, -D/2 + D*0.25, W*0.24, D*0.5),
    floorZone("floor-master",    W/2 - W*0.18, -D/2 + D*0.25, W*0.36, D*0.5),
    floorZone("floor-bathroom",  0,            -D/2 + D*0.25, W*0.16, D*0.5),
    floorZone("floor-family",   -W/2 + W*0.20,  D/2 - D*0.25, W*0.40, D*0.5),
    floorZone("floor-dining",    W*0.02,         D/2 - D*0.25, W*0.22, D*0.5),
    floorZone("floor-kitchen",   W/2 - W*0.22,   D/2 - D*0.25, W*0.28, D*0.5),
    floorZone("floor-washroom",  W/2 - W*0.06,   D/2 - D*0.12, W*0.12, D*0.24),
    // ceiling
    { id: "ceiling", kind: "ceiling", pos: [0, H, 0], rot: [Math.PI/2, 0, 0], size: [W, D], normal: [0,-1,0] },
    // perimeter walls (face inward)
    perimeterWall("wall-north", [0, H/2, -D/2], 0,            W, [0,0,1]),
    perimeterWall("wall-south", [0, H/2,  D/2], Math.PI,      W, [0,0,-1]),
    perimeterWall("wall-east",  [ W/2, H/2, 0], -Math.PI/2,   D, [-1,0,0]),
    perimeterWall("wall-west",  [-W/2, H/2, 0],  Math.PI/2,   D, [1,0,0]),
  ];
  return {
    id: "house-40x30",
    surfaces,
    bounds: { min: [-W/2, -D/2], max: [W/2, D/2] },
    eyeHeight: 1.6,
    defaultMaterials: { ceiling: "#f4f4f4" },
  };
}

const SURFACE_PREFIX: Record<string, SurfaceKind> = { floor: "floor", wall: "wall", ceiling: "ceiling" };

/** Build a RoomShell from a loaded GLB: every mesh named floor-*/wall-*/ceiling*
 *  becomes a SurfaceDef (geometry read from its world bbox). */
export function roomShellFromGltf(root: THREE_NS.Object3D, id: string): RoomShell {
  const surfaces: SurfaceDef[] = [];
  root.traverse((o) => {
    const kindKey = o.name.split("-")[0];
    const kind = SURFACE_PREFIX[kindKey];
    if (!kind) return;
    // The GLB authoring standard stores pos/normal/size in mesh.userData; fall back to identity.
    const ud = (o.userData ?? {}) as Partial<SurfaceDef>;
    surfaces.push({
      id: o.name,
      kind,
      pos: ud.pos ?? [o.position.x, o.position.y, o.position.z],
      rot: ud.rot ?? [0, 0, 0],
      size: ud.size ?? [1, 1],
      normal: ud.normal ?? (kind === "floor" ? [0,1,0] : kind === "ceiling" ? [0,-1,0] : [0,0,1]),
    });
  });
  return { id, surfaces, bounds: { min: [-W/2, -D/2], max: [W/2, D/2] }, eyeHeight: 1.6, defaultMaterials: {} };
}

export function getRoomShell(id: string, gltf?: THREE_NS.Object3D): RoomShell {
  if (gltf) return roomShellFromGltf(gltf, id);
  return primitiveHouse(); // only preset for now
}
```

- [ ] **Step 4: Implement `products.ts`** (3–5 MVP products + materials; `modelUrl` omitted until GLBs exist → primitive placeholders)

```ts
// lib/configurator/products.ts
import type { ProductMeta } from "./types";

export const MATERIALS = [
  { id: "marble-white", name: "Marble White", color: "#ECEAE4" },
  { id: "walnut",       name: "Walnut",       color: "#6B4A2B" },
  { id: "slate",        name: "Slate",        color: "#3A3F44" },
  { id: "sage",         name: "Sage",         color: "#9CAF88" },
  { id: "oak",          name: "Oak",          color: "#C9A36B" },
];

/** keyed by catalogue product `id` (see data/product_data.json) */
export const CONFIGURABLE_PRODUCTS: Record<string, ProductMeta> = {
  "balizador-de-jardim-led": { ref: "balizador-de-jardim-led", name: "LED Bollard", realDimsMm: { w:100, h:900, d:100 }, allowedSurfaces: ["floor"] },
  // add the remaining 2–4 MVP products here once their refs/dims are confirmed.
};
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run lib/configurator/rooms.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/configurator/rooms.ts lib/configurator/products.ts lib/configurator/rooms.test.ts
git commit -m "feat(configurator): room provider + product/material registry"
```

---

### Task 6: Configurator route + catalogue entry

**Files:**
- Create: `app/configurator/page.tsx`
- Modify: `app/cart/page.tsx` — add an "Open in playground" link.

**Interfaces:**
- Consumes: `useConfigurator` (Task 4), `getRoomShell` + `CONFIGURABLE_PRODUCTS` + `MATERIALS` (Task 5), `decodeScene` (Task 3), existing `useCart` (`state/cart.tsx`).
- Produces: the `/configurator` page mounting `<Canvas>` (Task 7 `<Scene>`) + `<Hud>` (Task 8). The product palette = cart items ∩ `CONFIGURABLE_PRODUCTS`.

> **Read first:** `node_modules/next/dist/docs/` for App-Router client-component + `useSearchParams` conventions in Next 16.

- [ ] **Step 1: Add the entry link in the cart**

In `app/cart/page.tsx`, add (following existing button styling):

```tsx
import Link from "next/link";
// ...inside the cart view, near the BOM/checkout actions:
<Link href="/configurator" className="/* match existing primary-button classes */">
  Open in playground
</Link>
```

- [ ] **Step 2: Scaffold the route (client component, mounted-gate for SSR)**

```tsx
// app/configurator/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useConfigurator } from "@/state/configurator";
import { getRoomShell } from "@/lib/configurator/rooms";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import { decodeScene } from "@/lib/configurator/serialize";
import { useCart } from "@/state/cart";
import Scene from "@/components/configurator/Scene";
import Hud from "@/components/configurator/Hud";

export default function ConfiguratorPage() {
  const [mounted, setMounted] = useState(false);
  const loadScene = useConfigurator((s) => s.loadScene);
  const { items: cart } = useCart();

  // products the user picked that are actually configurable
  const palette = useMemo(
    () => cart.map((i) => CONFIGURABLE_PRODUCTS[i.ref]).filter(Boolean),
    [cart],
  );
  const room = useMemo(() => getRoomShell("house-40x30"), []);

  useEffect(() => {
    setMounted(true);
    const q = new URLSearchParams(window.location.search).get("s");
    const loaded = q ? decodeScene(q) : null;
    if (loaded) loadScene(loaded);
  }, [loadScene]);

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white select-none">
      {mounted && (
        <Canvas camera={{ fov: 70, near: 0.05, far: 100 }} dpr={[1, 1.75]}>
          <Scene room={room} />
        </Canvas>
      )}
      <Hud room={room} palette={palette} />
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/configurator`.
Expected: page returns HTTP 200; dark canvas mounts; no console errors. (Empty scene is fine — Scene/Hud arrive in Tasks 7–8; until then stub them as `() => null` so the route compiles, or implement 7–8 first if executing in order.)

- [ ] **Step 4: Commit**

```bash
git add app/configurator/page.tsx app/cart/page.tsx
git commit -m "feat(configurator): /configurator route + catalogue entry link"
```

---

### Task 7: R3F scene — room, items, camera (port from prototype)

**Files:**
- Create: `components/configurator/CameraRig.tsx`
- Create: `components/configurator/RoomShellView.tsx`
- Create: `components/configurator/ItemView.tsx`
- Create: `components/configurator/Scene.tsx`

**Source of truth:** port the validated mechanics from `app/configurator-prototype/page.tsx`, refactored into these files and wired to the store. Keep the tuned constants (yaw `+dx*0.003`, pitch `+dy*0.003`, lerp `0.18`, eye height `1.6`).

**Interfaces:**
- Consumes: `useConfigurator` actions/state (Task 4), `RoomShell`/`SurfaceDef`/`PlacedItem` (Task 1), `CONFIGURABLE_PRODUCTS` (Task 5).
- Produces: `<Scene room={RoomShell} />`.

- [ ] **Step 1: CameraRig** — copy the `useWalkLook` hook from the prototype verbatim into `components/configurator/CameraRig.tsx` as a `<CameraRig lockedRef bounds eyeHeight />` component, with two changes: (a) take `bounds`/`eyeHeight` from props (the RoomShell) instead of the box constants; (b) `walkTo` clamps via `clampToBounds(p.x, p.z, bounds)` from Task 2. Expose `walkTo`/`wasDrag` via a ref or context so `Scene` can call them.

```tsx
// components/configurator/CameraRig.tsx — key delta from the prototype hook:
import { clampToBounds } from "@/lib/configurator/geometry";
// ...
const walkTo = (p: THREE.Vector3) => {
  const [x, z] = clampToBounds(p.x, p.z, boundsRef.current);
  target.current.set(x, eyeHeight, z);
};
// look handlers unchanged: yaw.current += dx*0.003; pitch.current = clamp(pitch + dy*0.003)
```

- [ ] **Step 2: RoomShellView** — render each `room.surfaces` entry as a plane (primitive shell). Color = `scene.surfaces[id]` (a material color via `MATERIALS`) or a per-kind default. Wire `onClick`/`onPointerMove` to props passed down from `Scene` (so surface event logic stays in one place).

```tsx
// components/configurator/RoomShellView.tsx
{room.surfaces.map((s) => (
  <mesh key={s.id} position={s.pos} rotation={s.rot}
        onClick={(e) => onSurfaceClick(s, e)} onPointerMove={(e) => onSurfaceMove(s, e)}>
    <planeGeometry args={s.size} />
    <meshStandardMaterial color={colorFor(s)} side={THREE.DoubleSide} roughness={0.85} />
  </mesh>
))}
```

- [ ] **Step 3: ItemView** — render one `PlacedItem`. If `CONFIGURABLE_PRODUCTS[item.ref].modelUrl` is set, load via drei `useGLTF`; else draw the primitive placeholder (cylinder for floor items, thin box for wall items), matching the prototype. Show a selection/edit ring (white selected / green editing).

- [ ] **Step 4: Scene** — assemble: lights (ambient 0.7 + directional 0.8 + a point light), `<RoomShellView>`, `items.map(<ItemView>)`, `<CameraRig>`. Hold a `lockedRef` mirroring `editingId !== null`. Implement the pointer routing exactly as the prototype's `onSurfaceClick`/`onSurfaceMove`/item `onClick`/`onDoubleClick`, but calling store actions:
  - surface click: `look`→`walkTo` (if floor & not drag); `paint`→`paintSurface(s.id, tool.material)`; `place`→`placeItem(CONFIGURABLE_PRODUCTS[tool.ref], s, point)`.
  - surface pointer-move while editing + buttons===1 + allowed kind → `moveItem(editingId, s, point)`.
  - item click (look tool) → `select(id)`; item double-click (look tool) → `beginEdit(id)`.

- [ ] **Step 5: Manual verification** (`npm run dev` → `/configurator`)

Verify against the prototype's behavior:
1. Drag → look (right→right, down→down). ✅ no inversion.
2. Walk: click a floor zone → camera walks there, clamped inside bounds.
3. Paint: pick a material in the HUD → click a floor zone → it recolors; the live scene-doc shows `surfaces[zone]`.
4. Place: pick the bollard → click a floor zone → primitive appears; wall-only items reject floor.
5. Double-click an item → green ring, camera locks, drag moves it (floor & wall); Save unlocks.
6. Esc exits add/edit → walk.

- [ ] **Step 6: Commit**

```bash
git add components/configurator/
git commit -m "feat(configurator): R3F scene, camera rig, room + item views wired to store"
```

---

### Task 8: HUD + keyboard

**Files:**
- Create: `components/configurator/Hud.tsx`

**Interfaces:**
- Consumes: `useConfigurator` (Task 4), `MATERIALS` (Task 5), `props: { room, palette: ProductMeta[] }`.
- Produces: `<Hud room palette />` — tool palette (Walk / material swatches / item buttons from `palette`), edit banner (Rotate/Delete/Save), add-mode banner, hint, live scene-doc dump. Save → write `?s=encodeScene(scene)` to the URL + `navigator.clipboard`.

- [ ] **Step 1: Port the HUD** from the prototype's JSX, replacing local state with store reads/writes:
  - Walk button → `setTool({kind:"look"})`.
  - Material swatches (`MATERIALS`) → `setTool({kind:"paint", material:id})`.
  - Item buttons (`palette`, not a hardcoded list) → `setTool({kind:"place", ref})`; show `meta.allowedSurfaces` hint.
  - Edit banner when `editingId` → `rotateItem(editingId, Math.PI/12)`, `deleteItem`, `saveEdit`.
  - Dim/disable the left panel while `editingId` (prototype already does this).
  - Live dump: `JSON.stringify(scene, null, 2)`.

- [ ] **Step 2: Keyboard** — `useEffect` in Hud: `R` rotates `editingId ?? selectedId`; `Delete`/`Backspace` deletes it; `Escape` calls `escape()`.

- [ ] **Step 3: Save/share** — a Save button:

```tsx
import { encodeScene } from "@/lib/configurator/serialize";
const onSave = () => {
  const url = `${location.pathname}?s=${encodeScene(scene)}`;
  history.replaceState(null, "", url);
  navigator.clipboard?.writeText(location.origin + url);
};
```

- [ ] **Step 4: Manual verification**

`npm run dev` → `/configurator`: place + paint a scene, click **Save**, copy the URL, open it in a new tab → the scene reloads identically (exercises Task 3 + Task 6 load path). Item palette shows only products you added to the cart.

- [ ] **Step 5: Commit**

```bash
git add components/configurator/Hud.tsx
git commit -m "feat(configurator): HUD, keyboard shortcuts, save/share via URL"
```

---

### Task 9: Save/load round-trip guard (regression test)

**Files:**
- Test: `lib/configurator/serialize.test.ts` (extend)

**Interfaces:** Consumes Task 3 + Task 1.

- [ ] **Step 1: Add a realistic round-trip test**

```ts
it("round-trips a fully populated house scene", () => {
  const doc = {
    room: "house-40x30",
    surfaces: { "floor-master": "walnut", "floor-family": "oak", ceiling: "marble-white" },
    items: [
      { id: "item-1", ref: "balizador-de-jardim-led", surface: "floor-family", pos: [1.2,0,0.8] as [number,number,number], rotY: 1.57 },
      { id: "item-2", ref: "balizador-de-jardim-led", surface: "floor-master", pos: [-2,0,-1] as [number,number,number], rotY: 0 },
    ],
  };
  expect(decodeScene(encodeScene(doc))).toEqual(doc);
});
```

- [ ] **Step 2: Run all configurator tests green**

Run: `npx vitest run lib/configurator state/configurator.test.ts`
Expected: PASS across types, geometry, serialize, rooms, store.

- [ ] **Step 3: Commit**

```bash
git add lib/configurator/serialize.test.ts
git commit -m "test(configurator): full-scene serialization round-trip"
```

---

### Task 10 (optional polish): visual upgrade toward Tier 1

**Files:**
- Modify: `components/configurator/Scene.tsx`
- Modify: `package.json` (add `@react-three/postprocessing`)

Only after Tasks 1–9 are green and the real `house-40x30.glb` + product GLBs exist.

- [ ] **Step 1:** `npm install @react-three/postprocessing`
- [ ] **Step 2:** Add drei `<Environment preset="apartment" />` (HDRI/IBL) for reflections + ambient.
- [ ] **Step 3:** Add `<EffectComposer>` with `<N8AO />`/`SSAO` (contact shadows), `<Bloom>` (LED glow), and ACES tone-mapping on the `<Canvas gl={{ toneMapping: THREE.ACESFilmicToneMapping }}>`.
- [ ] **Step 4:** Swap the primitive room/items for GLBs by setting `modelUrl` in `products.ts` and dropping `public/models/house-40x30.glb`; `roomShellFromGltf` + `useGLTF` pick them up. Bake lightmaps on the static shell.
- [ ] **Step 5: Manual verification** — load < 5–10 s; ≥ 30 FPS on a laptop; grounded contact shadows; LED bloom. Commit.

---

## Self-Review

**Spec coverage:**
- Browser-embedded `/configurator` route in this app → Task 6. ✅
- Cart = picked-parts entry → Task 6 (palette from `useCart`). ✅
- Default 40′×30′ house, per-room floors → Task 5 + Task 7. ✅
- Scene-document as source of truth → Tasks 1, 4. ✅
- Paint / place / move / rotate / delete / `allowedSurfaces`, validated interaction model → Tasks 4 (logic) + 7–8 (view). ✅
- Click-walk + drag-look (tuned axes) → Task 7. ✅
- Persistence (client-side + shareable link) → Tasks 3, 8, 9. ✅
- Zustand / custom collision / R3F → Tasks 4, 2, 7. ✅
- Tier-1 polish (postprocessing/HDRI/baked) → Task 10 (optional). ✅
- BOM / Tier 1.5 / Tier 2 deliberately absent → matches spec scope. ✅

**Placeholder scan:** `products.ts` intentionally ships 1 product with a comment to add the remaining MVP refs once confirmed (data the client owns, not a logic gap); `Scene`/`Hud` reference the prototype file (concrete, in-repo source) rather than re-printing 400 lines. No "TBD/handle edge cases" placeholders in logic tasks.

**Type consistency:** `placeItem`/`moveItem`/`snapPos`/`wallRotY`/`clampToBounds`/`isAllowedSurface` signatures match across Tasks 1–7; `Tool` union (`look`/`paint`/`place`) consistent between store (Task 4) and view (Tasks 7–8); surface ids (`floor-*`, `wall-*`, `ceiling`) consistent between rooms (Task 5), store tests (Task 4), and serialization (Tasks 3, 9).
