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
    assert "variant" not in cfg  # full-render mode when --variant is absent


def test_parse_args_single_variant_worker_mode():
    argv = ["blender", "--python", "render_tour.py", "--",
            "--job", "j2", "--scene", "s.glb",
            "--variant", "night",
            "--spots", '[{"id":"living","pos":[1,1.6,2]}]',
            "--hdri-night", "n.exr",
            "--supabase-url", "https://x.supabase.co"]
    cfg = parse_args(argv)
    assert cfg["variant"] == "night"
    assert cfg["hdri"] == {"night": "n.exr"}  # only the variant's hdri is passed
