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

# lightweight image for the web trigger — needs FastAPI (Modal no longer auto-installs it)
web_image = modal.Image.debian_slim().pip_install("fastapi[standard]")

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


@app.function(image=web_image, secrets=secrets)
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
