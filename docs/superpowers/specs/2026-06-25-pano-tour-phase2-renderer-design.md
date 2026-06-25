# Phase 2 — Photoreal Cloud Renderer Design

**Date:** 2026-06-25
**Status:** Approved (build now, deploy later; user trusts technical decisions)
**Builds on:** `2026-06-25-pano-tour-rendering-design.md` (overall pano tour) and the shipped Phase 1 (in-browser capture).

## Goal

Add a **photoreal** capture path to the existing pano tour: the customer presses **"Photoreal walkthrough"**, their configured scene is path-traced in the cloud (Blender Cycles on a GPU), and the result opens in the *same* tour viewer with the *same* Day/Night toggle. The free in-browser "quick preview" stays exactly as it is.

## Why / Constraints

- Realism that does not depend on the customer's GPU → render server-side (decided in Phase 1 brainstorm).
- Coexist with Phase 1: the instant browser tour remains the free quick preview; photoreal is a separate, opt-in (paid) action. Cost is incurred only when the user clicks "Photoreal walkthrough".
- **Build now, deploy later:** all code is written and committed, testable with a local Blender install. Nothing touches a paid GPU until `MODAL_RENDER_URL` + Modal secrets are configured. Until then the Photoreal button is disabled with a "not yet available" note.
- Reuse everything downstream: `render_jobs`, the `tours` bucket + paths, and `TourViewer` are unchanged. Only a new *capture path* and a *worker* are added.
- No Supabase service-role key in any client or Vercel code — it lives ONLY in Modal secrets, used by the worker.
- Existing stack unchanged: Next.js 16 / React 19 / Three.js 0.183.0 / R3F / Supabase / Vercel. The worker is a separate Python (Modal) app outside Vercel.

## Architecture

```
[Configurator]                          [Vercel API route]            [Modal GPU worker (Python+Blender)]
"Photoreal walkthrough"
  1. export live three.Scene → .glb
  2. upload .glb → tours/scenes/{uuid}.glb
  3. POST /api/render-tour            creates render_jobs row
     { phase:'cycles', sceneUrl,      (status 'queued', phase
       spots }                         'cycles') → fire Modal ──────►  4. download scene.glb + day/night HDRIs
                                        web endpoint (if configured)   5. per variant {day,night} per spot:
        │                                                                  set world (HDRI+sun), panoramic
        │                                                                  equirect camera at spot, Cycles render
        │                                                              6. upload {spotId}-{variant}.jpg to tours/
        └──────────► /tour/[jobId] polls ◄──────────────────────────  7. PATCH render_jobs → 'ready' (or 'error')
                     (same page + viewer)
```

The key decision: **`GLTFExporter` the already-assembled scene** (room meshes + textures + placed GLB items + interior ceiling lights) into a single binary `.glb`, rather than rebuilding the procedural room in Blender. The worker imports that `.glb` and only adds the things glTF can't carry: the day/night world (HDRI) and the sun.

## Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scene → worker | `GLTFExporter` (binary `.glb`) of the live `three.Scene` | Faithful to what's on screen; no Blender geometry rebuild. |
| What the `.glb` includes | Room surfaces + textures + placed items + interior lights (spot/point). **Excludes** the sun and environment. | Day/night world is variant-specific; the worker owns it. |
| Day/night | Worker sets Blender world = day HDRI + sun lamp, then night HDRI (dim, no sun) | Matches Phase 1 semantics; reuses `{spotId}-{variant}.jpg` paths. |
| Engine | Blender Cycles, panoramic **equirectangular** camera | Path-traced GI; native 360 output. |
| Host | Modal (serverless GPU, web endpoint, secrets) | Per-second billing, custom Blender container, no idle cost. |
| Trigger | Vercel API route → Modal web endpoint (fire-and-forget); worker updates the job | Keeps Vercel stateless; worker owns the long task. |
| Upload from worker | Worker writes panos + PATCHes job using a Supabase **service-role key** (Modal secret) | Worker is trusted server-side; bypasses RLS safely. |
| Resolution / samples | 4096×2048 equirect, 128 Cycles samples + denoise (defaults, tunable) | Balance of quality vs GPU-seconds (~cents/tour). |
| Gating | `MODAL_RENDER_URL` env unset → API returns "photoreal not configured"; button disabled | Build-now / deploy-later. |
| Rate limit | Max 1 in-flight `cycles` job per user (checked in the API route) | Cost guard against accidental spamming. |

