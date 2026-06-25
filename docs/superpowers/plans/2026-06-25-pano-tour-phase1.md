# Pano Tour — Phase 1 (In-Browser Capture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in customer turn their configured room into a navigable 360° panorama tour, captured in-browser and viewed with hotspot navigation — the shippable skeleton that Phase 2 later upgrades to photoreal cloud rendering.

**Architecture:** A pure `computeCaptureSpots(room)` picks one capture point per room. An in-Canvas `PanoCapture` component renders each point with a `THREE.CubeCamera`, converts the cubemap to an equirectangular JPEG via a shader pass, and hands blobs back across the Canvas boundary through a module singleton bridge. A DOM orchestration hook creates a `render_jobs` row (via a Next API route), uploads panos to Supabase Storage, finalizes the job, and routes to `/tour/[jobId]`, which polls the job and mounts a Photo Sphere Viewer virtual tour.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Three.js 0.183.0 · @react-three/fiber 9 · Supabase (`@supabase/ssr`) · Photo Sphere Viewer 5 · Vitest.

## Global Constraints

- Three.js pinned EXACTLY `0.183.0` — do not change the version or add deps that force a different three.
- No Co-Authored-By trailers on commits; author is Leon only.
- Commit each task when its tests pass (commit-as-you-go).
- No service-role Supabase key in client or Vercel code — Phase 1 uses the logged-in user's session only. Tour generation REQUIRES an authenticated user.
- Test/config files are excluded from the production tsc build already (`tsconfig.json` excludes `**/*.test.ts(x)`, `vitest.config.ts`, `test`). Keep new tests under those patterns.
- Equirect panos are JPEG quality 0.9 at 4096×2048 (`PANO_WIDTH = 4096`).
- Ignore the iCloud conflict-copy files (those ending in ` 2.ts`/` 2.tsx`); never edit them.

---

### Task 1: Capture-spot computation

**Files:**
- Create: `lib/configurator/captureSpots.ts`
- Test: `lib/configurator/captureSpots.test.ts`

**Interfaces:**
- Consumes: `RoomShell` from `@/lib/configurator/types` (has `lightZones: {id,label,x0,z0,x1,z1,ceilingY}[]`, `bounds:{min:[x,z],max:[x,z]}`, `eyeHeight:number`).
- Produces: `interface CaptureSpot { id: string; label: string; pos: [number, number, number]; }` and `computeCaptureSpots(room: RoomShell): CaptureSpot[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/captureSpots.test.ts
import { describe, it, expect } from "vitest";
import { computeCaptureSpots } from "./captureSpots";
import type { RoomShell } from "./types";

const baseRoom = (zones: RoomShell["lightZones"]): RoomShell => ({
  id: "r", surfaces: [], slots: [], fixtures: [], lightZones: zones,
  bounds: { min: [-6, -4], max: [6, 4] }, eyeHeight: 1.6, defaultMaterials: {},
});

describe("computeCaptureSpots", () => {
  it("makes one eye-height spot per light zone, centered", () => {
    const room = baseRoom([
      { id: "living", label: "Living", x0: 0, z0: 0, x1: 4, z1: 2, ceilingY: 3 },
      { id: "master", label: "Master", x0: -4, z0: -2, x1: -2, z1: 0, ceilingY: 3 },
    ]);
    const spots = computeCaptureSpots(room);
    expect(spots).toEqual([
      { id: "living", label: "Living", pos: [2, 1.6, 1] },
      { id: "master", label: "Master", pos: [-3, 1.6, -1] },
    ]);
  });

  it("falls back to one bounds-center spot when there are no zones", () => {
    const spots = computeCaptureSpots(baseRoom([]));
    expect(spots).toEqual([{ id: "center", label: "Room", pos: [0, 1.6, 0] }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/captureSpots.test.ts`
Expected: FAIL — `computeCaptureSpots` is not defined / module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/configurator/captureSpots.ts
import type { RoomShell } from "./types";

export interface CaptureSpot {
  id: string;
  label: string;
  pos: [number, number, number];
}

/** One panorama capture point per room (light zone), centered, at eye height.
 *  Falls back to a single bounds-center spot if the room has no zones. */
