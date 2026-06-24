"use client";

/**
 * LightFixtures — interior lighting:
 *  - a hanging light bar (model + emissive underside + soft RectAreaLight)
 *  - recessed round ceiling lights (model laid flat + emissive lens + downward
 *    SpotLight); quantity is user-controlled; shadows only on a few for perf.
 *
 * Illumination comes from the actual lights; emissive materials are glow only.
 */

import { useEffect, useRef } from "react";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import * as THREE from "three";
import type { RoomShell } from "@/lib/configurator/types";
import { useConfigurator } from "@/state/configurator";
import FittedModel from "./FittedModel";

RectAreaLightUniformsLib.init(); // required for RectAreaLight to render correctly

const WARM = "#ffd6a8"; // ~3200K warm white

// ---- hanging light bar ----------------------------------------------------
function HangingBar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* bar model, laid horizontal (native long axis → X), scaled to a sensible size */}
      <group rotation={[0, 0, Math.PI / 2]}>
        <FittedModel url="/models/hanging_light_bar.glb" realDimsMm={{ w: 1, h: 1, d: 1 }} fitMaxSize={1.5} ground={false} castShadow={false} />
      </group>
      {/* soft, spread downward light (the model already glows; this does the lighting) */}
      <rectAreaLight position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} width={1.4} height={0.3} intensity={3.5} color={WARM} />
    </group>
  );
}

// ---- recessed round ceiling light -----------------------------------------
function CeilingLight({ position, shadow }: { position: [number, number, number]; shadow: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, []);
  return (
    <group position={position}>
      {/* fixture model, laid flat & recessed into the ceiling (disk X-Y → horizontal) */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <FittedModel url="/models/ceiling_light_round.glb" realDimsMm={{ w: 1, h: 1, d: 1 }} fitMaxSize={0.3} ground={false} castShadow={false} />
      </group>
      {/* emissive lens (glow only) */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.085, 24]} />
        <meshStandardMaterial color="#ffffff" emissive={WARM} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      {/* downward spotlight, soft cone */}
      <spotLight
        ref={light}
        position={[0, -0.04, 0]}
        angle={0.7}
        penumbra={0.6}
        intensity={6}
        distance={9}
        decay={1.3}
        color={WARM}
        castShadow={shadow}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <object3D ref={target} position={[0, -3, 0]} />
    </group>
  );
}

export default function LightFixtures({ room }: { room: RoomShell }) {
  const count = useConfigurator((s) => s.ceilingLightCount);
  const lights = room.ceilingLightAnchors.slice(0, count);
  return (
    <>
      <HangingBar position={[-0.15, 2.35, 1.83]} />
      {lights.map((p, i) => (
        <CeilingLight key={i} position={p} shadow={i < 2} /> // shadows only on the first 2 (perf)
      ))}
    </>
  );
}
