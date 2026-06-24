"use client";

/**
 * ItemView — renders one PlacedItem.
 *
 * If CONFIGURABLE_PRODUCTS[item.ref].modelUrl is set → useGLTF.
 * Otherwise → primitive placeholder (cylinder for floor items, thin box for wall items).
 * Matches the prototype's bollard/panel primitives exactly.
 *
 * Selection ring: white; editing ring: green (#46e0a0).
 */

import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { PlacedItem } from "@/lib/configurator/types";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";

// ---- GLB model (only loaded when modelUrl is present) --------------------
function ModelMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} />;
}

// ---- primitive placeholder -----------------------------------------------
function PlaceholderMesh({ item }: { item: PlacedItem }) {
  const meta = CONFIGURABLE_PRODUCTS[item.ref];
  // derive a simple colour from the real dims so different products look distinct
  const color = "#d9c27a"; // default bollard colour — extend if more products added

  if (!meta) return null;

  const isFloor = meta.allowedSurfaces.includes("floor");

  if (isFloor) {
    // cylinder: bollard-style (matches prototype)
    const h = (meta.realDimsMm.h / 1000) * 0.9; // scale to ≈ real height
    const r = (meta.realDimsMm.w / 1000) / 2;
    return (
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r * 0.8, r, h, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    );
  } else {
    // thin box: wall panel style (matches prototype)
    const w = meta.realDimsMm.w / 1000;
    const h = meta.realDimsMm.h / 1000;
    return (
      <mesh>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    );
  }
}

// ---- public component ----------------------------------------------------
interface Props {
  item: PlacedItem;
  selected: boolean;
  editing: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}

export default function ItemView({ item, selected, editing, onClick, onDoubleClick }: Props) {
  const meta = CONFIGURABLE_PRODUCTS[item.ref];
  const ring = editing ? "#46e0a0" : "#ffffff";

  return (
    <group
      position={item.pos}
      rotation={[0, item.rotY, 0]}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {meta?.modelUrl ? (
        <ModelMesh url={meta.modelUrl} />
      ) : (
        <PlaceholderMesh item={item} />
      )}

      {(selected || editing) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 24]} />
          <meshBasicMaterial color={ring} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