## Components

- **`lib/configurator/exportBridge.ts`** — `registerExportHandler(fn|null)`, `runExport(): Promise<ArrayBuffer>` (mirrors `captureBridge`). Throws "export handler not ready" if none registered.
- **`components/configurator/SceneExporter.tsx`** — in-Canvas; registers a handler that `GLTFExporter`-exports `scene` to a binary `.glb` `ArrayBuffer`, temporarily hiding the sun + slot ghosts (reuses the `capturing` flag) so only room+items+interior-lights are exported.
- **`lib/configurator/tourJobs.ts`** (extend) — `uploadSceneGlb(buf): Promise<string>` (uploads to `tours/scenes/{crypto.randomUUID()}.glb` — path independent of jobId, returns the public URL); `createTourJob(spec, opts?: { phase?: 'browser'|'cycles'; sceneUrl?: string })` passes phase + sceneUrl through to the POST.
- **`lib/configurator/useGeneratePhotoreal.ts`** — orchestrates: auth check → `runExport()` → `uploadSceneGlb(buf)` → `createTourJob(spec, { phase:'cycles', sceneUrl })` (one POST creates the job *and* triggers the worker) → `router.push('/tour/'+jobId)`. Exposes `{ generate, phase, note, error }` like `useGenerateTour`. Shows a "not available" state if the server reports photoreal unconfigured (HTTP 503).
- **`app/api/render-tour/route.ts`** (extend POST) — accepts `{ spec, phase?, sceneUrl? }`. For `phase:'cycles'`: reject (503) if `MODAL_RENDER_URL` unset; reject (409) if the user already has a `queued`/`rendering` cycles job; else insert row (`phase:'cycles'`, `status:'queued'`) and `fetch(MODAL_RENDER_URL, { jobId, sceneUrl, spots, hdriUrls })` (fire-and-forget, `MODAL_TRIGGER_SECRET` header). The browser path is unchanged.
- **`render-worker/render_tour.py`** — standalone Blender script (runs under `blender --background --python`). Args: job id, scene `.glb` URL, spots JSON, HDRI URLs, Supabase URL + service key (from env). Imports the `.glb`; for each variant sets the world (HDRI + sun for day; dim HDRI, no sun for night), tone-mapping to match the web (Filmic/AgX + exposure), and for each spot positions a panoramic equirect camera at the spot, renders Cycles to a JPEG, uploads to `tours/{jobId}/{spotId}-{variant}.jpg`. PATCHes the job `rendering`→`ready`, or `error` with a message.
- **`render-worker/modal_app.py`** — Modal app: an image with Blender installed, a web endpoint `render` that validates `MODAL_TRIGGER_SECRET`, `.spawn()`s the render function (so the HTTP call returns immediately), and the render function invokes `render_tour.py`. Secrets: `SUPABASE_SERVICE_KEY`, `SUPABASE_URL`, `MODAL_TRIGGER_SECRET`.
- **`render-worker/README.md`** — how to test locally with Blender and how to deploy to Modal + set env on Vercel.
- **HUD** — a second button, **"Photoreal walkthrough"**, beside the quick-preview button, wired to `useGeneratePhotoreal`.

## Data Flow / Job Lifecycle (cycles)

1. User clicks **Photoreal walkthrough** (must be logged in).
2. Client exports the scene to `.glb` and uploads it to `tours/scenes/{uuid}.glb` (path independent of jobId), getting back a `sceneUrl`.
3. Client POSTs `{ spec, phase:'cycles', sceneUrl }`. The API inserts the row (`phase:'cycles'`, `status:'queued'`), fires the Modal endpoint with `{ jobId, sceneUrl, spots, hdriUrls }`, and returns `{ jobId }`; client routes to `/tour/{jobId}`.
4. Worker: `rendering` → renders all variants×spots → uploads → `ready` (or `error`).
5. `/tour/{jobId}` polls (already built) and shows the viewer when `ready`.

## Data Model

