# On-Demand Photoreal Pano Tour — Design

**Date:** 2026-06-25
**Status:** Approved (defaults locked by user; user trusts engine/infra decisions)

## Goal

Let a customer who has configured their room in the 3D configurator press **"Generate walkthrough"** and receive a photoreal, navigable 360° panorama tour of *their own configuration* — D5-Render-style fidelity, with the heavy rendering done in the cloud (not on the customer's GPU).

## Why / Constraints

- The configurator is customer-specific: the tour must reflect the customer's actual item/material/lighting picks (**on-demand**, not a fixed showroom).
- Output must be **realistic** (true global illumination) **and not depend on the customer's GPU** → rendering runs server-side on a cloud GPU.
- Existing stack: Next.js 16 / React 19 / Three.js 0.183 / R3F, Supabase (auth/orders/storage), deployed on Vercel. The render worker lives **outside** Vercel (Vercel has no GPU and short function limits).

## Architecture (phased)

One architecture, built in two phases. Only the **capture engine** differs between phases; scene export, job store, storage, and viewer are built once and reused.

```
[Configurator]                      [Render service]                     [Tour viewer]
configure + "Generate    ──spec──►  P1: client CubeCamera capture   ──►  Photo Sphere Viewer
walkthrough"             (glTF/     P2: Modal GPU worker, Blender    panos  (virtual-tour plugin)
                          scene +    Cycles renders equirect/spot    to    loads panos + nav hotspots
                          spots)                                     Supabase     ▲
       │                     │                  │                    Storage      │
       └─ POST /api/render-tour ─► render_jobs row ─── client polls status ───────┘
```

- **Phase 1 — End-to-end skeleton, in-browser capture.** Build the entire flow with a cheap `CubeCamera → equirectangular` capture (reuses the current rasterized renderer). Ships a working tour: export → job → panos in storage → viewer with hotspots. Light on the client GPU, zero render infra. De-risks the whole UX cheaply.
- **Phase 2 — Blender Cycles GPU worker.** Replace only the capture stage. Export the fully-assembled `three.Scene` to glTF via `GLTFExporter`, send it + HDRI reference + camera spots to a **Modal** serverless-GPU worker that renders photoreal equirect panoramas with **Blender Cycles** and uploads them to Supabase Storage. Viewer and job model are unchanged.

Phase 1 is shippable on its own and remains the no-infra fallback. Phase 2 is the "realistic" payoff.

## Locked Decisions (defaults)

| Decision | Choice | Rationale |
|---|---|---|
| Render engine (P2) | **Blender Cycles** on cloud GPU | Mature, scriptable (Python), path-traced GI; imports glTF + HDRI world. |
| GPU host (P2) | **Modal** | Serverless per-second GPU billing, easy custom Blender container, no idle cost. |
| Pano viewer | **Photo Sphere Viewer** (`@photo-sphere-viewer/core` + virtual-tour + markers plugins) | React-friendly, built-in virtual-tour/hotspot navigation. |
| Capture spots | **One per room, at eye height (1.6 m)**, auto-placed from `room.lightZones` centers | Reuses existing room metadata; predictable coverage. |
| Hotspots | **Navigation-only between spots** (MVP) | Per-item info cards deferred (YAGNI). |
| Pano resolution | **4K equirect (4096×2048)** per spot | Sharp on desktop; ~cents/tour on Modal. |
| Persistence | Tours **tied to the user's account**, rows in Supabase + panos in a `tours` bucket | Revisitable; fits existing auth/orders. |

## Components

Each unit has one responsibility and a defined interface.

- **`lib/configurator/captureSpots.ts`** — `computeCaptureSpots(room): CaptureSpot[]` where `CaptureSpot = { id: string; label: string; pos: [number,number,number]; }`. One per light zone, centered, y = eye height. Pure function, unit-testable.
- **`lib/configurator/exportScene.ts`** —
  - Phase 1: `serializeTourSpec(scene, room, spots): TourSpec` (existing `SceneDocument` + spots + HDRI/time-of-day).
  - Phase 2: `exportSceneGltf(threeScene): ArrayBuffer` via `GLTFExporter` (binary glTF of the assembled room + placed GLBs + lights), bundled with HDRI ref + spots.
- **`components/configurator/PanoCapture.tsx`** (Phase 1) — given spots, drives a `THREE.CubeCamera` at each spot, converts each cubemap to an equirectangular image (shader or `CubemapToEquirectangular` util), returns `Blob[]`. Renders nothing visible; invoked on demand.
- **`app/api/render-tour/route.ts`** — `POST` creates a `render_jobs` row (`status: 'queued'`), returns `{ jobId }`. Phase 2 additionally enqueues a Modal job (HTTP trigger) with the glTF + spec. `GET ?jobId=` returns job status + pano URLs.
- **`render-worker/`** (Phase 2, separate Modal Python app, own repo dir) — container with Blender; on job: download glTF + HDRI, build scene, set Cycles + HDRI world, for each spot render a panoramic-equirect camera at 4K, upload PNGs to Supabase Storage, PATCH job `status: 'ready'` with URLs. On failure → `status: 'error'` + message.
- **`components/tour/TourViewer.tsx`** — mounts Photo Sphere Viewer with the panos as virtual-tour nodes; nav hotspots link adjacent spots (links derived from spot adjacency).
- **`app/tour/[jobId]/page.tsx`** — polls `GET /api/render-tour?jobId=`; shows progress while `queued`/`rendering`, mounts `TourViewer` when `ready`, shows error + retry when `error`.

## Data Flow / Job Lifecycle

1. Customer configures, clicks **Generate walkthrough**.
2. Client computes spots, serializes the tour spec (P1) or exports glTF (P2).
3. `POST /api/render-tour` → inserts `render_jobs` row (`queued`), returns `jobId`. Client routes to `/tour/[jobId]`.
4. **P1:** client captures panos in-browser, uploads to the `tours` bucket, PATCHes job → `ready`.
   **P2:** Modal worker renders + uploads, PATCHes job → `ready`.
5. `/tour/[jobId]` polls; on `ready`, loads panos + hotspots in the viewer.

## Data Model

`render_jobs` (Supabase):
- `id uuid pk`, `user_id uuid` (nullable for guests), `status text` (`queued|rendering|ready|error`), `phase text` (`browser|cycles`), `spec jsonb` (spots + scene ref/time), `pano_urls jsonb` (`{spotId: url}`), `error text`, `created_at`, `updated_at`.

Storage: `tours` bucket, path `tours/{jobId}/{spotId}.png`. RLS: a user reads their own jobs; guest jobs keyed by an unguessable id.

## Error Handling

- Capture/render failure → `status: 'error'` + message; tour page shows it with a **Retry** (re-`POST`).
- Worker timeout / GPU unavailable (P2) → job stuck → a max-age sweep marks it `error`; page surfaces "render took too long."
- Empty room / no light zones → spots fall back to room-bounds center; never zero spots.
- Large glTF (P2) → cap export size; warn if exceeded.

## Testing

- `captureSpots` — unit tests: N zones → N spots at eye height; zero zones → 1 fallback spot.
- `exportScene` (P1 `serializeTourSpec`) — round-trips spots + scene ref; deterministic.
- API route — job row created with `queued`; `GET` returns status; bad input → 400.
- Cubemap→equirect util — golden-image/dimension test (output is 2:1, expected size).
- Worker (P2) — integration test on Modal with a fixture glTF → produces 4K 2:1 PNGs (manual/CI-gated, not in the Vercel build).
- Viewer — smoke test that nodes + hotspot links are constructed from `pano_urls`.

## Phasing / Milestones

- **Phase 1 (build first):** captureSpots → PanoCapture (CubeCamera→equirect) → render_jobs + API → in-browser upload → TourViewer + tour page. Shippable photoreal-ish tour, no infra.
- **Phase 2 (premium capture):** GLTFExporter export → Modal Blender-Cycles worker → swap capture backend (set `phase: 'cycles'`). Viewer/page untouched.

## Risks / Open Items

- **glTF → Blender material drift** (P2): glTF PBR ↔ Principled BSDF is close but not pixel-identical to the web look; HDRI intensity/tone-mapping needs matching. Mitigate with a calibration pass against a reference spot.
- **Cost/quota** (P2): Modal account + Supabase service-role key for the worker; per-tour cost ~cents but needs billing set up. Add a per-user rate limit.
- **Async UX:** renders are not instant; the tour page must make waiting pleasant (progress + est. time).
- **Secrets:** the worker needs a Supabase service-role key — stored in Modal secrets, never shipped to the client.

## Out of Scope (for now)

- Per-item info hotspots / shoppable tour.
- Video flythroughs.
- Real-time collaborative tours.
- Editing the scene from inside the tour (tour is a render of a frozen config).
