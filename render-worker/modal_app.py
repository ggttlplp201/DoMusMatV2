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
def trigger(payload: dict):
    import os
    from fastapi import HTTPException
    # the whole JSON body arrives as `payload`; the shared secret travels inside it
    if payload.get("secret") != os.environ["MODAL_TRIGGER_SECRET"]:
        raise HTTPException(status_code=403, detail="forbidden")
    render.spawn(payload["jobId"], payload["sceneUrl"], payload["spots"], payload["hdriUrls"])
    return {"accepted": True}
