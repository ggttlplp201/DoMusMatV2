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

## Architecture
The web `trigger` endpoint spawns a lightweight CPU `orchestrate` function, which owns
the `render_jobs` row (rendering → ready/error) and fans each `(variant, spot)` out to its
own GPU `render_one` container via `.starmap()`. Each worker runs Blender for a single
equirect pano (`render_tour.py --variant …`) and uploads it. Wall-clock ≈ one render
regardless of room count; total GPU-seconds (and cost) are unchanged.

`render_tour.py` with no `--variant` still does the full sequential render with status
patching — used for local Blender testing and as a single-container fallback.

## Cost
A10G GPU, total ~GPU-seconds for a few rooms × 2 variants → on the order of a few US cents
per tour. With the fan-out the renders run concurrently, so the *wait* is ~one pano, not all
of them — same compute, just in parallel.
