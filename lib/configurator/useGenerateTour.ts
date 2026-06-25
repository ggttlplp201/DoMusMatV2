"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeCaptureSpots } from "./captureSpots";
import { runCapture } from "./captureBridge";
import { createTourJob, uploadPano, finalizeTourJob, failTourJob, type PanoUrls } from "./tourJobs";
import { VARIANT_TIMES, type TourVariant } from "./tourSpec";
import { encodeScene } from "./serialize";
import { createClient } from "@/lib/supabase/client";
import { useConfigurator } from "@/state/configurator";
import type { RoomShell } from "./types";

export const PANO_WIDTH = 6144;
const VARIANTS: TourVariant[] = ["day", "night"];
const ENV_SETTLE_MS = 2500; // let the HDRI/sun swap load + settle before capturing

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Phase = "idle" | "capturing" | "uploading" | "error";

export function useGenerateTour(room: RoomShell) {
  const router = useRouter();
  const scene = useConfigurator((s) => s.scene);
  const time = useConfigurator((s) => s.timeOfDay);
  const setTimeOfDay = useConfigurator((s) => s.setTimeOfDay);
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
    const originalTime = time;
    try {
      const spots = computeCaptureSpots(room);
      setPhase("capturing");
      jobId = await createTourJob({ sceneRef: encodeScene(scene), time: originalTime, spots });

      const urls: PanoUrls = { day: {}, night: {} };
      for (const variant of VARIANTS) {
        // drive the scene to the variant's time of day, wait for the HDRI to swap in
        setTimeOfDay(VARIANT_TIMES[variant]);
        await wait(ENV_SETTLE_MS);
        const blobs = await runCapture(spots, PANO_WIDTH);
        for (const s of spots) urls[variant][s.id] = await uploadPano(jobId, s.id, variant, blobs[s.id]);
      }

      setPhase("uploading");
      await finalizeTourJob(jobId, urls);

      setTimeOfDay(originalTime);
      setPhase("idle");
      router.push(`/tour/${jobId}`);
    } catch (e) {
      setTimeOfDay(originalTime);
      const msg = e instanceof Error ? e.message : "render failed";
      setError(msg);
      setPhase("error");
      if (jobId) await failTourJob(jobId, msg).catch(() => {});
    }
  }

  return { generate, phase, error };
}
