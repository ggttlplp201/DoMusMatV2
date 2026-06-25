"use client";

/**
 * LightFixtures — per-room recessed round ceiling lights. Each light zone
 * independently chooses how many lights (or none); they auto-space across the
 * zone. The fixture model is laid flat just below the ceiling (autoFlat); a
 * downward SpotLight does the real illumination, the lens is a soft glow, and a
 * subtle additive cone fakes the visible "shine" of light in the air.
 *
 * Helper cones (cyan) reveal each light's direction — toggled from the HUD.
 */

import { useEffect, useMemo, useRef } from "react";
import { useHelper } from "@react-three/drei";
import * as THREE from "three";
import type { LightZone, RoomShell } from "@/lib/configurator/types";
import { useConfigurator } from "@/state/configurator";
import FittedModel from "./FittedModel";

const WARM = "#ffd9b0"; // ~3200K warm white

// ---- fake volumetric beam (additive cone, fades toward the floor) ----------
const BEAM_H = 2.8;     // m — length of the visible cone (ceiling → ~floor)
const BEAM_R = 0.5;     // m — radius where the cone meets the floor
const BEAM_VERT = /* glsl */ `
  varying float vY;
  void main() {
    vY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHalf;
  varying float vY;
  void main() {
    float t = clamp((vY + uHalf) / (2.0 * uHalf), 0.0, 1.0); // 0 = floor, 1 = fixture
    float a = uOpacity * pow(t, 1.4);        // brightest near the fixture, fades down
    a *= smoothstep(1.0, 0.82, t);           // soften the very tip — no hard bright point
    gl_FragColor = vec4(uColor, a);
  }
`;

function Beam() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(WARM) },
      uOpacity: { value: 0.12 },
      uHalf: { value: BEAM_H / 2 },
    }),
    [],
  );
  return (
    // apex sits at the fixture (y ≈ -0.06), cone widens downward to the floor
    <mesh position={[0, -0.06 - BEAM_H / 2, 0]} renderOrder={999} raycast={() => null}>
      <coneGeometry args={[BEAM_R, BEAM_H, 24, 1, true]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={BEAM_VERT}
        fragmentShader={BEAM_FRAG}
      />
    </mesh>
  );
}

function CeilingLight({ position, helpers, beams }: { position: [number, number, number]; helpers: boolean; beams: boolean }) {
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
        <FittedModel url="/models/ceiling_light.glb" realDimsMm={{ w: 1, h: 1, d: 1 }} fitMaxSize={0.26} ground={false} autoFlat castShadow={false} />
      </group>
      {/* soft emissive lens = the fixture opening (glow only, not the illuminator) */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 24]} />
        <meshStandardMaterial color="#fff6ea" emissive={WARM} emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
      {/* controlled downward beam — the real illumination, a recessed downlight */}
      <spotLight ref={spotRef} position={[0, -0.06, 0]} angle={0.55} penumbra={0.85} intensity={9} distance={6.5} decay={1.5} color={WARM} castShadow={false} />
      <object3D ref={targetRef} position={[0, -2, 0]} />
      {/* fake volumetric shine in the air (toggleable for perf) */}
      {beams && <Beam />}
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
  const beams = useConfigurator((s) => s.showLightBeams);
  return (
    <>
      {room.lightZones.map((z) => {
        const cfg = roomLights[z.id];
        if (!cfg || cfg.type !== "ceiling" || cfg.count <= 0) return null;
        return gridPositions(z, cfg.count).map((p, i) => (
          <CeilingLight key={`${z.id}-${i}`} position={p} helpers={helpers} beams={beams} />
        ));
      })}
    </>
  );
}
