"use client";

import { use, useEffect, useState } from "react";
import { getTourJob, type RenderJob } from "@/lib/configurator/tourJobs";
import TourViewer from "@/components/tour/TourViewer";

export default function TourPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await getTourJob(jobId);
        if (!alive) return;
        if (j.status === "ready") return setJob(j);
        if (j.status === "error") return setErr(j.error ?? "render failed");
        timer = setTimeout(poll, 1500); // still queued/rendering
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "failed to load tour");
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [jobId]);

  if (err) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-900 text-white">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-300">{err}</p>
          <a href="/configurator" className="text-xs underline opacity-70">Back to configurator</a>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          <span className="text-xs tracking-wide text-white/80">Preparing your walkthrough…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <TourViewer job={job} />
    </div>
  );
}
