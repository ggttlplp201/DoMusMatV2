# Pano Tour — Phase 2 (Photoreal Cloud Renderer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "Photoreal walkthrough" that exports the live scene, path-traces day+night 360° panos in the cloud (Blender Cycles on Modal), and shows them in the existing tour viewer — built now, deployable later.

**Architecture:** A new in-Canvas `SceneExporter` `GLTFExporter`-exports the assembled scene to a `.glb`; the client uploads it and POSTs a `phase:'cycles'` job; the Vercel route fires a Modal web endpoint; a Blender worker renders equirect panos per spot×variant, uploads them to the same `tours` paths, and flips the job to `ready`. The viewer, `render_jobs`, and storage are reused unchanged.

**Tech Stack:** Next.js 16 · React 19 · three 0.183.0 (`GLTFExporter` from `three/examples/jsm/exporters/GLTFExporter.js`) · Supabase · Modal (Python) · Blender 4.x (Cycles) · Vitest + pytest.

## Global Constraints

- three pinned EXACTLY `0.183.0`; do not change it or add deps forcing a different three.
- No Co-Authored-By trailers; author is Leon only. Commit each task when its tests pass.
- **No Supabase service-role key in any client/Vercel code.** It exists ONLY in Modal secrets, used by the worker.
- **Build now, deploy later:** the Photoreal path must be gated on `MODAL_RENDER_URL`. When unset, the API returns 503 and the button is disabled with "not enabled yet." Nothing requires a live GPU to land these tasks.
- Reuse the existing `render_jobs` table, `tours` bucket, and `{jobId}/{spotId}-{variant}.jpg` path convention. `render_jobs.phase` already allows `'cycles'`; `pano_urls` already holds `{day,night}`.
- Pano variants are `day` and `night`; the scene `.glb` excludes the sun + environment (worker owns the world).
- Ignore iCloud conflict-copy files (ending ` 2.ts`/` 2.tsx`/` 2.py`); never edit them.
- Python lives under `render-worker/`; it is NOT part of the Next build and NOT covered by `tsconfig`.

---

### Task 1: Scene export (bridge + exporter component + glb upload)

**Files:**
- Create: `lib/configurator/exportBridge.ts`
- Test: `lib/configurator/exportBridge.test.ts`
- Create: `components/configurator/SceneExporter.tsx`
- Modify: `components/configurator/Scene.tsx` (mount `<SceneExporter />`)
- Modify: `lib/configurator/tourJobs.ts` (add `uploadSceneGlb`)

**Interfaces:**
- Consumes: `capturing`/`setCapturing` from the store (already exists); `GLTFExporter`.
- Produces:
  - `exportBridge.ts`: `type ExportFn = () => Promise<ArrayBuffer>; registerExportHandler(fn: ExportFn | null): void; runExport(): Promise<ArrayBuffer>` (rejects with `Error("export handler not ready")` if none registered).
  - `tourJobs.ts`: `uploadSceneGlb(buf: ArrayBuffer): Promise<string>` — uploads to `scenes/${crypto.randomUUID()}.glb` in the `tours` bucket, returns the public URL.

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/exportBridge.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { registerExportHandler, runExport } from "./exportBridge";

