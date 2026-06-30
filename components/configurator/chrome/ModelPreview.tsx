"use client";

/**
 * ModelPreview — a small, rotatable 3D render of a GLB for the picker modal.
 * Drag to orbit; it also slowly auto-rotates. Reuses FittedModel (uniformly
 * scaled + centred) so any catalogue model previews consistently.
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ProductMeta } from "@/lib/configurator/types";
import FittedModel from "../FittedModel";

export default function ModelPreview({ meta }: { meta: ProductMeta }) {
  if (!meta.modelUrl) return null;
  return (
    <Canvas
      camera={{ position: [2.4, 1.7, 2.8], fov: 38 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 2]} intensity={1.25} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <FittedModel url={meta.modelUrl} realDimsMm={meta.realDimsMm} modelRotY={meta.modelRotY} fitMaxSize={1.9} ground={false} castShadow={false} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.1}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
