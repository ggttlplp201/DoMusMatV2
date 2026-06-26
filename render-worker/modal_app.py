# render-worker/modal_app.py
"""Modal deployment for the Blender render worker.

Deploy:  modal deploy modal_app.py
The `trigger` web endpoint URL it prints becomes MODAL_RENDER_URL on Vercel.
"""
import modal

app = modal.App("domusmat-tour-render")

# official Blender build — the Debian apt package's bundled glTF addon fails to load,
# and we want a Cycles-GPU-capable binary. Extracted to /opt/blender/blender.
BLENDER_URL = "https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz"

# build the full image (incl. the render script) BEFORE any function uses it
image = (
    modal.Image.debian_slim()
    .apt_install(
        "wget", "xz-utils",
        "libx11-6", "libxxf86vm1", "libxfixes3", "libxrender1", "libxi6",
        "libxkbcommon0", "libgl1", "libsm6", "libice6", "libxext6",
    )
    .run_commands(
        f"wget -q {BLENDER_URL} -O /tmp/blender.tar.xz",
        "mkdir -p /opt/blender && tar -xf /tmp/blender.tar.xz -C /opt/blender --strip-components=1",
        "rm /tmp/blender.tar.xz",
    )
    .add_local_file("render_tour.py", "/root/render_tour.py", copy=True)
)

# lightweight image for the web trigger — needs FastAPI (Modal no longer auto-installs it)
web_image = modal.Image.debian_slim().pip_install("fastapi[standard]")

# the CPU coordinator only needs render_tour.py's stdlib-only helpers (no Blender) —
# keep it off the multi-GB render image so its cold start stays fast
coordinator_image = modal.Image.debian_slim().add_local_file(
    "render_tour.py", "/root/render_tour.py", copy=True
)

secrets = [modal.Secret.from_name("domusmat-render")]  # SUPABASE_URL, SUPABASE_SERVICE_KEY, MODAL_TRIGGER_SECRET


@app.function(image=image, gpu="A10G", secrets=secrets, timeout=1800)
def render_one(job_id: str, scene_url: str, variant: str, spot: dict, hdri_url: str):
    """Render+upload a single (variant, spot) pano in its own GPU container.
    No status patching — the coordinator owns the job row."""
    import os, json, subprocess
    subprocess.run(
        [
            "/opt/blender/blender", "--background", "--python", "/root/render_tour.py", "--",
            "--job", job_id, "--scene", scene_url,
            "--variant", variant,
            "--spots", json.dumps([spot]),
            f"--hdri-{variant}", hdri_url,
            "--supabase-url", os.environ["SUPABASE_URL"],
        ],
        check=True,
    )


@app.function(image=coordinator_image, secrets=secrets, timeout=1800)
def orchestrate(job_id: str, scene_url: str, spots: list, hdri_urls: dict):
    """CPU coordinator: own the job row, fan each (variant, spot) out to its own
    GPU container, then mark ready/error. Wall-clock ≈ one render, not all of them."""
    import os, sys
    sys.path.insert(0, "/root")  # render_tour.py is added to the image at /root
    import render_tour as rt
    supabase_url = os.environ["SUPABASE_URL"]
    rt.patch_job(supabase_url, job_id, {"status": "rendering"})
    try:
        work = [
            (job_id, scene_url, variant, spot, hdri_urls[variant])
            for variant in rt.VARIANTS
            for spot in spots
        ]
        list(render_one.starmap(work))  # blocks until all panos done; raises on any failure
        pano_urls = {
            variant: {s["id"]: rt.public_url(supabase_url, job_id, s["id"], variant) for s in spots}
            for variant in rt.VARIANTS
        }
        rt.patch_job(supabase_url, job_id, {"status": "ready", "pano_urls": pano_urls})
    except Exception as exc:  # noqa: BLE001 — report any failure back to the job
        rt.patch_job(supabase_url, job_id, {"status": "error", "error": str(exc)[:500]})
        raise


@app.function(image=web_image, secrets=secrets)
@modal.fastapi_endpoint(method="POST")
def trigger(payload: dict):
    import os
    from fastapi import HTTPException
    # the whole JSON body arrives as `payload`; the shared secret travels inside it
    if payload.get("secret") != os.environ["MODAL_TRIGGER_SECRET"]:
        raise HTTPException(status_code=403, detail="forbidden")
    orchestrate.spawn(payload["jobId"], payload["sceneUrl"], payload["spots"], payload["hdriUrls"])
    return {"accepted": True}
