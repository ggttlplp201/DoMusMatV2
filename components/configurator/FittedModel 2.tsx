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
  url, realDimsMm, ground = true, modelRotY = 0, castShadow = true, uniform = false, fitMaxSize, autoFlat = false,
}: {
  url: string;
  realDimsMm: ProductMeta["realDimsMm"];
  ground?: boolean;
  modelRotY?: number;
  castShadow?: boolean;
  uniform?: boolean;
  fitMaxSize?: number;               // m — scale so the largest dimension = this (orientation-agnostic)
  autoFlat?: boolean;                // rotate the model's thinnest axis to vertical (lay a disk/panel flat)
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
    if (autoFlat) {
      // make the thinnest axis vertical (Y) so a flat fixture lies horizontal
      const thin = [size.x, size.y, size.z].indexOf(Math.min(size.x, size.y, size.z));
      if (thin === 0) root.rotateZ(Math.PI / 2);      // X thin → vertical
      else if (thin === 2) root.rotateX(Math.PI / 2); // Z thin → vertical
      root.updateMatrixWorld(true);
      box.setFromObject(root);
      box.getSize(size);
      box.getCenter(center);
    }
    const rx = size.x > 1e-4 ? (realDimsMm.w / 1000) / size.x : 1;
    const ry = size.y > 1e-4 ? (realDimsMm.h / 1000) / size.y : 1;
    const rz = size.z > 1e-4 ? (realDimsMm.d / 1000) / size.z : 1;
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = fitMaxSize
      ? new THREE.Vector3().setScalar(maxDim > 1e-4 ? fitMaxSize / maxDim : 1) // scale longest axis to target
      : uniform ? new THREE.Vector3().setScalar(Math.min(rx, ry))             // fit inside footprint, no squish
      : new THREE.Vector3(rx, ry, rz);                                        // per-axis to real dims
    root.position.set(-center.x, ground ? -box.min.y : -center.y, -center.z);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = castShadow; m.receiveShadow = true; }
    });
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.copy(s);
    return wrap;
  }, [scene, realDimsMm.w, realDimsMm.h, realDimsMm.d, ground, modelRotY, castShadow, uniform]);
  return <primitive object={fitted} />;
}
