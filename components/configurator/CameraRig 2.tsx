"use client";

/**
 * CameraRig — click-to-walk + drag-to-look, ported verbatim from the
 * validated prototype (app/configurator-prototype/page.tsx `useWalkLook`).
 *
 * Tuned constants (DO NOT change without user sign-off):
 *   yaw   += dx * 0.003   (grab-the-world sense, NOT inverted)
 *   pitch += dy * 0.003   (grab-the-world sense, NOT inverted)
 *   lerp factor: 0.18
 *   eye height:  1.6 m
 *   drag threshold: > 6 px
 */

import { useEffect, useRef, createContext, useContext, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clampToBounds } from "@/lib/configurator/geometry";
import type { RoomShell } from "@/lib/configurator/types";

// ---- shared context so Scene can call walkTo / wasDrag --------------------
interface CameraRigAPI {
  walkTo: (p: THREE.Vector3) => void;
  wasDrag: () => boolean;
}
const CameraRigCtx = createContext<CameraRigAPI | null>(null);

export function useCameraRig(): CameraRigAPI {
  const ctx = useContext(CameraRigCtx);
  if (!ctx) throw new Error("useCameraRig must be used inside <CameraRig>");
  return ctx;
}

// ---- hook (inner, runs inside Canvas) ------------------------------------
function useWalkLook(
  lockedRef: React.RefObject<boolean>,
  bounds: RoomShell["bounds"],
  eyeHeight: number,
  apiRef: React.MutableRefObject<CameraRigAPI | null>,
) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const target = useRef(new THREE.Vector3(0, eyeHeight, 1.0));
  const dragging = useRef(false);
  const movedPx = useRef(0);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    camera.position.set(0, eyeHeight, 1.0);
    const el = gl.domElement;

    const down = (e: PointerEvent) => {
      dragging.current = true;
      movedPx.current = 0;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current || lockedRef.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      movedPx.current += Math.abs(dx) + Math.abs(dy);
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current += dx * 0.003;   // grab-the-world: drag right → world turns right
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current + dy * 0.003)); // drag down → looks down
    };
    const up = () => { dragging.current = false; };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [camera, gl, lockedRef, eyeHeight]);

  useFrame(() => {
    camera.position.lerp(target.current, 0.18);
    camera.position.y = eyeHeight;
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
  });

  const walkTo = (p: THREE.Vector3) => {
    const [cx, cz] = clampToBounds(p.x, p.z, bounds);
    target.current.set(cx, eyeHeight, cz);
  };
  const wasDrag = () => movedPx.current > 6;

  // publish API to ref so CameraRig provider can expose it via context
  apiRef.current = { walkTo, wasDrag };
}

// ---- inner component (must be a child of Canvas) -------------------------
function CameraRigInner({
  lockedRef,
  bounds,
  eyeHeight,
  apiRef,
}: {
  lockedRef: React.RefObject<boolean>;
  bounds: RoomShell["bounds"];
  eyeHeight: number;
  apiRef: React.MutableRefObject<CameraRigAPI | null>;
}) {
  useWalkLook(lockedRef, bounds, eyeHeight, apiRef);
  return null;
}

// ---- public component ----------------------------------------------------
export default function CameraRig({
  lockedRef,
  bounds,
  eyeHeight,
  children,
}: {
  lockedRef: React.RefObject<boolean>;
  bounds: RoomShell["bounds"];
  eyeHeight: number;
  children?: React.ReactNode;
}) {
  const apiRef = useRef<CameraRigAPI | null>(null);

  // stable context value — forwards to whatever apiRef.current holds
  const stableApi = useMemo<CameraRigAPI>(() => ({
    walkTo: (p) => apiRef.current?.walkTo(p),
    wasDrag: () => apiRef.current?.wasDrag() ?? false,
  }), []);

  return (
    <CameraRigCtx.Provider value={stableApi}>
      <CameraRigInner lockedRef={lockedRef} bounds={bounds} eyeHeight={eyeHeight} apiRef={apiRef} />
      {children}
    </CameraRigCtx.Provider>
  );
}
