"""Blender Cycles worker: render day+night equirect panoramas of a scene .glb.

Pure helpers (output_name/public_url/parse_args) import without bpy for unit tests.
The render path imports bpy lazily and runs under:
    blender --background --python render_tour.py -- <args>
"""
import json
import os
import sys
import time
import urllib.request


def _timed(label: str, t0: float) -> float:
    """Print elapsed seconds for a phase (shows up in Modal logs) and return now."""
    now = time.perf_counter()
    print(f"[time] {label}: {now - t0:.1f}s", flush=True)
    return now

# production quality (GPU-rendered): 4K equirect, adaptive-sampled + denoised
PANO_W, PANO_H = 4096, 2048
SAMPLES = 96  # max; adaptive sampling stops early on converged pixels
VARIANTS = ("day", "night")
# glTF stores light intensity in candela; Blender imports that as a tiny wattage
# (a 13cd spot → ~0.24W), so interior lights barely register. Scale them up.
LIGHT_BOOST = 80.0
# World (HDRI) ambient strength per variant. Day is sunlit; night relies on a dim
# environment for fill so walls/ceiling between the downlights don't crush to black.
WORLD_STRENGTH = {"day": 1.0, "night": 0.35}


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
        elif key == "--variant": out["variant"] = val  # single-variant worker mode (else both)
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
    bg.inputs["Strength"].default_value = WORLD_STRENGTH[variant]

    # day gets a sun roughly matching the configurator's midday arc; night has none
    if variant == "day":
        sun_data = bpy.data.lights.new("Sun", "SUN")
        sun_data.energy = 3.0
        sun_obj = bpy.data.objects.new("Sun", sun_data)
        sun_obj.rotation_euler = (math.radians(50), 0.0, math.radians(30))
        scene.collection.objects.link(sun_obj)


def _enable_gpu(scene):
    """Best-effort: render on the GPU (OptiX→CUDA); silently fall back to CPU."""
    import bpy
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for dtype in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = dtype
            except TypeError:
                continue
            try:
                prefs.refresh_devices()
            except Exception:
                pass
            gpus = [d for d in prefs.devices if d.type != "CPU"]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type != "CPU"
                scene.cycles.device = "GPU"
                print(f"[render] GPU via {dtype}: {[d.name for d in gpus]}")
                return
    except Exception as e:  # noqa: BLE001
        print(f"[render] GPU enable failed ({e}); using CPU")
    scene.cycles.device = "CPU"
    print("[render] using CPU")


def _setup_render():
    import bpy
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    _enable_gpu(scene)
    scene.cycles.samples = SAMPLES
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02  # higher = stops sooner (faster, denoiser cleans up)
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


def _render_variant(cfg: dict, variant: str, tmpdir: str) -> dict:
    """Import the scene fresh, set up lights/world/camera for one variant, and
    render+upload every spot. Returns {spot_id: url}. No job-status patching —
    callers own status (so parallel workers don't race the row)."""
    import bpy
    import mathutils
    t0 = time.perf_counter()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene_glb = download(cfg["scene"], os.path.join(tmpdir, "scene.glb"))
    bpy.ops.import_scene.gltf(filepath=scene_glb)
    # Cycles provides ambient bounce via GI, so drop the realtime "fill" point
    # lights (they shadowed the ceiling into a crescent). Keep the spotlights as
    # downlights: boost out of the candela→watts hole and force them straight down.
    for obj in list(bpy.context.scene.objects):
        if obj.type != "LIGHT":
            continue
        if obj.data.type == "POINT":
            bpy.data.objects.remove(obj, do_unlink=True)
        elif obj.data.type in {"SPOT", "AREA"}:
            obj.data.energy *= LIGHT_BOOST
            if obj.data.type == "SPOT":
                loc = obj.matrix_world.to_translation()
                obj.matrix_world = mathutils.Matrix.Translation(loc)  # aim -Z down
    hdri = download(cfg["hdri"][variant], os.path.join(tmpdir, f"{variant}.exr"))
    _setup_world(hdri, variant)
    _setup_render()
    cam = _make_camera()
    t0 = _timed(f"{variant} import+setup", t0)
    urls = {}
    for spot in cfg["spots"]:
        x, y, z = spot["pos"]
        # three.js (x,y up,z) -> Blender (x, -z, y up)
        cam.location = (x, -z, y)
        out_path = os.path.join(tmpdir, output_name(spot["id"], variant))
        bpy.context.scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        t0 = _timed(f"{variant}/{spot['id']} render", t0)
        urls[spot["id"]] = upload_jpeg(cfg["supabase_url"], cfg["job"], spot["id"], variant, out_path)
        t0 = _timed(f"{variant}/{spot['id']} upload", t0)
    return urls


def render_all(cfg: dict, tmpdir: str = "/tmp") -> dict:
    """Full sequential render of all variants×spots WITH job-status patching.
    Used for local testing and as the single-container fallback."""
    patch_job(cfg["supabase_url"], cfg["job"], {"status": "rendering"})
    pano_urls = {variant: _render_variant(cfg, variant, tmpdir) for variant in VARIANTS}
    patch_job(cfg["supabase_url"], cfg["job"], {"status": "ready", "pano_urls": pano_urls})
    return pano_urls


def main():
    cfg = parse_args(sys.argv)
    # Worker mode: render just one variant, no status patching — the Modal
    # coordinator owns the job row and reports success/failure across the fan-out.
    if cfg.get("variant"):
        _render_variant(cfg, cfg["variant"], "/tmp")
        return
    try:
        render_all(cfg)
    except Exception as exc:  # noqa: BLE001 — report any failure back to the job
        patch_job(cfg["supabase_url"], cfg["job"], {"status": "error", "error": str(exc)[:500]})
        raise


if __name__ == "__main__":
    main()
