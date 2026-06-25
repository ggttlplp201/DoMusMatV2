"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeCaptureSpots } from "./captureSpots";
import { runExport } from "./exportBridge";
import { createTourJob, uploadSceneGlb } from "./tourJobs";
import { encodeScene } from "./serialize";
import { createClient } from "@/lib/supabase/client";
import { useConfigurator } from "@/state/configurator";
import type { RoomShell } from "./types";

type Phase = "idle" | "exporting" | "uploading" | "error";

export function useGeneratePhotoreal(room: RoomShell) {
  const router = useRouter();
  const scene = useConfigurator((s) => s.scene);
  const time = useConfigurator((s) => s.timeOfDay);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login?next=/configurator"); return; }

    try {
      const spots = computeCaptureSpots(room);
      setPhase("exporting");
      setNote("Exporting your scene…");
      const glb = await runExport();
      if (glb.byteLength > 60_000_000) {
        throw new Error("Your scene is too large to render in the cloud (over 60MB). Try a simpler room.");
      }

      setPhase("uploading");
      setNote("Uploading to the renderer…");
      const sceneUrl = await uploadSceneGlb(glb);

      const jobId = await createTourJob({ sceneRef: encodeScene(scene), time, spots }, { phase: "cycles", sceneUrl });
      setPhase("idle");
      router.push(`/tour/${jobId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "render failed";
      setError(
        msg === "photoreal-unconfigured" ? "Photoreal rendering isn't enabled yet."
        : msg === "photoreal-inflight" ? "A photoreal render is already in progress."
        : msg,
      );
      setPhase("error");
    }
  }

  return { generate, phase, note, error };
}
