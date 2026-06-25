"use client";

/**
 * Minimap — a top-down floor-plan of the room with a live marker for where the
 * player is standing (and which way they're facing). Walls are projected to the
 * X/Z plane once (memoised); the marker is driven by its own requestAnimationFrame
 * loop reading the non-reactive `cameraMini` singleton, so it never re-renders React.
 */

import { useEffect, useMemo, useRef } from "react";
import type { RoomShell } from "@/lib/configurator/types";
import { cameraMini } from "@/lib/configurator/cameraTrack";

const W = 168;          // panel drawing width (px)
const PAD = 8;          // inner padding (px)

export default function Minimap({ room }: { room: RoomShell }) {
  const markerRef = useRef<SVGGElement>(null);

  // project walls to plan-view segments + derive the drawing extent (once)
  const plan = useMemo(() => {
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of room.surfaces) {
      if (s.kind !== "wall") continue;
      const [px, , pz] = s.pos;
      const rotY = s.rot[1];
      const L = s.size[0] / 2;
      const dx = Math.cos(rotY) * L, dz = -Math.sin(rotY) * L;
      const a = { x: px + dx, z: pz + dz }, b = { x: px - dx, z: pz - dz };
      segs.push({ x1: a.x, y1: a.z, x2: b.x, y2: b.z });
      for (const p of [a, b]) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      }
    }
    const spanX = Math.max(0.01, maxX - minX), spanZ = Math.max(0.01, maxZ - minZ);
    const innerW = W - PAD * 2;
    const innerH = innerW * (spanZ / spanX);
    const toSvg = (x: number, z: number): [number, number] => [
      PAD + ((x - minX) / spanX) * innerW,
      PAD + ((z - minZ) / spanZ) * innerH,
    ];
    return { segs, minX, minZ, spanX, spanZ, innerW, innerH, height: innerH + PAD * 2, toSvg };
  }, [room]);

  // animate the player marker from the camera singleton
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = markerRef.current;
      if (g) {
        const sx = PAD + ((cameraMini.x - plan.minX) / plan.spanX) * plan.innerW;
        const sy = PAD + ((cameraMini.z - plan.minZ) / plan.spanZ) * plan.innerH;
        const deg = (Math.atan2(cameraMini.dz, cameraMini.dx) * 180) / Math.PI;
        g.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${deg.toFixed(1)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plan]);

  return (
    <div className="absolute top-3 right-3 z-20 rounded-lg bg-black/55 backdrop-blur p-2">
      <div className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">Floor plan</div>
      <svg width={W} height={plan.height} className="block">
        {plan.segs.map((s, i) => {
          const [x1, y1] = plan.toSvg(s.x1, s.y1);
          const [x2, y2] = plan.toSvg(s.x2, s.y2);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} strokeLinecap="round" />
          );
        })}
        {/* player position + facing (apex points the way they look) */}
        <g ref={markerRef}>
          <circle r={3.4} fill="#34d399" stroke="white" strokeWidth={1} />
          <polygon points="9,0 3,-3.2 3,3.2" fill="#34d399" opacity={0.9} />
        </g>
      </svg>
    </div>
  );
}