export function computeCaptureSpots(room: RoomShell): CaptureSpot[] {
  const y = room.eyeHeight;
  if (room.lightZones.length === 0) {
    const cx = (room.bounds.min[0] + room.bounds.max[0]) / 2;
    const cz = (room.bounds.min[1] + room.bounds.max[1]) / 2;
    return [{ id: "center", label: "Room", pos: [cx, y, cz] }];
  }
  return room.lightZones.map((z) => ({
    id: z.id,
    label: z.label,
    pos: [(z.x0 + z.x1) / 2, y, (z.z0 + z.z1) / 2],
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/captureSpots.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/configurator/captureSpots.ts lib/configurator/captureSpots.test.ts
git commit -m "feat(tour): compute per-room panorama capture spots"
```

---

### Task 2: Tour spec types, pano path, and hotspot links

**Files:**
- Create: `lib/configurator/tourSpec.ts`
- Test: `lib/configurator/tourSpec.test.ts`

**Interfaces:**
- Consumes: `CaptureSpot` from `./captureSpots`.
- Produces:
  - `interface TourSpec { sceneRef: string; time: number; spots: CaptureSpot[]; }`
  - `panoPath(jobId: string, spotId: string): string` → `"${jobId}/${spotId}.jpg"` (storage object path within the `tours` bucket).
  - `spotLinks(spots: CaptureSpot[]): Record<string, string[]>` → each spot id mapped to every other spot id (all-to-all nav for ≤6 rooms).

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/tourSpec.test.ts
import { describe, it, expect } from "vitest";
import { panoPath, spotLinks } from "./tourSpec";
import type { CaptureSpot } from "./captureSpots";

const spot = (id: string): CaptureSpot => ({ id, label: id, pos: [0, 1.6, 0] });

describe("panoPath", () => {
  it("builds a bucket-relative jpg path", () => {
    expect(panoPath("job123", "living")).toBe("job123/living.jpg");
  });
});

describe("spotLinks", () => {
  it("links every spot to all others (not itself)", () => {
    expect(spotLinks([spot("a"), spot("b"), spot("c")])).toEqual({
      a: ["b", "c"],
      b: ["a", "c"],
      c: ["a", "b"],
    });
  });

  it("gives a lone spot no links", () => {
    expect(spotLinks([spot("a")])).toEqual({ a: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/tourSpec.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/configurator/tourSpec.ts
import type { CaptureSpot } from "./captureSpots";

/** What the configurator hands to the render pipeline for one tour. */
export interface TourSpec {
  sceneRef: string; // encoded SceneDocument (shareable string)
  time: number;     // time-of-day used for the render
  spots: CaptureSpot[];
}

/** Object path inside the `tours` storage bucket. */
export function panoPath(jobId: string, spotId: string): string {
  return `${jobId}/${spotId}.jpg`;
}

/** Navigation graph: every spot links to all the others. */
export function spotLinks(spots: CaptureSpot[]): Record<string, string[]> {
  const ids = spots.map((s) => s.id);
  const out: Record<string, string[]> = {};
  for (const id of ids) out[id] = ids.filter((other) => other !== id);
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/tourSpec.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/configurator/tourSpec.ts lib/configurator/tourSpec.test.ts
git commit -m "feat(tour): tour spec types, pano path, and hotspot links"
```

---

### Task 3: Supabase `render_jobs` table + `tours` storage bucket

**Files:**
- Create: `supabase/migrations/20260625090000_render_jobs.sql`

**Interfaces:**
- Produces a `public.render_jobs` table and a public-read `tours` storage bucket used by Tasks 6–8. Columns: `id uuid pk default gen_random_uuid()`, `user_id uuid references auth.users`, `status text`, `phase text`, `spec jsonb`, `pano_urls jsonb default '{}'`, `error text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.

> This task has no Vitest test — its verification is applying the migration and checking the table/bucket + policies exist.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260625090000_render_jobs.sql

create table if not exists public.render_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'queued'
                check (status in ('queued','rendering','ready','error')),
  phase       text not null default 'browser'
                check (phase in ('browser','cycles')),
  spec        jsonb not null,
  pano_urls   jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.render_jobs enable row level security;

create policy "owner reads own jobs"   on public.render_jobs
  for select using (auth.uid() = user_id);
create policy "owner inserts own jobs" on public.render_jobs
  for insert with check (auth.uid() = user_id);
create policy "owner updates own jobs" on public.render_jobs
  for update using (auth.uid() = user_id);

-- public-read bucket for rendered panoramas
insert into storage.buckets (id, name, public)
  values ('tours', 'tours', true)
  on conflict (id) do nothing;

-- authenticated users may write panos under a folder named after a job id
create policy "auth writes tour panos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tours');
create policy "public reads tour panos" on storage.objects
  for select using (bucket_id = 'tours');
```

- [ ] **Step 2: Apply the migration**

Run (local Supabase) or paste into the Supabase SQL editor for the project:
`supabase db push`
Expected: migration applies with no error; `render_jobs` table and `tours` bucket now exist.

- [ ] **Step 3: Verify table + bucket + RLS**

Run in the SQL editor:
`select tablename from pg_tables where tablename = 'render_jobs';`
`select id, public from storage.buckets where id = 'tours';`
Expected: one row each; bucket `public = true`. Under Authentication → Policies, the three `render_jobs` policies and two `storage.objects` tour policies are listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260625090000_render_jobs.sql
git commit -m "feat(tour): render_jobs table and public tours storage bucket"
```

---

### Task 4: Cubemap → equirectangular conversion utility

**Files:**
- Create: `lib/configurator/equirect.ts`
- Test: `lib/configurator/equirect.test.ts`

**Interfaces:**
- Consumes: `three` (`THREE.WebGLRenderer`, `THREE.Scene`, `THREE.Vector3`).
- Produces:
  - `equirectSize(width: number): [number, number]` → `[width, Math.round(width / 2)]`.
  - `renderEquirect(renderer: THREE.WebGLRenderer, scene: THREE.Scene, position: THREE.Vector3, width: number): Promise<Blob>` — renders a 360° equirect JPEG (quality 0.9) of `scene` from `position`. (GL path verified manually in Task 5; only `equirectSize` is unit-tested here.)

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/equirect.test.ts
import { describe, it, expect } from "vitest";
import { equirectSize } from "./equirect";

describe("equirectSize", () => {
  it("is 2:1 (width × width/2)", () => {
    expect(equirectSize(4096)).toEqual([4096, 2048]);
    expect(equirectSize(1000)).toEqual([1000, 500]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/equirect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/configurator/equirect.ts
import * as THREE from "three";

/** Equirect panoramas are 2:1. */
export function equirectSize(width: number): [number, number] {
  return [width, Math.round(width / 2)];
}

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const QUAD_FRAG = /* glsl */ `
  precision highp float;
  uniform samplerCube map;
  varying vec2 vUv;
  #define PI 3.141592653589793
  void main() {
    float lon = (vUv.x - 0.5) * 2.0 * PI; // -PI..PI
    float lat = (vUv.y - 0.5) * PI;       // -PI/2..PI/2
    vec3 dir = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
    gl_FragColor = textureCube(map, normalize(dir));
  }
`;

/** Render a 360° equirectangular JPEG of `scene` from `position`. */
export async function renderEquirect(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  position: THREE.Vector3,
  width: number,
): Promise<Blob> {
  const [w, h] = equirectSize(width);
  const cubeSize = Math.max(256, Math.floor(width / 4));

  // 1) capture the scene into a cubemap at the spot
  const cubeRT = new THREE.WebGLCubeRenderTarget(cubeSize, {
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const cubeCam = new THREE.CubeCamera(0.05, 100, cubeRT);
  cubeCam.position.copy(position);
  const prevTarget = renderer.getRenderTarget();
  cubeCam.update(renderer, scene);

  // 2) project the cubemap to an equirect render target via a fullscreen quad
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: cubeRT.texture } },
    vertexShader: QUAD_VERT,
    fragmentShader: QUAD_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quadScene.add(quad);

  const outRT = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  renderer.setRenderTarget(outRT);
  renderer.render(quadScene, quadCam);

  // 3) read pixels (bottom-up) and flip into a canvas
  const buf = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(outRT, 0, 0, w, h, buf);
  renderer.setRenderTarget(prevTarget);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4; // flip Y
    const dst = y * w * 4;
    img.data.set(buf.subarray(src, src + w * 4), dst);
  }
  ctx.putImageData(img, 0, 0);

  // 4) clean up GPU resources
  cubeRT.dispose();
  outRT.dispose();
  mat.dispose();
  quad.geometry.dispose();

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9,
    ),
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/equirect.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/configurator/equirect.ts lib/configurator/equirect.test.ts
git commit -m "feat(tour): cubemap-to-equirectangular render utility"
```

---

### Task 5: Capture bridge + in-Canvas `PanoCapture` component

**Files:**
- Create: `lib/configurator/captureBridge.ts`
- Test: `lib/configurator/captureBridge.test.ts`
- Create: `components/configurator/PanoCapture.tsx`
- Modify: `state/configurator.ts` (add a `capturing` flag so gizmos can hide during capture)
- Modify: `components/configurator/Scene.tsx` (mount `<PanoCapture />`, hide slot/helpers while capturing)

**Interfaces:**
- Consumes: `CaptureSpot` (`./captureSpots`), `renderEquirect` (`./equirect`).
- Produces:
  - `captureBridge.ts`: `type CaptureFn = (spots: CaptureSpot[], width: number) => Promise<Record<string, Blob>>; registerCaptureHandler(fn: CaptureFn | null): void; runCapture(spots: CaptureSpot[], width: number): Promise<Record<string, Blob>>` (throws `Error("capture handler not ready")` if none registered).
  - `state/configurator.ts`: adds `capturing: boolean` and `setCapturing(v: boolean): void`.

- [ ] **Step 1: Write the failing test (bridge only)**

```ts
// lib/configurator/captureBridge.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { registerCaptureHandler, runCapture } from "./captureBridge";

describe("captureBridge", () => {
  beforeEach(() => registerCaptureHandler(null));

  it("throws when no handler is registered", async () => {
    await expect(runCapture([], 64)).rejects.toThrow("capture handler not ready");
  });

  it("delegates to the registered handler", async () => {
    registerCaptureHandler(async (spots) => {
      const out: Record<string, Blob> = {};
      for (const s of spots) out[s.id] = new Blob([s.id]);
      return out;
    });
    const res = await runCapture([{ id: "living", label: "L", pos: [0, 0, 0] }], 64);
    expect(Object.keys(res)).toEqual(["living"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/captureBridge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the bridge**

```ts
// lib/configurator/captureBridge.ts
import type { CaptureSpot } from "./captureSpots";

export type CaptureFn = (spots: CaptureSpot[], width: number) => Promise<Record<string, Blob>>;

let handler: CaptureFn | null = null;

/** PanoCapture registers (and on unmount clears) the capture implementation. */
export function registerCaptureHandler(fn: CaptureFn | null): void {
  handler = fn;
}

/** DOM-side orchestration calls this to capture panos from the live scene. */
export function runCapture(spots: CaptureSpot[], width: number): Promise<Record<string, Blob>> {
  if (!handler) return Promise.reject(new Error("capture handler not ready"));
  return handler(spots, width);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/captureBridge.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Add the `capturing` flag to the store**

In `state/configurator.ts`, add to the `ConfiguratorState` interface (next to `showLightHelpers`):

```ts
  capturing: boolean;                // true while rendering panos (hide gizmos)
```

add to the interface's action list (next to `setShowLightHelpers`):

```ts
  setCapturing(v: boolean): void;
```

add to the initial state (next to `showLightHelpers: false,`):

```ts
  capturing: false,
```

and add the action (next to `setShowLightHelpers`):

```ts
  setCapturing: (v) => set({ capturing: v }),
```

- [ ] **Step 6: Write the PanoCapture component**

```tsx
// components/configurator/PanoCapture.tsx
"use client";

/**
 * PanoCapture — lives inside the Canvas. Registers a capture handler that, for
 * each spot, renders an equirectangular pano of the live scene. It hides the
 * walk camera's own helpers by toggling the store `capturing` flag, and yields a
 * frame between spots so the scene settles. Renders nothing visible.
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registerCaptureHandler } from "@/lib/configurator/captureBridge";
import { renderEquirect } from "@/lib/configurator/equirect";
import type { CaptureSpot } from "@/lib/configurator/captureSpots";
import { useConfigurator } from "@/state/configurator";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export default function PanoCapture() {
  const { gl, scene } = useThree();
  const setCapturing = useConfigurator((s) => s.setCapturing);

  useEffect(() => {
    registerCaptureHandler(async (spots: CaptureSpot[], width: number) => {
      setCapturing(true);
      await nextFrame(); // let gizmo-hiding apply before the first capture
      try {
        const out: Record<string, Blob> = {};
        for (const spot of spots) {
          const pos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);
          out[spot.id] = await renderEquirect(gl, scene, pos, width);
          await nextFrame();
        }
        return out;
      } finally {
        setCapturing(false);
      }
    });
    return () => registerCaptureHandler(null);
  }, [gl, scene, setCapturing]);

  return null;
}
```

- [ ] **Step 7: Mount PanoCapture and hide gizmos during capture**

In `components/configurator/Scene.tsx`:

Add the import near the other component imports:

```tsx
import PanoCapture from "./PanoCapture";
```

Inside `SceneInner`'s returned JSX, add `<PanoCapture />` right after `<CameraTracker />`:

```tsx
      {/* feeds the player position/facing to the DOM minimap */}
      <CameraTracker />
      {/* offscreen 360 capture for the tour */}
      <PanoCapture />
```

In the same file, read the flag at the top of `SceneInner` (next to the other `useConfigurator` calls):

```tsx
  const capturing = useConfigurator((s) => s.capturing);
```

and wrap the gizmo-ish children so they don't appear in panos — change the `<SlotMarkers .../>` line to:

```tsx
        {!capturing && <SlotMarkers room={room} onSlotClick={onSlotClick} />}
```

- [ ] **Step 8: Verify it builds and the handler registers (manual)**

Run: `npx tsc --noEmit` → expect no new errors in these files.
Run the dev server, open `/configurator`, open the browser console, and run:
`await (await import('/_next/static/...')).runCapture` — simpler: confirm no console error on load and that `/configurator` still renders. Full capture is exercised in Task 7.
Expected: page renders; no runtime errors; `tsc` clean.

- [ ] **Step 9: Commit**

```bash
git add lib/configurator/captureBridge.ts lib/configurator/captureBridge.test.ts components/configurator/PanoCapture.tsx state/configurator.ts components/configurator/Scene.tsx
git commit -m "feat(tour): in-canvas pano capture bridge + component"
```

---

### Task 6: Tour job API route + client job helpers

**Files:**
- Create: `app/api/render-tour/route.ts`
- Create: `lib/configurator/tourJobs.ts`
- Test: `lib/configurator/tourJobs.test.ts`

**Interfaces:**
- Consumes: `TourSpec`, `panoPath` (`./tourSpec`); `createClient` from `@/lib/supabase/server` (route) and `@/lib/supabase/client` (helpers).
- Produces:
  - Route `app/api/render-tour/route.ts`:
    - `POST` body `{ spec: TourSpec }` → inserts a `render_jobs` row (`status:'rendering'`, `phase:'browser'`, `user_id` from session) → `{ jobId }`; 401 if no session; 400 if `spec` missing.
    - `GET ?jobId=` → `{ id, status, phase, pano_urls, error, spec }`; 404 if not found.
    - `PATCH` body `{ jobId, status?, pano_urls?, error? }` → updates the row → `{ ok: true }`.
  - `lib/configurator/tourJobs.ts`:
    - `interface RenderJob { id: string; status: "queued"|"rendering"|"ready"|"error"; phase: "browser"|"cycles"; pano_urls: Record<string,string>; error: string|null; spec: TourSpec; }`
    - `createTourJob(spec: TourSpec): Promise<string>`
    - `uploadPano(jobId: string, spotId: string, blob: Blob): Promise<string>` (uploads to `tours` bucket at `panoPath`, returns public URL)
    - `finalizeTourJob(jobId: string, panoUrls: Record<string,string>): Promise<void>`
    - `failTourJob(jobId: string, message: string): Promise<void>`
    - `getTourJob(jobId: string): Promise<RenderJob>`

- [ ] **Step 1: Write the failing test (pure payload validation)**

Add a small exported pure validator so the route's input rule is unit-tested without a live Supabase.

```ts
// lib/configurator/tourJobs.test.ts
import { describe, it, expect } from "vitest";
import { isValidSpec } from "./tourJobs";

describe("isValidSpec", () => {
  it("accepts a spec with spots", () => {
    expect(isValidSpec({ sceneRef: "x", time: 9, spots: [{ id: "a", label: "A", pos: [0, 0, 0] }] })).toBe(true);
  });
  it("rejects missing/empty spots and non-objects", () => {
    expect(isValidSpec(null)).toBe(false);
    expect(isValidSpec({ sceneRef: "x", time: 9, spots: [] })).toBe(false);
    expect(isValidSpec({ sceneRef: "x", time: 9 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/tourJobs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the client helpers (incl. `isValidSpec`)**

```ts
// lib/configurator/tourJobs.ts
import { createClient } from "@/lib/supabase/client";
import { panoPath, type TourSpec } from "./tourSpec";

export interface RenderJob {
  id: string;
  status: "queued" | "rendering" | "ready" | "error";
  phase: "browser" | "cycles";
  pano_urls: Record<string, string>;
  error: string | null;
  spec: TourSpec;
}

/** Pure input guard shared with the API route. */
export function isValidSpec(v: unknown): v is TourSpec {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.sceneRef === "string" &&
    typeof o.time === "number" &&
    Array.isArray(o.spots) &&
    o.spots.length > 0
  );
}

export async function createTourJob(spec: TourSpec): Promise<string> {
  const res = await fetch("/api/render-tour", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spec }),
  });
  if (!res.ok) throw new Error(`createTourJob failed: ${res.status}`);
  const { jobId } = (await res.json()) as { jobId: string };
  return jobId;
}

export async function uploadPano(jobId: string, spotId: string, blob: Blob): Promise<string> {
  const supabase = createClient();
  const path = panoPath(jobId, spotId);
  const { error } = await supabase.storage
    .from("tours")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`uploadPano failed: ${error.message}`);
  return supabase.storage.from("tours").getPublicUrl(path).data.publicUrl;
}

