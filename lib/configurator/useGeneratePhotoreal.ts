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

// Upload ceiling for the exported scene .glb. Must stay ≤ the Supabase Storage
// per-file upload limit (raise that in the dashboard if you raise this).
const MAX_GLB_BYTES = 250_000_000;

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
      const glbMB = glb.byteLength / 1e6;
      console.log(`[photoreal] exported .glb = ${glbMB.toFixed(1)} MB`);
      if (glb.byteLength > MAX_GLB_BYTES) {
        throw new Error(`Scene .glb is ${glbMB.toFixed(0)}MB (limit ${MAX_GLB_BYTES / 1e6}MB).`);
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
