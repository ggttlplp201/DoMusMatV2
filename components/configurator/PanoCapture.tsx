"use client";

/**
 * PanoCapture — lives inside the Canvas. Registers a capture handler that, for
 * each spot, renders an equirectangular pano of the live scene. It hides the
 * walk camera's own helpers by toggling the store `capturing` flag, and yields a
 * frame between spots so the scene settles. Renders nothing visible.
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registerCaptureHandler } from "@/lib/configurator/captureBridge";
import { renderEquirect } from "@/lib/configurator/equirect";
import type { CaptureSpot } from "@/lib/configurator/captureSpots";
import { useConfigurator } from "@/state/configurator";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export default function PanoCapture() {
  const { gl, scene } = useThree();
  const setCapturing = useConfigurator((s) => s.setCapturing);

  useEffect(() => {
    registerCaptureHandler(async (spots: CaptureSpot[], width: number) => {
      setCapturing(true);
      await nextFrame(); // let gizmo-hiding apply before the first capture
      try {
        const out: Record<string, Blob> = {};
        for (const spot of spots) {
          const pos = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]);
          out[spot.id] = await renderEquirect(gl, scene, pos, width);
          await nextFrame();
        }
        return out;
      } finally {
        setCapturing(false);
      }
    });
    return () => registerCaptureHandler(null);
  }, [gl, scene, setCapturing]);

  return null;
}
