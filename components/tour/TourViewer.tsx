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
  const [current, setCurrent] = useState<string | null>(null);

  // build the virtual-tour nodes for a given day/night variant
  function buildNodes(v: TourVariant) {
    const spots = job.spec.spots;
    const links = spotLinks(spots);
    const urls = job.pano_urls[v] ?? {};
    const posById = new Map(spots.map((s) => [s.id, s.pos] as const));
    // Browser cubemap panos and Blender equirect panos have opposite azimuth
    // handedness, so cycles arrows need the bearing's x-axis mirrored (negate angle).
    const mirror = job.phase === "cycles";
    const yawTo = (fromId: string, toId: string) => {
      const a = posById.get(fromId)!;
      const b = posById.get(toId)!;
      const dx = mirror ? a[0] - b[0] : b[0] - a[0];
      return Math.atan2(dx, b[2] - a[2]);
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

  // create the viewer once per job (always starts on the "day" variant)
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
    const vt = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
    vtRef.current = vt;
    setCurrent(nodes[0]?.id ?? null);
    const onNode = (e: { node?: { id?: string } }) => setCurrent(e.node?.id ?? null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vt as any).addEventListener("node-changed", onNode);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (vt as any).removeEventListener("node-changed", onNode);
      vtRef.current = null;
      viewer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  // swap panos imperatively on toggle — keep the current room, no effect/ref race
  function switchVariant(v: TourVariant) {
    if (v === variant) return;
    setVariant(v);
    const vt = vtRef.current;
    if (!vt) return;
    const current = vt.getCurrentNode()?.id;
    vt.setNodes(buildNodes(v), current);
  }

  const tab = (v: TourVariant) =>
    `px-3 py-1 text-xs font-medium transition ${
      variant === v ? "bg-white text-black" : "bg-black/40 text-white hover:bg-black/60"
    }`;

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      <div className="absolute top-3 right-3 z-10 flex overflow-hidden rounded-full ring-1 ring-white/30">
        <button className={tab("day")} onClick={() => switchVariant("day")}>Day</button>
        <button className={tab("night")} onClick={() => switchVariant("night")}>Night</button>
      </div>
      {/* reliable room jump menu — navigation independent of arrow placement */}
      <div className="absolute bottom-4 left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 flex-wrap justify-center gap-1.5 rounded-full bg-black/55 px-2 py-1.5 backdrop-blur">
        {job.spec.spots
          .filter((s) => job.pano_urls[variant]?.[s.id])
          .map((s) => (
            <button
              key={s.id}
              onClick={() => vtRef.current?.setCurrentNode(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                current === s.id ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/25"
              }`}
            >
              {s.label}
            </button>
          ))}
      </div>
    </div>
  );
}