No schema change — `render_jobs.phase` already supports `'cycles'`, `pano_urls` already holds `{day,night}`, `spec` already holds the spots. The `.glb` lives in the existing `tours` bucket. (Optional later: a `scene_url` column; for now store it inside `spec`.)

## Error Handling

- `MODAL_RENDER_URL` unset → API 503; the Photoreal button shows "Photoreal rendering isn't enabled yet."
- Worker failure (download/import/render/upload) → PATCH `status:'error'` + message; the tour page already surfaces errors + a back link.
- Worker never starts / times out → the tour page treats a `queued`/`rendering` job whose `created_at` is older than ~15 minutes as timed out and shows "render timed out" + retry (no server cron needed for MVP).
- Concurrent cycles job for the same user → API 409; button shows "a photoreal render is already in progress."
- Oversized `.glb` (> cap, e.g. 60MB) → client aborts with a friendly message before upload.

## Testing

- **`exportBridge`** — unit test register/run/throw (like `captureBridge`).
- **Scene export** — a thin pure helper `glbFilename()`/path tested; the actual `GLTFExporter` call is verified manually (download a `.glb`, open in a glTF viewer / Blender).
- **API route** — unit-test the new guards: 503 when unconfigured, 409 on concurrent cycles job, happy-path inserts `phase:'cycles'` (mock Supabase as in Phase 1's validator tests where pure).
- **Worker `render_tour.py`** — pure helpers (camera placement from spot, output path via the same `{spotId}-{variant}.jpg` convention, arg parsing) unit-tested with `pytest`; the full Blender render verified locally with `blender --background --python render_tour.py -- <sample args>` producing 2:1 JPEGs.
- **Calibration** — a manual pass comparing one worker pano against the same Phase 1 spot, adjusting Blender tone-mapping/exposure + light-intensity scaling until they read consistently.

## Phasing / Milestones (single plan, ordered tasks)

1. Scene export (bridge + `SceneExporter` + glb upload).
2. API route extension (phase routing, guards, Modal trigger) + `useGeneratePhotoreal` + HUD button (works end-to-end against a *mock* trigger URL).
3. Worker: `render_tour.py` Blender script (local-testable) + pure-helper tests.
4. Worker: `modal_app.py` + image + secrets + README (deploy instructions).
5. Calibration pass + docs.

Each task is independently testable; tasks 1–2 ship a working "photoreal requested" flow (job created, scene uploaded, waiting on a worker) without any GPU; tasks 3–5 make the worker real.

## Risks / Open Items

- **glTF→Blender drift:** PBR materials and `KHR_lights_punctual` intensities import closely but not identically; needs the calibration pass. Mitigation: keep interior lights in the glb, tune only world/exposure.
- **`.glb` size:** embedded room textures (AmbientCG) may make the glb 10–40MB. Acceptable (one upload per tour); cap at 60MB.
- **Cost:** ~cents/tour but real; the per-user single-in-flight limit is the guard. Document expected GPU-seconds in the worker README.
- **Cold starts:** Modal cold-start + Blender boot adds latency to the first render; acceptable for an async, progress-tracked action.
- **HDRI access:** the worker fetches the day/night EXRs from the deployed site's public `/hdris/...` URLs; those must be reachable (they are, public static assets).

## Out of Scope

- Per-item shoppable hotspots, video flythroughs (still out, as Phase 1).
- A render queue/dashboard, retries-with-backoff beyond a single manual retry.
- Auto-upgrading existing quick tours to photoreal (the viewer-side "upgrade" button was considered and deferred — user chose separate buttons).
- A `scene_url` DB column (stored in `spec` for now).

## Calibration (final)
- Interior lights: drop the realtime fill POINT lights at import (Cycles GI provides ambient bounce); keep SPOT downlights, force them straight down, and scale energy by `LIGHT_BOOST = 80` (glTF candela → Blender watts gap).
- Tone-mapping: `view_transform = "Filmic"`.
- World: day HDRI strength `1.0` + a sun lamp (energy `3.0`); night HDRI strength `0.15`, no sun.
- GPU: OptiX → CUDA → CPU fallback.
- Production render: `4096×2048`, `128` samples, denoised.
- Scene `.glb` textures capped at `512px` to stay under Supabase Free's 50 MB per-file upload limit; raise to 1–2K on Supabase Pro.
