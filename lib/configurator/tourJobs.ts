import { createClient } from "@/lib/supabase/client";
import { panoPath, type TourSpec, type TourVariant } from "./tourSpec";

/** spotId → public URL, for each day/night variant. */
export type PanoUrls = Record<TourVariant, Record<string, string>>;

export interface RenderJob {
  id: string;
  status: "queued" | "rendering" | "ready" | "error";
  phase: "browser" | "cycles";
  pano_urls: PanoUrls;
  error: string | null;
  spec: TourSpec;
}

/** Pure input guard shared with the API route. */
export function isValidSpec(v: unknown): v is TourSpec {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.sceneRef === "string" &&
    typeof o.time === "number" &&
    Array.isArray(o.spots) &&
    o.spots.length > 0
  );
}

export async function createTourJob(
  spec: TourSpec,
  opts: { phase?: "browser" | "cycles"; sceneUrl?: string } = {},
): Promise<string> {
  const res = await fetch("/api/render-tour", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spec, phase: opts.phase ?? "browser", sceneUrl: opts.sceneUrl }),
  });
  if (res.status === 503) throw new Error("photoreal-unconfigured");
  if (res.status === 409) throw new Error("photoreal-inflight");
  if (!res.ok) throw new Error(`createTourJob failed: ${res.status}`);
  const { jobId } = (await res.json()) as { jobId: string };
  return jobId;
}

export async function uploadPano(jobId: string, spotId: string, variant: TourVariant, blob: Blob): Promise<string> {
  const supabase = createClient();
  const path = panoPath(jobId, spotId, variant);
  const { error } = await supabase.storage
    .from("tours")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`uploadPano failed: ${error.message}`);
  return supabase.storage.from("tours").getPublicUrl(path).data.publicUrl;
}

export async function uploadSceneGlb(buf: ArrayBuffer): Promise<string> {
  const supabase = createClient();
  const path = `scenes/${crypto.randomUUID()}.glb`;
  const { error } = await supabase.storage
    .from("tours")
    .upload(path, new Blob([buf], { type: "model/gltf-binary" }), {
      contentType: "model/gltf-binary",
      upsert: true,
    });
  if (error) throw new Error(`uploadSceneGlb failed: ${error.message}`);
  return supabase.storage.from("tours").getPublicUrl(path).data.publicUrl;
}

export async function finalizeTourJob(jobId: string, panoUrls: PanoUrls): Promise<void> {
  const res = await fetch("/api/render-tour", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId, status: "ready", pano_urls: panoUrls }),
  });
  if (!res.ok) throw new Error(`finalizeTourJob failed: ${res.status}`);
}

export async function failTourJob(jobId: string, message: string): Promise<void> {
  await fetch("/api/render-tour", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId, status: "error", error: message }),
  });
}

export async function getTourJob(jobId: string): Promise<RenderJob> {
  // no-store + cache-bust: this is polled until the worker flips status to ready,
  // so a cached response would keep returning the stale "queued" state forever
  const res = await fetch(`/api/render-tour?jobId=${encodeURIComponent(jobId)}&t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`getTourJob failed: ${res.status}`);
  return (await res.json()) as RenderJob;
}