export async function finalizeTourJob(jobId: string, panoUrls: Record<string, string>): Promise<void> {
  const res = await fetch("/api/render-tour", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId, status: "ready", pano_urls: panoUrls }),
  });
  if (!res.ok) throw new Error(`finalizeTourJob failed: ${res.status}`);
}

export async function failTourJob(jobId: string, message: string): Promise<void> {
  await fetch("/api/render-tour", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId, status: "error", error: message }),
  });
}

export async function getTourJob(jobId: string): Promise<RenderJob> {
  const res = await fetch(`/api/render-tour?jobId=${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`getTourJob failed: ${res.status}`);
  return (await res.json()) as RenderJob;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/tourJobs.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Write the API route**

```ts
// app/api/render-tour/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSpec } from "@/lib/configurator/tourJobs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !isValidSpec(body.spec)) {
    return NextResponse.json({ error: "invalid spec" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("render_jobs")
    .insert({ user_id: user.id, status: "rendering", phase: "browser", spec: body.spec })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobId: data.id });
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("render_jobs")
    .select("id,status,phase,pano_urls,error,spec")
    .eq("id", jobId)
    .single();
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status;
  if (body.pano_urls) patch.pano_urls = body.pano_urls;
  if (body.error !== undefined) patch.error = body.error;

  const supabase = await createClient();
  const { error } = await supabase.from("render_jobs").update(patch).eq("id", body.jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Verify build + auth gating (manual)**

Run: `npx tsc --noEmit` → no new errors.
With the dev server running and logged OUT, run in the browser console:
`fetch('/api/render-tour', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({spec:{sceneRef:'x',time:9,spots:[{id:'a',label:'A',pos:[0,0,0]}]}})}).then(r=>r.status)`
Expected: `401`. (A `400` for `{spec:{}}` when logged in.)

- [ ] **Step 7: Commit**

```bash
git add app/api/render-tour/route.ts lib/configurator/tourJobs.ts lib/configurator/tourJobs.test.ts
git commit -m "feat(tour): render-tour API route and client job helpers"
```

---

### Task 7: "Generate walkthrough" orchestration + HUD button

**Files:**
- Create: `lib/configurator/useGenerateTour.ts`
- Modify: `components/configurator/Hud.tsx` (add the button + progress/auth states)

**Interfaces:**
- Consumes: `computeCaptureSpots` (`./captureSpots`), `runCapture` (`./captureBridge`), `createTourJob`/`uploadPano`/`finalizeTourJob`/`failTourJob` (`./tourJobs`), `encodeScene` (`@/lib/configurator/serialize`), `createClient` (`@/lib/supabase/client`), `useConfigurator`, `useRouter` (`next/navigation`).
- Produces: `useGenerateTour(room: RoomShell): { generate: () => Promise<void>; phase: "idle"|"capturing"|"uploading"|"error"; error: string | null }`. `PANO_WIDTH = 4096` lives here.

- [ ] **Step 1: Write the hook**

```ts
// lib/configurator/useGenerateTour.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeCaptureSpots } from "./captureSpots";
import { runCapture } from "./captureBridge";
import { createTourJob, uploadPano, finalizeTourJob, failTourJob } from "./tourJobs";
import { encodeScene } from "./serialize";
import { createClient } from "@/lib/supabase/client";
import { useConfigurator } from "@/state/configurator";
import type { RoomShell } from "./types";

export const PANO_WIDTH = 4096;

type Phase = "idle" | "capturing" | "uploading" | "error";

export function useGenerateTour(room: RoomShell) {
  const router = useRouter();
  const scene = useConfigurator((s) => s.scene);
  const time = useConfigurator((s) => s.timeOfDay);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    // require login (RLS + account-tied tours)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/configurator");
      return;
    }

    let jobId: string | null = null;
    try {
      const spots = computeCaptureSpots(room);
      setPhase("capturing");
      const blobs = await runCapture(spots, PANO_WIDTH);

      setPhase("uploading");
      jobId = await createTourJob({ sceneRef: encodeScene(scene), time, spots });
      const urls: Record<string, string> = {};
      for (const s of spots) urls[s.id] = await uploadPano(jobId, s.id, blobs[s.id]);
      await finalizeTourJob(jobId, urls);

      setPhase("idle");
      router.push(`/tour/${jobId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "render failed";
      setError(msg);
      setPhase("error");
      if (jobId) await failTourJob(jobId, msg).catch(() => {});
    }
  }

  return { generate, phase, error };
}
```

> Note: the `/login` route already exists in the backend auth work; if its query param differs, match the existing login redirect convention used elsewhere in the app.

- [ ] **Step 2: Add the button to the HUD**

In `components/configurator/Hud.tsx`, add the import:

```tsx
import { useGenerateTour } from "@/lib/configurator/useGenerateTour";
```

Inside the `Hud` component body (after the other hooks), add:

```tsx
  const tour = useGenerateTour(room);
```

In the left tool panel, directly after the "Save & copy link" block's closing `</div>`, add a new block:

```tsx
        {/* Generate 360 walkthrough */}
        <div className="pt-1 border-t border-white/10">
          <button
            className="w-full px-3 py-1.5 rounded text-sm bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-400/30 transition disabled:opacity-50"
            onClick={tour.generate}
            disabled={tour.phase === "capturing" || tour.phase === "uploading"}
          >
            {tour.phase === "capturing"
              ? "Rendering panoramas…"
              : tour.phase === "uploading"
                ? "Uploading…"
                : "Generate 360° walkthrough"}
          </button>
          {tour.phase === "error" && (
            <p className="mt-1 text-xs text-red-300">{tour.error}</p>
          )}
        </div>
```

- [ ] **Step 3: Verify the full capture→upload→route flow (manual)**

Run the dev server (with real Supabase env, logged in). Open `/configurator`, configure a room, click **Generate 360° walkthrough**.
Expected: button shows "Rendering panoramas…" then "Uploading…", the browser navigates to `/tour/<uuid>`. In the Supabase dashboard, `render_jobs` has a `ready` row and the `tours/<jobId>/` folder holds one `.jpg` per room. (The `/tour` page itself is built in Task 8 — until then the route 404s, which is expected.)

- [ ] **Step 4: Commit**

```bash
git add lib/configurator/useGenerateTour.ts components/configurator/Hud.tsx
git commit -m "feat(tour): generate-walkthrough orchestration and HUD button"
```

---

### Task 8: Tour viewer page (Photo Sphere Viewer)

**Files:**
- Modify: `package.json` (add Photo Sphere Viewer deps)
- Create: `components/tour/TourViewer.tsx`
- Create: `app/tour/[jobId]/page.tsx`

**Interfaces:**
- Consumes: `getTourJob`/`RenderJob` (`@/lib/configurator/tourJobs`), `spotLinks` (`@/lib/configurator/tourSpec`), `@photo-sphere-viewer/core` + `@photo-sphere-viewer/virtual-tour-plugin`.
- Produces: `<TourViewer job={RenderJob} />` (renders the PSV virtual tour) and the `/tour/[jobId]` page (polls until `ready`/`error`, shows progress, mounts the viewer).

- [ ] **Step 1: Install Photo Sphere Viewer**

Run:
`npm install @photo-sphere-viewer/core@^5 @photo-sphere-viewer/virtual-tour-plugin@^5`
Expected: installs the latest 5.x of both. CRITICAL: verify `git diff package.json package-lock.json` shows `three@0.183.0` UNCHANGED — PSV depends on `three` as a peer; if npm tries to bump three, pin it back to `0.183.0` and re-run. Confirm only the two new deps were added.

- [ ] **Step 2: Write the viewer component**

```tsx
// components/tour/TourViewer.tsx
"use client";

import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import { spotLinks } from "@/lib/configurator/tourSpec";
import type { RenderJob } from "@/lib/configurator/tourJobs";

export default function TourViewer({ job }: { job: RenderJob }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const spots = job.spec.spots;
    const links = spotLinks(spots);
    const nodes = spots
      .filter((s) => job.pano_urls[s.id])
      .map((s) => ({
        id: s.id,
        panorama: job.pano_urls[s.id],
        name: s.label,
        links: links[s.id].filter((id) => job.pano_urls[id]).map((id) => ({ nodeId: id })),
      }));

    const viewer = new Viewer({
      container: ref.current,
      navbar: ["zoom", "fullscreen"],
      plugins: [[VirtualTourPlugin, { positionMode: "manual", renderMode: "markers", nodes, startNodeId: nodes[0]?.id }]],
    });
    return () => viewer.destroy();
  }, [job]);

  return <div ref={ref} className="h-full w-full" />;
}
```

- [ ] **Step 3: Write the tour page**

```tsx
// app/tour/[jobId]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { getTourJob, type RenderJob } from "@/lib/configurator/tourJobs";
import TourViewer from "@/components/tour/TourViewer";

