"use client";

/**
 * LightFixtures — per-room recessed round ceiling lights. Each light zone
 * independently chooses how many lights (or none); they auto-space across the
 * zone. The fixture model is laid flat just below the ceiling (autoFlat) and a
 * downward SpotLight does the actual illumination. The emissive lens is glow only.
 *
 * Helper cones (cyan) reveal each light's direction — toggled from the HUD.
 */

import { useEffect, useRef } from "react";
import { useHelper } from "@react-three/drei";
import * as THREE from "three";
import type { LightZone, RoomShell } from "@/lib/configurator/types";
import { useConfigurator } from "@/state/configurator";
import FittedModel from "./FittedModel";

const WARM = "#ffd6a8"; // ~3200K warm white

function CeilingLight({ position, helpers }: { position: [number, number, number]; helpers: boolean }) {
  const spotRef = useRef<THREE.SpotLight>(null!);
  const targetRef = useRef<THREE.Object3D>(null!);
  useHelper(helpers ? spotRef : null, THREE.SpotLightHelper, "cyan");
  useEffect(() => {
    const s = spotRef.current, t = targetRef.current;
    if (!s || !t) return;
    s.target = t;
    t.updateMatrixWorld();
  }, []);
  return (
    <group position={position}>
      {/* recessed fixture model, laid flat (autoFlat), sitting just below the ceiling */}
      <group position={[0, -0.02, 0]}>
        <FittedModel url="/models/ceiling_light_round.glb" realDimsMm={{ w: 1, h: 1, d: 1 }} fitMaxSize={0.3} ground={false} autoFlat castShadow={false} />
      </group>
      {/* emissive lens (glow only), facing down */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.085, 24]} />
        <meshStandardMaterial color="#ffffff" emissive={WARM} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <spotLight ref={spotRef} position={[0, -0.06, 0]} angle={0.7} penumbra={0.6} intensity={6} distance={9} decay={1.3} color={WARM} castShadow={false} />
      <object3D ref={targetRef} position={[0, -2, 0]} />
    </group>
  );
}

// evenly spread `count` positions across a zone
function gridPositions(z: LightZone, count: number): [number, number, number][] {
  const cols = Math.min(count, 3), rows = Math.ceil(count / cols);
  const out: [number, number, number][] = [];
  let n = 0;
  for (let r = 0; r < rows && n < count; r++) {
    for (let c = 0; c < cols && n < count; c++, n++) {
      const fx = cols === 1 ? 0.5 : (c + 0.5) / cols;
      const fz = rows === 1 ? 0.5 : (r + 0.5) / rows;
      out.push([THREE.MathUtils.lerp(z.x0, z.x1, fx), z.ceilingY, THREE.MathUtils.lerp(z.z0, z.z1, fz)]);
    }
  }
  return out;
}

export default function LightFixtures({ room }: { room: RoomShell }) {
  const roomLights = useConfigurator((s) => s.roomLights);
  const helpers = useConfigurator((s) => s.showLightHelpers);
  return (
    <>
      {room.lightZones.map((z) => {
        const cfg = roomLights[z.id];
        if (!cfg || cfg.type !== "ceiling" || cfg.count <= 0) return null;
        return gridPositions(z, cfg.count).map((p, i) => (
          <CeilingLight key={`${z.id}-${i}`} position={p} helpers={helpers} />
        ));
      })}
    </>
  );
}
