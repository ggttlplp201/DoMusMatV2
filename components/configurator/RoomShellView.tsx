"use client";

/**
 * RoomShellView — renders each surface in a RoomShell as a plane mesh.
 * Color resolution: scene.surfaces[id] → MATERIALS color → per-kind default.
 */

import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { RoomShell, SurfaceDef } from "@/lib/configurator/types";
import { MATERIALS } from "@/lib/configurator/products";

const DEFAULT_KIND_COLOR: Record<string, string> = {
  floor:   "#9a9a9a",
  ceiling: "#f4f4f4",
  wall:    "#e9e7e2",
};

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
        const matId = assignedMaterials[s.id];
        const color = matId
          ? (MATERIALS.find((m) => m.id === matId)?.color ?? DEFAULT_KIND_COLOR[s.kind])
          : DEFAULT_KIND_COLOR[s.kind];

        return (
          <mesh
            key={s.id}
            position={s.pos}
            rotation={s.rot}
            onClick={onClick(s)}
            onPointerMove={onPointerMove(s)}
          >
            <planeGeometry args={s.size} />
            <meshStandardMaterial
              color={color}
              side={THREE.DoubleSide}
              roughness={0.85}
            />
          </mesh>
        );
      })}
    </>
  );
}