export default function TourPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await getTourJob(jobId);
        if (!alive) return;
        if (j.status === "ready") return setJob(j);
        if (j.status === "error") return setErr(j.error ?? "render failed");
        timer = setTimeout(poll, 1500); // still queued/rendering
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "failed to load tour");
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [jobId]);

  if (err) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-900 text-white">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-300">{err}</p>
          <a href="/configurator" className="text-xs underline opacity-70">Back to configurator</a>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          <span className="text-xs tracking-wide text-white/80">Preparing your walkthrough…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <TourViewer job={job} />
    </div>
  );
}
```

- [ ] **Step 4: Verify the end-to-end tour (manual)**

Run: `npx tsc --noEmit` → no new errors.
With the dev server + logged in: from `/configurator`, click **Generate 360° walkthrough**; when it routes to `/tour/<id>`, the spinner resolves into a 360° panorama you can drag to look around, with hotspot markers that jump between rooms.
Expected: panorama renders; hotspots navigate between spots; refreshing `/tour/<id>` reloads the same tour (persistence).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/tour/TourViewer.tsx app/tour/[jobId]/page.tsx
git commit -m "feat(tour): photo-sphere-viewer tour page with hotspot navigation"
```

---

## Notes for the implementer

- **Phase 1 look:** in-browser CubeCamera capture does NOT run the EffectComposer (N8AO/Bloom), so panos are the raw lit scene (HDRI + lights), not the post-processed view. That is expected — photoreal GI is Phase 2.
- **Equirect orientation:** if the panorama looks rotated/mirrored, adjust the `dir` vector signs in `equirect.ts`'s fragment shader (swap `sin(lon)`/`cos(lon)` or negate) — the math is a convention choice, verify against a known landmark (e.g., a window) and lock it.
- **PSV virtual-tour link placement:** in `positionMode: "manual"`, the plugin may not know where to draw each link arrow without a position. If arrows don't appear or stack at center, give each link a `position: { yaw, pitch }` — derive `yaw` from the bearing between the two spots' world XZ (`Math.atan2(toSpot.x - fromSpot.x, toSpot.z - fromSpot.z)`), `pitch: 0`. Lock it during the Task 8 manual verify.
- **Storage RLS is MVP-level:** the `tours` write policy allows any authenticated user to write any path under `tours/`. Acceptable for launch (job ids are unguessable uuids); tighten later to scope the folder to the owner if abuse appears.
- **Capture cost:** 4096-wide panos × N rooms allocate large GPU buffers briefly; they are disposed each spot. If a low-end device OOMs, drop `PANO_WIDTH` to 2048.
- **Local dev** needs real Supabase env (auth + storage). The placeholder keys used for builds won't authenticate; test the tour flow against the real project.
- **Phase 2 hand-off:** the API already stamps `phase`. Phase 2 changes only the capture stage — `createTourJob` will set `phase:'cycles'`, the worker fills `pano_urls`, and the viewer/page are reused unchanged.
```
