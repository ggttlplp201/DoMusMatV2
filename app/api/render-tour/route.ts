import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSpec } from "@/lib/configurator/tourJobs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !isValidSpec(body.spec)) {
    return NextResponse.json({ error: "invalid spec" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("render_jobs")
    .insert({ user_id: user.id, status: "rendering", phase: "browser", spec: body.spec })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
