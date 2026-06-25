"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import { spotLinks, type TourVariant } from "@/lib/configurator/tourSpec";
import type { RenderJob } from "@/lib/configurator/tourJobs";

export default function TourViewer({ job }: { job: RenderJob }) {
  const ref = useRef<HTMLDivElement>(null);
  const vtRef = useRef<VirtualTourPlugin | null>(null);
  const [variant, setVariant] = useState<TourVariant>("day");

  // build the virtual-tour nodes for a given day/night variant
  function buildNodes(v: TourVariant) {
    const spots = job.spec.spots;
    const links = spotLinks(spots);
    const urls = job.pano_urls[v] ?? {};
    const posById = new Map(spots.map((s) => [s.id, s.pos] as const));
    const yawTo = (fromId: string, toId: string) => {
      const a = posById.get(fromId)!;
      const b = posById.get(toId)!;
      return Math.atan2(b[0] - a[0], b[2] - a[2]);
    };
    return spots
      .filter((s) => urls[s.id])
      .map((s) => ({
        id: s.id,
        panorama: urls[s.id],
        name: s.label,
        links: links[s.id]
          .filter((id) => urls[id])
          .map((id) => ({ nodeId: id, position: { yaw: yawTo(s.id, id), pitch: 0 } })),
      }));
  }

  // create the viewer once per job
  useEffect(() => {
    if (!ref.current) return;
    const nodes = buildNodes("day");
    const viewer = new Viewer({
      container: ref.current,
      navbar: ["zoom", "fullscreen"],
      plugins: [
        [VirtualTourPlugin, { positionMode: "manual", renderMode: "2d", nodes, startNodeId: nodes[0]?.id }],
      ],
    });
    vtRef.current = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
    return () => {
      vtRef.current = null;
      viewer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  // swap panos in place when the day/night toggle flips (keep current room)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const vt = vtRef.current;
    if (!vt) return;
    const current = vt.getCurrentNode()?.id;
    vt.setNodes(buildNodes(variant), current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const tab = (v: TourVariant) =>
    `px-3 py-1 text-xs font-medium transition ${
      variant === v ? "bg-white text-black" : "bg-black/40 text-white hover:bg-black/60"
    }`;

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      <div className="absolute top-3 right-3 z-10 flex overflow-hidden rounded-full ring-1 ring-white/30">
        <button className={tab("day")} onClick={() => setVariant("day")}>Day</button>
        <button className={tab("night")} onClick={() => setVariant("night")}>Night</button>
      </div>
    </div>
  );
}
