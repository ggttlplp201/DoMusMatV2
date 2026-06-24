"use client";

/**
 * FittedModel — loads a GLB, optionally normalises its facing (modelRotY),
 * fits it to its real-world dimensions (realDimsMm w×h×d, per-axis), centres it
 * horizontally and grounds its base to y=0 (or centres it when ground=false),
 * and enables shadow casting/receiving. Shared by items, slots, and fixtures.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { ProductMeta } from "@/lib/configurator/types";

export default function FittedModel({
  url, realDimsMm, ground = true, modelRotY = 0, castShadow = true,
}: {
  url: string;
  realDimsMm: ProductMeta["realDimsMm"];
  ground?: boolean;
  modelRotY?: number;
  castShadow?: boolean;
}) {
  const { scene } = useGLTF(url);
  const fitted = useMemo(() => {
    const root = scene.clone(true);
    root.rotation.y = modelRotY;           // normalise the asset's native facing first
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const sx = size.x > 1e-4 ? (realDimsMm.w / 1000) / size.x : 1;
    const sy = size.y > 1e-4 ? (realDimsMm.h / 1000) / size.y : 1;
    const sz = size.z > 1e-4 ? (realDimsMm.d / 1000) / size.z : 1;
    root.position.set(-center.x, ground ? -box.min.y : -center.y, -center.z);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = castShadow; m.receiveShadow = true; }
    });
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.set(sx, sy, sz);
    return wrap;
  }, [scene, realDimsMm.w, realDimsMm.h, realDimsMm.d, ground, modelRotY, castShadow]);
  return <primitive object={fitted} />;
}
