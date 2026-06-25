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

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { PlacedItem, ProductMeta } from "@/lib/configurator/types";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";

// ---- GLB model (only loaded when modelUrl is present) --------------------
// Auto-fits any GLB to its real-world height (realDimsMm.h), centres it
// horizontally, and grounds its base to y=0 — so models of unknown source
// scale/origin land on the floor at a believable size.
function ModelMesh({ url, realDimsMm }: { url: string; realDimsMm: ProductMeta["realDimsMm"] }) {
  const { scene } = useGLTF(url);
  const fitted = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = size.y > 1e-4 ? (realDimsMm.h / 1000) / size.y : 1;
    root.position.set(-center.x, -box.min.y, -center.z); // centre x/z, ground base to y=0
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar(s);
    return wrap;
  }, [scene, realDimsMm.h]);
  return <primitive object={fitted} />;
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
        <Suspense fallback={null}>
          <ModelMesh url={meta.modelUrl} realDimsMm={meta.realDimsMm} />
        </Suspense>
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