describe("exportBridge", () => {
  beforeEach(() => registerExportHandler(null));

  it("throws when no handler is registered", async () => {
    await expect(runExport()).rejects.toThrow("export handler not ready");
  });

  it("delegates to the registered handler", async () => {
    const buf = new ArrayBuffer(8);
    registerExportHandler(async () => buf);
    expect(await runExport()).toBe(buf);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/exportBridge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the bridge**

```ts
// lib/configurator/exportBridge.ts
export type ExportFn = () => Promise<ArrayBuffer>;

let handler: ExportFn | null = null;

/** SceneExporter registers (and on unmount clears) the export implementation. */
export function registerExportHandler(fn: ExportFn | null): void {
  handler = fn;
}

/** DOM-side orchestration calls this to export the live scene to a binary .glb. */
export function runExport(): Promise<ArrayBuffer> {
  if (!handler) return Promise.reject(new Error("export handler not ready"));
  return handler();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/exportBridge.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Write the SceneExporter component**

```tsx
// components/configurator/SceneExporter.tsx
"use client";

/**
 * SceneExporter — lives inside the Canvas. Registers an export handler that
 * GLTFExporter-exports the assembled scene to a binary .glb. The sun (directional
 * lights) and the slot "+" ghosts are hidden during export so the .glb carries only
 * the room + items + interior lights; the worker adds the day/night world itself.
 * The HDRI environment is a renderer property (not a scene child), so it is never exported.
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { registerExportHandler } from "@/lib/configurator/exportBridge";
import { useConfigurator } from "@/state/configurator";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export default function SceneExporter() {
  const { scene } = useThree();
  const setCapturing = useConfigurator((s) => s.setCapturing);

  useEffect(() => {
    registerExportHandler(async () => {
      // hide the "+ add" ghosts (capturing flag) and the sun (directional lights)
      setCapturing(true);
      await nextFrame();
      const hiddenSuns: THREE.Light[] = [];
      scene.traverse((o) => {
        const l = o as THREE.DirectionalLight;
        if (l.isDirectionalLight && l.visible) { l.visible = false; hiddenSuns.push(l); }
      });
      try {
        const exporter = new GLTFExporter();
        const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            scene,
            (result) => resolve(result as ArrayBuffer),
            (err) => reject(err),
            { binary: true, onlyVisible: true },
          );
        });
        return buf;
      } finally {
        hiddenSuns.forEach((l) => (l.visible = true));
        setCapturing(false);
      }
    });
    return () => registerExportHandler(null);
  }, [scene, setCapturing]);

  return null;
}
```

- [ ] **Step 6: Mount SceneExporter in the Canvas**

In `components/configurator/Scene.tsx`, add the import next to `PanoCapture`:

```tsx
import SceneExporter from "./SceneExporter";
```

and add it right after `<PanoCapture />` inside `SceneInner`'s JSX:

```tsx
      {/* offscreen 360 capture for the tour */}
      <PanoCapture />
      {/* offscreen .glb export for the photoreal (cloud) render */}
      <SceneExporter />
```

- [ ] **Step 7: Add `uploadSceneGlb` to tourJobs**

In `lib/configurator/tourJobs.ts`, add (after `uploadPano`):

```ts
export async function uploadSceneGlb(buf: ArrayBuffer): Promise<string> {
  const supabase = createClient();
  const path = `scenes/${crypto.randomUUID()}.glb`;
  const { error } = await supabase.storage
    .from("tours")
    .upload(path, new Blob([buf], { type: "model/gltf-binary" }), {
      contentType: "model/gltf-binary",
      upsert: true,
    });
  if (error) throw new Error(`uploadSceneGlb failed: ${error.message}`);
  return supabase.storage.from("tours").getPublicUrl(path).data.publicUrl;
}
```

- [ ] **Step 8: Verify build (manual)**

Run: `npx tsc --noEmit` → no new errors in these files.
Run the dev server; open `/configurator`; confirm it still renders and the console has no errors. (The export is exercised end-to-end in Task 2.)

- [ ] **Step 9: Commit**

```bash
git add lib/configurator/exportBridge.ts lib/configurator/exportBridge.test.ts components/configurator/SceneExporter.tsx components/configurator/Scene.tsx lib/configurator/tourJobs.ts
git commit -m "feat(photoreal): in-canvas scene .glb export bridge + upload"
```

---

### Task 2: Photoreal trigger — API route, hook, HUD button (mock-testable)

**Files:**
- Create: `lib/configurator/photoreal.ts`
- Test: `lib/configurator/photoreal.test.ts`
- Modify: `lib/configurator/tourJobs.ts` (extend `createTourJob`)
- Modify: `app/api/render-tour/route.ts` (phase routing + guards + Modal trigger)
- Create: `lib/configurator/useGeneratePhotoreal.ts`
- Modify: `components/configurator/Hud.tsx` (second button)
- Modify: `app/tour/[jobId]/page.tsx` (poll timeout)

**Interfaces:**
- Consumes: `runExport` (Task 1), `uploadSceneGlb` (Task 1), `computeCaptureSpots`, `encodeScene`, `createClient`.
- Produces:
  - `photoreal.ts`: `photorealEnabled(): boolean` (`!!process.env.MODAL_RENDER_URL`); `hdriUrls(origin: string): { day: string; night: string }`.
  - `tourJobs.ts`: `createTourJob(spec: TourSpec, opts?: { phase?: "browser" | "cycles"; sceneUrl?: string }): Promise<string>` — throws `Error("photoreal-unconfigured")` on 503 and `Error("photoreal-inflight")` on 409.
  - `useGeneratePhotoreal.ts`: `useGeneratePhotoreal(room): { generate: () => Promise<void>; phase: "idle"|"exporting"|"uploading"|"error"; note: string; error: string | null }`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/configurator/photoreal.test.ts
import { describe, it, expect } from "vitest";
import { hdriUrls } from "./photoreal";

describe("hdriUrls", () => {
  it("builds absolute day/night EXR urls from an origin", () => {
    expect(hdriUrls("https://x.com")).toEqual({
      day: "https://x.com/hdris/DaySkyHDRI063B_2K_HDR.exr",
      night: "https://x.com/hdris/NightSkyHDRI003_2K_HDR.exr",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/configurator/photoreal.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the photoreal helpers**

```ts
// lib/configurator/photoreal.ts
export function photorealEnabled(): boolean {
  return !!process.env.MODAL_RENDER_URL;
}

/** Absolute URLs to the day/night HDRIs the worker downloads (public static assets). */
export function hdriUrls(origin: string): { day: string; night: string } {
  return {
    day: `${origin}/hdris/DaySkyHDRI063B_2K_HDR.exr`,
    night: `${origin}/hdris/NightSkyHDRI003_2K_HDR.exr`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/configurator/photoreal.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Extend `createTourJob`**

In `lib/configurator/tourJobs.ts`, replace the existing `createTourJob` with:

```ts
export async function createTourJob(
  spec: TourSpec,
  opts: { phase?: "browser" | "cycles"; sceneUrl?: string } = {},
): Promise<string> {
  const res = await fetch("/api/render-tour", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spec, phase: opts.phase ?? "browser", sceneUrl: opts.sceneUrl }),
  });
  if (res.status === 503) throw new Error("photoreal-unconfigured");
  if (res.status === 409) throw new Error("photoreal-inflight");
  if (!res.ok) throw new Error(`createTourJob failed: ${res.status}`);
  const { jobId } = (await res.json()) as { jobId: string };
  return jobId;
}
```

(The Phase 1 caller `createTourJob(spec)` still works — `opts` defaults to `phase:'browser'`.)

- [ ] **Step 6: Extend the API route**

Replace the `POST` in `app/api/render-tour/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSpec } from "@/lib/configurator/tourJobs";
import { photorealEnabled, hdriUrls } from "@/lib/configurator/photoreal";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !isValidSpec(body.spec)) {
    return NextResponse.json({ error: "invalid spec" }, { status: 400 });
  }
  const phase: "browser" | "cycles" = body.phase === "cycles" ? "cycles" : "browser";

  if (phase === "cycles") {
    if (!photorealEnabled()) {
      return NextResponse.json({ error: "photoreal not configured" }, { status: 503 });
    }
    // one in-flight cloud render per user
    const { count } = await supabase
      .from("render_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("phase", "cycles")
      .in("status", ["queued", "rendering"]);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "a photoreal render is already running" }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from("render_jobs")
    .insert({
      user_id: user.id,
      status: phase === "cycles" ? "queued" : "rendering",
      phase,
      spec: body.spec,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (phase === "cycles") {
    const origin = new URL(req.url).origin;
    // fire-and-forget; the worker drives the job to ready/error
    fetch(process.env.MODAL_RENDER_URL!, {
      method: "POST",
      headers: { "content-type": "application/json", "x-trigger-secret": process.env.MODAL_TRIGGER_SECRET ?? "" },
      body: JSON.stringify({ jobId: data.id, sceneUrl: body.sceneUrl, spots: body.spec.spots, hdriUrls: hdriUrls(origin) }),
    }).catch(() => {});
  }

  return NextResponse.json({ jobId: data.id });
}
```

(Leave the existing `GET` and `PATCH` handlers unchanged.)

- [ ] **Step 7: Write the photoreal hook**

```ts
// lib/configurator/useGeneratePhotoreal.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeCaptureSpots } from "./captureSpots";
import { runExport } from "./exportBridge";
import { createTourJob, uploadSceneGlb } from "./tourJobs";
import { encodeScene } from "./serialize";
import { createClient } from "@/lib/supabase/client";
import { useConfigurator } from "@/state/configurator";
import type { RoomShell } from "./types";

type Phase = "idle" | "exporting" | "uploading" | "error";

export function useGeneratePhotoreal(room: RoomShell) {
  const router = useRouter();
  const scene = useConfigurator((s) => s.scene);
  const time = useConfigurator((s) => s.timeOfDay);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login?next=/configurator"); return; }

    try {
      const spots = computeCaptureSpots(room);
      setPhase("exporting");
      setNote("Exporting your scene…");
      const glb = await runExport();

      setPhase("uploading");
      setNote("Uploading to the renderer…");
      const sceneUrl = await uploadSceneGlb(glb);

      const jobId = await createTourJob({ sceneRef: encodeScene(scene), time, spots }, { phase: "cycles", sceneUrl });
      setPhase("idle");
      router.push(`/tour/${jobId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "render failed";
      setError(
        msg === "photoreal-unconfigured" ? "Photoreal rendering isn't enabled yet."
        : msg === "photoreal-inflight" ? "A photoreal render is already in progress."
        : msg,
      );
      setPhase("error");
    }
  }

  return { generate, phase, note, error };
}
```

- [ ] **Step 8: Add the second HUD button**

In `components/configurator/Hud.tsx`, add the import:

```tsx
import { useGeneratePhotoreal } from "@/lib/configurator/useGeneratePhotoreal";
```

After `const tour = useGenerateTour(room);` add:

```tsx
  const photo = useGeneratePhotoreal(room);
```

In the "Generate 360 walkthrough" block, add the photoreal button right after the existing quick-preview button (inside the same `<div>`):

```tsx
          <button
            className="mt-1 w-full px-3 py-1.5 rounded text-sm bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-400/30 transition disabled:opacity-50"
            onClick={photo.generate}
            disabled={photo.phase === "exporting" || photo.phase === "uploading"}
          >
            {photo.phase === "exporting" ? "Exporting…"
              : photo.phase === "uploading" ? "Uploading…"
              : "Photoreal walkthrough"}
          </button>
          {photo.phase === "error" && <p className="mt-1 text-xs text-amber-300">{photo.error}</p>}
```

Also extend the full-screen overlay condition so it covers the photoreal export/upload too — change `const rendering = tour.phase === "capturing" || tour.phase === "uploading";` to:

```tsx
  const rendering =
    tour.phase === "capturing" || tour.phase === "uploading" ||
    photo.phase === "exporting" || photo.phase === "uploading";
  const overlayNote = photo.phase !== "idle" && photo.phase !== "error" ? photo.note : tour.note;
```

and in the overlay body use `{overlayNote || "Preparing…"}` instead of `{tour.note || "Preparing…"}`.

- [ ] **Step 9: Add a poll timeout to the tour page**

A `cycles` job whose worker never finishes would otherwise spin forever. In `app/tour/[jobId]/page.tsx`, give the poll loop a 15-minute ceiling. Replace the `poll` definition inside the `useEffect` with:

```tsx
    const start = Date.now();
    const poll = async () => {
      try {
        const j = await getTourJob(jobId);
        if (!alive) return;
        if (j.status === "ready") return setJob(j);
        if (j.status === "error") return setErr(j.error ?? "render failed");
        if (Date.now() - start > 15 * 60 * 1000) return setErr("Render timed out — please try again.");
        timer = setTimeout(poll, 1500); // still queued/rendering
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "failed to load tour");
      }
    };
```

(Only the two lines — `const start = Date.now();` and the timeout check — are new; the rest is the existing loop.)

- [ ] **Step 10: Verify (manual, mock trigger)**

Run: `npx tsc --noEmit` → clean. Run the dev server logged in.
Without `MODAL_RENDER_URL` set: click **Photoreal walkthrough** → expect the amber note "Photoreal rendering isn't enabled yet." (503 path), and no job created.
To exercise the happy path against a mock, temporarily set `MODAL_RENDER_URL=https://example.com/ignored` in `.env.local`, restart, click the button: a `phase:'cycles'` row appears in `render_jobs` (status `queued`), `tours/scenes/<uuid>.glb` is uploaded, and you land on `/tour/<id>` showing the spinner (no worker yet, so it stays "Preparing…"). Remove the mock env afterward.

- [ ] **Step 11: Commit**

```bash
git add lib/configurator/photoreal.ts lib/configurator/photoreal.test.ts lib/configurator/tourJobs.ts app/api/render-tour/route.ts lib/configurator/useGeneratePhotoreal.ts components/configurator/Hud.tsx "app/tour/[jobId]/page.tsx"
git commit -m "feat(photoreal): cloud-render trigger route, hook, and HUD button"
```

---

### Task 3: Blender render script (local-testable)

**Files:**
- Create: `render-worker/render_tour.py`
- Create: `render-worker/tests/test_render_tour.py`
- Create: `render-worker/requirements-dev.txt`

**Interfaces:**
- Produces (pure, importable without `bpy`): `output_name(spot_id, variant) -> str` (`f"{spot_id}-{variant}.jpg"`); `public_url(supabase_url, job_id, spot_id, variant) -> str`; `parse_args(argv: list[str]) -> dict` (parses the `--` args). The Blender-only work lives in functions that import `bpy` lazily, so the module imports under plain CPython for tests.

- [ ] **Step 1: Write the failing test**

```python
# render-worker/tests/test_render_tour.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from render_tour import output_name, public_url, parse_args


def test_output_name_matches_js_convention():
    assert output_name("living", "day") == "living-day.jpg"
    assert output_name("master", "night") == "master-night.jpg"


def test_public_url():
    assert public_url("https://x.supabase.co", "job1", "living", "day") == (
        "https://x.supabase.co/storage/v1/object/public/tours/job1/living-day.jpg"
    )


def test_parse_args_reads_double_dash_block():
    argv = ["blender", "--background", "--python", "render_tour.py", "--",
            "--job", "j1", "--scene", "s.glb",
            "--spots", '[{"id":"living","pos":[1,1.6,2]}]',
            "--hdri-day", "d.exr", "--hdri-night", "n.exr",
            "--supabase-url", "https://x.supabase.co"]
    cfg = parse_args(argv)
    assert cfg["job"] == "j1"
    assert cfg["scene"] == "s.glb"
    assert cfg["spots"][0]["id"] == "living"
    assert cfg["hdri"]["day"] == "d.exr"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd render-worker && python -m pytest tests/test_render_tour.py -q`
Expected: FAIL — `render_tour` not found.

- [ ] **Step 3: Write the render script**

```python
# render-worker/render_tour.py
"""Blender Cycles worker: render day+night equirect panoramas of a scene .glb.

Pure helpers (output_name/public_url/parse_args) import without bpy for unit tests.
The render path imports bpy lazily and runs under:
    blender --background --python render_tour.py -- <args>
"""
import json
import os
import sys
import urllib.request

PANO_W, PANO_H = 4096, 2048
SAMPLES = 128
VARIANTS = ("day", "night")


# ---- pure helpers (no bpy) ------------------------------------------------
def output_name(spot_id: str, variant: str) -> str:
    return f"{spot_id}-{variant}.jpg"


def public_url(supabase_url: str, job_id: str, spot_id: str, variant: str) -> str:
    return f"{supabase_url}/storage/v1/object/public/tours/{job_id}/{output_name(spot_id, variant)}"


def parse_args(argv: list[str]) -> dict:
    args = argv[argv.index("--") + 1:] if "--" in argv else argv
    out: dict = {"hdri": {}}
    i = 0
    while i < len(args):
        key, val = args[i], args[i + 1]
        if key == "--job": out["job"] = val
        elif key == "--scene": out["scene"] = val
        elif key == "--spots": out["spots"] = json.loads(val)
        elif key == "--hdri-day": out["hdri"]["day"] = val
        elif key == "--hdri-night": out["hdri"]["night"] = val
        elif key == "--supabase-url": out["supabase_url"] = val
        i += 2
    return out


# ---- supabase REST (no bpy) ----------------------------------------------
def _service_key() -> str:
    return os.environ["SUPABASE_SERVICE_KEY"]


def upload_jpeg(supabase_url: str, job_id: str, spot_id: str, variant: str, path: str) -> str:
    with open(path, "rb") as f:
        data = f.read()
    obj = f"tours/{job_id}/{output_name(spot_id, variant)}"
    req = urllib.request.Request(
        f"{supabase_url}/storage/v1/object/{obj}",
        data=data, method="POST",
        headers={
            "Authorization": f"Bearer {_service_key()}",
            "apikey": _service_key(),
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        },
    )
    urllib.request.urlopen(req).read()
    return public_url(supabase_url, job_id, spot_id, variant)


def patch_job(supabase_url: str, job_id: str, fields: dict) -> None:
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/render_jobs?id=eq.{job_id}",
        data=json.dumps(fields).encode(), method="PATCH",
        headers={
            "Authorization": f"Bearer {_service_key()}",
            "apikey": _service_key(),
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    urllib.request.urlopen(req).read()


def download(url: str, dest: str) -> str:
    urllib.request.urlretrieve(url, dest)
    return dest


# ---- Blender render (imports bpy lazily) ----------------------------------
def _setup_world(hdri_path: str, variant: str):
    import bpy
    import math
    scene = bpy.context.scene
    world = bpy.data.worlds.new("TourWorld")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(hdri_path)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    bg.inputs["Strength"].default_value = 1.0 if variant == "day" else 0.15

    # day gets a sun roughly matching the configurator's midday arc; night has none
    if variant == "day":
        sun_data = bpy.data.lights.new("Sun", "SUN")
        sun_data.energy = 3.0
        sun_obj = bpy.data.objects.new("Sun", sun_data)
        sun_obj.rotation_euler = (math.radians(50), 0.0, math.radians(30))
        scene.collection.objects.link(sun_obj)


def _setup_render():
    import bpy
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.render.resolution_x = PANO_W
    scene.render.resolution_y = PANO_H
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
    scene.view_settings.view_transform = "Filmic"  # calibrated in Task 5


def _make_camera():
    import bpy
    cam_data = bpy.data.cameras.new("PanoCam")
    cam_data.type = "PANO"
    # Blender 4.x: equirectangular panorama
    try:
        cam_data.panorama_type = "EQUIRECTANGULAR"
    except AttributeError:
        cam_data.cycles.panorama_type = "EQUIRECTANGULAR"
    cam_obj = bpy.data.objects.new("PanoCam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    # look along +Z, upright (matches the configurator's forward)
    import math
    cam_obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    return cam_obj


def render_all(cfg: dict, tmpdir: str = "/tmp") -> dict:
    import bpy
    patch_job(cfg["supabase_url"], cfg["job"], {"status": "rendering"})
    pano_urls = {"day": {}, "night": {}}
    for variant in VARIANTS:
        # fresh scene per variant
        bpy.ops.wm.read_factory_settings(use_empty=True)
        scene_glb = download(cfg["scene"], os.path.join(tmpdir, "scene.glb"))
        bpy.ops.import_scene.gltf(filepath=scene_glb)
        hdri = download(cfg["hdri"][variant], os.path.join(tmpdir, f"{variant}.exr"))
        _setup_world(hdri, variant)
        _setup_render()
        cam = _make_camera()
        for spot in cfg["spots"]:
            x, y, z = spot["pos"]
            # three.js (x,y up,z) -> Blender (x, -z, y up)
            cam.location = (x, -z, y)
            out_path = os.path.join(tmpdir, output_name(spot["id"], variant))
            bpy.context.scene.render.filepath = out_path
            bpy.ops.render.render(write_still=True)
            url = upload_jpeg(cfg["supabase_url"], cfg["job"], spot["id"], variant, out_path)
            pano_urls[variant][spot["id"]] = url
    patch_job(cfg["supabase_url"], cfg["job"], {"status": "ready", "pano_urls": pano_urls})
    return pano_urls


def main():
    cfg = parse_args(sys.argv)
    try:
        render_all(cfg)
    except Exception as exc:  # noqa: BLE001 — report any failure back to the job
        patch_job(cfg["supabase_url"], cfg["job"], {"status": "error", "error": str(exc)[:500]})
        raise


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd render-worker && python -m pytest tests/test_render_tour.py -q`
Expected: PASS (3 passed). (`bpy` is never imported by the pure helpers.)

- [ ] **Step 5: Local Blender smoke test (manual, if Blender installed)**

Export a sample `.glb` from the configurator (Task 2's mock flow uploads one; download it from Supabase), then run with a throwaway Supabase service key in the env:

```bash
cd render-worker
SUPABASE_SERVICE_KEY=dummy blender --background --python render_tour.py -- \
  --job test --scene file:///abs/path/scene.glb \
  --spots '[{"id":"living","pos":[0,1.6,1]}]' \
  --hdri-day /abs/DaySkyHDRI063B_2K_HDR.exr --hdri-night /abs/NightSkyHDRI003_2K_HDR.exr \
  --supabase-url https://x.supabase.co
```

Expected: it imports the glb, renders, and writes `/tmp/living-day.jpg` + `/tmp/living-night.jpg` as 4096×2048 JPEGs (the upload/patch will error against the dummy key — that's fine for the render check; comment out `upload_jpeg`/`patch_job` calls or use a real key to test those). Confirm the images are 2:1 and not mirrored relative to the configurator.

- [ ] **Step 6: Commit**

```bash
git add render-worker/render_tour.py render-worker/tests/test_render_tour.py render-worker/requirements-dev.txt
git commit -m "feat(photoreal): Blender Cycles render script + pure-helper tests"
```

`render-worker/requirements-dev.txt`:

```
pytest>=8
```

---

### Task 4: Modal app + deploy docs

**Files:**
- Create: `render-worker/modal_app.py`
- Create: `render-worker/README.md`

**Interfaces:**
- Consumes: `render_tour.render_all` / `render_tour.parse_args`-style config (Task 3).
- Produces: a deployable Modal web endpoint that validates `x-trigger-secret`, spawns the render, and returns 202. No new code is imported by the Next app.

- [ ] **Step 1: Write the Modal app**

```python
# render-worker/modal_app.py
"""Modal deployment for the Blender render worker.

Deploy:  modal deploy modal_app.py
The `trigger` web endpoint URL it prints becomes MODAL_RENDER_URL on Vercel.
"""
import modal

app = modal.App("domusmat-tour-render")

# build the full image (incl. the render script) BEFORE any function uses it
image = (
    modal.Image.debian_slim()
    .apt_install("blender", "xorg", "libxkbcommon0")  # headless Blender + GL deps
    .add_local_file("render_tour.py", "/root/render_tour.py", copy=True)
)

secrets = [modal.Secret.from_name("domusmat-render")]  # SUPABASE_URL, SUPABASE_SERVICE_KEY, MODAL_TRIGGER_SECRET


@app.function(image=image, gpu="A10G", secrets=secrets, timeout=1800)
def render(job_id: str, scene_url: str, spots: list, hdri_urls: dict):
    import os, json, subprocess
    subprocess.run(
        [
            "blender", "--background", "--python", "/root/render_tour.py", "--",
            "--job", job_id, "--scene", scene_url,
            "--spots", json.dumps(spots),
            "--hdri-day", hdri_urls["day"], "--hdri-night", hdri_urls["night"],
            "--supabase-url", os.environ["SUPABASE_URL"],
        ],
        check=True,
    )


@app.function(image=image, secrets=secrets)
@modal.fastapi_endpoint(method="POST")
async def trigger(request):
    import os
    from fastapi.responses import JSONResponse
    # shared secret arrives in the x-trigger-secret header (set by the Vercel route)
    if request.headers.get("x-trigger-secret") != os.environ["MODAL_TRIGGER_SECRET"]:
        return JSONResponse({"error": "forbidden"}, status_code=403)
    p = await request.json()
    render.spawn(p["jobId"], p["sceneUrl"], p["spots"], p["hdriUrls"])
    return JSONResponse({"accepted": True}, status_code=202)
```

> Note: Modal's web-endpoint decorator name has changed across versions (`web_endpoint` → `fastapi_endpoint`). Confirm the installed version's name at deploy time. The contract that must NOT change: the secret arrives in the `x-trigger-secret` header and the JSON body is `{ jobId, sceneUrl, spots, hdriUrls }` (fixed by Task 2).

- [ ] **Step 2: Write the README**

```markdown
# render-worker — photoreal tour renderer (Modal + Blender)

Renders day+night equirectangular panoramas of a configured scene with Blender Cycles.

## Local test
    python -m pytest tests/                # pure helpers, no Blender
    blender --background --python render_tour.py -- <args>   # full render (see plan Task 3)

## Deploy
1. `pip install modal && modal token new`
2. Create the secret (Supabase service-role key — NEVER commit it):
       modal secret create domusmat-render \
         SUPABASE_URL=https://<proj>.supabase.co \
         SUPABASE_SERVICE_KEY=<service-role-key> \
         MODAL_TRIGGER_SECRET=<random-string>
3. `modal deploy modal_app.py` → copy the `trigger` web endpoint URL.
4. On Vercel, set env:
       MODAL_RENDER_URL=<trigger endpoint URL>
       MODAL_TRIGGER_SECRET=<same random string>
5. Redeploy the Next app. The "Photoreal walkthrough" button is now live.

## Cost
A10G GPU, ~1–3 min/tour for a few rooms × 2 variants → on the order of a few US cents per tour.
```

- [ ] **Step 3: Verify (manual)**

Run: `python -c "import ast; ast.parse(open('render-worker/modal_app.py').read())"` → no syntax error.
(Full deploy is the user's step when they're ready for billing; do not deploy here.)

- [ ] **Step 4: Commit**

```bash
git add render-worker/modal_app.py render-worker/README.md
git commit -m "feat(photoreal): Modal app + deploy docs (deploy-later)"
```

---

### Task 5: Calibration pass + wiring docs

**Files:**
- Modify: `render-worker/render_tour.py` (tone-mapping / light-strength constants)
- Modify: `docs/superpowers/specs/2026-06-25-pano-tour-phase2-renderer-design.md` (record final calibration values)

> This task is performed AFTER the user has deployed the worker and can compare a real cloud pano against the Phase 1 quick preview. It has no automated test — its deliverable is a visual match.

- [ ] **Step 1: Render a calibration tour**

Deploy the worker (README), generate a Photoreal walkthrough of a lit room, and open it next to the same room's Phase 1 quick preview (Day).

- [ ] **Step 2: Tune to match**

Adjust in `render_tour.py` until the photoreal day pano reads consistently with the live view (not necessarily identical — it's path-traced — but matching overall brightness and warmth):
- `_setup_render`: try `view_transform = "AgX"` vs `"Filmic"`, and set `bpy.context.scene.view_settings.exposure` (start near `0.0`, adjust ±1).
- `_setup_world`: day/night `Strength` (currently `1.0`/`0.15`) and the sun `energy` (currently `3.0`).
- If interior ceiling lights are too dim/bright after glTF import, scale them: in `render_all`, after import, multiply each imported light's `energy` by a constant (e.g. `for o in bpy.data.objects: if o.type=='LIGHT': o.data.energy *= K`).

- [ ] **Step 3: Record the values**

Append a short "Calibration (final)" section to the Phase 2 spec with the chosen `view_transform`, `exposure`, world strengths, sun energy, and any light-scale `K`, so the values are documented rather than mysterious.

- [ ] **Step 4: Commit**

```bash
git add render-worker/render_tour.py docs/superpowers/specs/2026-06-25-pano-tour-phase2-renderer-design.md
git commit -m "chore(photoreal): calibrate Blender output to match the live view"
```

---

## Notes for the implementer

- **Coordinate mapping:** three.js is Y-up `(x, y, z)`; Blender is Z-up. The glTF importer applies the conversion to geometry automatically, but the **camera position** is passed as raw three.js coords, so it's mapped explicitly in `render_all`: `(x, y, z)` → `(x, -z, y)`. If panos look like they're shot from the wrong spot, this is the line to check.
- **Not mirrored:** the Blender equirect camera renders a correct (un-mirrored) panorama, unlike the Phase 1 cubemap path — so do NOT apply the Phase 1 east-west negation here. Verify against a window during calibration.
- **glb size:** if exports exceed ~60MB, add a guard in `useGeneratePhotoreal` (`if (glb.byteLength > 60_000_000) throw new Error("scene too large to render")`) before upload.
- **Modal API drift:** Modal's decorators evolve (`web_endpoint` → `fastapi_endpoint`); confirm the installed version's names at deploy time. The contract that must NOT change is the trigger payload (`jobId`, `sceneUrl`, `spots`, `hdriUrls`) and the secret header.
- **Security:** the service-role key only ever exists in the Modal secret `domusmat-render`. Never add it to `.env.local`, Vercel, or any committed file.
```
