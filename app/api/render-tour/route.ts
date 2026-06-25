import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSpec } from "@/lib/configurator/tourJobs";
import { photorealEnabled, hdriUrls, requestOrigin } from "@/lib/configurator/photoreal";

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
    // one in-flight cloud render per user — but ignore stale jobs (>20 min old)
    // so a render whose worker never finished can't block forever
    const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("render_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("phase", "cycles")
      .in("status", ["queued", "rendering"])
      .gt("created_at", staleCutoff);
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
    const origin = requestOrigin(req);
    // fire-and-forget; the worker drives the job to ready/error
    fetch(process.env.MODAL_RENDER_URL!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: data.id, sceneUrl: body.sceneUrl, spots: body.spec.spots, hdriUrls: hdriUrls(origin), secret: process.env.MODAL_TRIGGER_SECRET ?? "" }),
    }).catch(() => {});
  }

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
