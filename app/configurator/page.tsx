"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, N8AO, Bloom, SMAA } from "@react-three/postprocessing";
import { useConfigurator } from "@/state/configurator";
import { getRoomShell } from "@/lib/configurator/rooms";
import { decodeScene } from "@/lib/configurator/serialize";
import { useProgress } from "@react-three/drei";
import { paletteFromCartRefs } from "@/lib/configurator/palette";
import { SAMPLE_PRODUCTS } from "@/lib/configurator/products";
import { repo } from "@/lib/repository";
import { useCart } from "@/state/cart";
import Scene from "@/components/configurator/Scene";
import Hud from "@/components/configurator/Hud";
import ModelPicker from "@/components/configurator/chrome/ModelPicker";

/** Frosted-glass loading overlay while GLBs / HDRI stream in. */
function LoadingOverlay() {
  const { active } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-white/20 backdrop-blur-md">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/15 px-8 py-6 ring-1 ring-white/30 backdrop-blur-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
        <span className="text-xs font-medium tracking-wide text-white/90">Loading…</span>
      </div>
    </div>
  );
}

export default function ConfiguratorPage() {
  const [mounted, setMounted] = useState(false);
  const loadScene = useConfigurator((s) => s.loadScene);
  const sceneRoom = useConfigurator((s) => s.scene.room);
  const { items: cart } = useCart();

  // palette = always-available sample assets + the user's configurable cart picks.
  // cart items carry a variant SKU (ref); resolve via repository to the product id.
  const palette = useMemo(() => {
    const cartPicks = paletteFromCartRefs(
      cart.map((i) => i.ref),
      (ref) => repo.findByRef(ref)?.product.id,
    );
    const sampleRefs = new Set(SAMPLE_PRODUCTS.map((p) => p.ref));
    return [...SAMPLE_PRODUCTS, ...cartPicks.filter((p) => !sampleRefs.has(p.ref))];
  }, [cart]);

  // derive room shell from the store's scene.room so a loaded/shared scene uses its own room
  const room = useMemo(() => getRoomShell(sceneRoom), [sceneRoom]);

  useEffect(() => {
    setMounted(true);
    const q = new URLSearchParams(window.location.search).get("s");
    const loaded = q ? decodeScene(q) : null;
    if (loaded) loadScene(loaded);
  }, [loadScene]);

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white select-none">
      {mounted && (
        <Canvas
          shadows
          camera={{ fov: 70, near: 0.05, far: 100 }}
          dpr={[1, 1.5]}
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.45 }}
        >
          <Scene room={room} />
          {/* tasteful polish: ambient occlusion + bloom + anti-aliasing (perf-tuned) */}
          <EffectComposer multisampling={0}>
            <N8AO halfRes aoRadius={0.5} intensity={1.3} distanceFalloff={1} aoSamples={8} denoiseSamples={4} color="black" />
            <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.2} intensity={0.06} mipmapBlur />
            <SMAA />
          </EffectComposer>
        </Canvas>
      )}
      <Hud room={room} palette={palette} />
      <LoadingOverlay />
      <ModelPicker />
    </div>
  );
}
