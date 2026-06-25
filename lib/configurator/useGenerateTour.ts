"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeCaptureSpots } from "./captureSpots";
import { runCapture } from "./captureBridge";
import { createTourJob, uploadPano, finalizeTourJob, failTourJob } from "./tourJobs";
import { encodeScene } from "./serialize";
import { createClient } from "@/lib/supabase/client";
import { useConfigurator } from "@/state/configurator";
import type { RoomShell } from "./types";

export const PANO_WIDTH = 4096;

type Phase = "idle" | "capturing" | "uploading" | "error";

export function useGenerateTour(room: RoomShell) {
  const router = useRouter();
  const scene = useConfigurator((s) => s.scene);
  const time = useConfigurator((s) => s.timeOfDay);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    // require login (RLS + account-tied tours)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/configurator");
      return;
    }

    let jobId: string | null = null;
    try {
      const spots = computeCaptureSpots(room);
      setPhase("capturing");
      const blobs = await runCapture(spots, PANO_WIDTH);

      setPhase("uploading");
      jobId = await createTourJob({ sceneRef: encodeScene(scene), time, spots });
      const urls: Record<string, string> = {};
      for (const s of spots) urls[s.id] = await uploadPano(jobId, s.id, blobs[s.id]);
      await finalizeTourJob(jobId, urls);

      setPhase("idle");
      router.push(`/tour/${jobId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "render failed";
      setError(msg);
      setPhase("error");
      if (jobId) await failTourJob(jobId, msg).catch(() => {});
    }
  }

  return { generate, phase, error };
}
