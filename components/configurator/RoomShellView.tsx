"use client";

/**
 * RoomShellView — renders each surface in a RoomShell as a plane mesh.
 * Material resolution: scene.surfaces[id] → room.defaultMaterials[id] → kind color.
 * Materials with a texture set render as PBR (color/normal/roughness), tiled by
 * surface size; otherwise a flat color.
 */

import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { RoomShell, SurfaceDef } from "@/lib/configurator/types";
import { MATERIALS, type MaterialTextureSet } from "@/lib/configurator/products";

const DEFAULT_KIND_COLOR: Record<string, string> = {
  floor:   "#d8d8d8",
  ceiling: "#f4f4f4",
  wall:    "#ececec",
};

const WALL_THICKNESS = 0.15; // ~6 inches

// ---- textured PBR material, tiled to the surface size ---------------------
function TexturedMaterial({ tex, size }: { tex: MaterialTextureSet; size: [number, number] }) {
  const urls = useMemo(
    () => [tex.color, tex.normal, tex.roughness].filter(Boolean) as string[],
    [tex],
  );
  const loaded = useTexture(urls);
  const rx = Math.max(1, Math.round(size[0] / tex.repeatMeters));
  const ry = Math.max(1, Math.round(size[1] / tex.repeatMeters));
  // clone per surface so each gets independent repeat (useTexture caches by URL)
  const maps = useMemo(() => {
    const arr = Array.isArray(loaded) ? loaded : [loaded];
    return arr.map((m, idx) => {
      const c = m.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(rx, ry);
      if (idx === 0) c.colorSpace = THREE.SRGBColorSpace; // color map
      c.needsUpdate = true;
      return c;
    });
  }, [loaded, rx, ry]);

  let i = 0;
  const map = tex.color ? maps[i++] : undefined;
  const normalMap = tex.normal ? maps[i++] : undefined;
  const roughnessMap = tex.roughness ? maps[i++] : undefined;
  return (
    <meshStandardMaterial
      map={map}
      normalMap={normalMap}
      roughnessMap={roughnessMap}
      side={THREE.DoubleSide}
      metalness={0}
      roughness={1}
    />
  );
}

interface Props {
  room: RoomShell;
  /** surfaceId → materialId from the store's SceneDocument */
  assignedMaterials: Record<string, string>;
  onClick: (surface: SurfaceDef) => (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove: (surface: SurfaceDef) => (e: ThreeEvent<PointerEvent>) => void;
}

export default function RoomShellView({ room, assignedMaterials, onClick, onPointerMove }: Props) {
  return (
    <>
      {room.surfaces.map((s) => {
        const matId = assignedMaterials[s.id] ?? room.defaultMaterials[s.id];
        const mat = matId ? MATERIALS.find((m) => m.id === matId) : undefined;

        return (
          <mesh
            key={s.id}
            position={s.pos}
            rotation={s.rot}
            castShadow
            receiveShadow
            onClick={onClick(s)}
            onPointerMove={onPointerMove(s)}
          >
            {s.kind === "wall" ? (
              <boxGeometry args={[s.size[0], s.size[1], WALL_THICKNESS]} />
            ) : (
              <planeGeometry args={s.size} />
            )}
            {mat?.textures ? (
              <TexturedMaterial tex={mat.textures} size={s.size} />
            ) : (
              <meshStandardMaterial
                color={mat?.color ?? DEFAULT_KIND_COLOR[s.kind]}
                side={THREE.DoubleSide}
                roughness={0.85}
              />
            )}
          </mesh>
        );
      })}
    </>
  );
}
