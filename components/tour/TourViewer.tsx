"use client";

import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import { spotLinks } from "@/lib/configurator/tourSpec";
import type { RenderJob } from "@/lib/configurator/tourJobs";

export default function TourViewer({ job }: { job: RenderJob }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const spots = job.spec.spots;
    const links = spotLinks(spots);
    const posById = new Map(spots.map((s) => [s.id, s.pos] as const));

    // hotspot arrow direction = horizontal bearing between the two spots
    const yawTo = (fromId: string, toId: string): number => {
      const a = posById.get(fromId)!;
      const b = posById.get(toId)!;
      return Math.atan2(b[0] - a[0], b[2] - a[2]);
    };

    const nodes = spots
      .filter((s) => job.pano_urls[s.id])
      .map((s) => ({
        id: s.id,
        panorama: job.pano_urls[s.id],
        name: s.label,
        links: links[s.id]
          .filter((id) => job.pano_urls[id])
          .map((id) => ({ nodeId: id, position: { yaw: yawTo(s.id, id), pitch: 0 } })),
      }));

    const viewer = new Viewer({
      container: ref.current,
      navbar: ["zoom", "fullscreen"],
      plugins: [
        [VirtualTourPlugin, { positionMode: "manual", renderMode: "markers", nodes, startNodeId: nodes[0]?.id }],
      ],
    });
    return () => viewer.destroy();
  }, [job]);

  return <div ref={ref} className="h-full w-full" />;
}
