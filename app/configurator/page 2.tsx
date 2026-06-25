"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { useConfigurator } from "@/state/configurator";
import { getRoomShell } from "@/lib/configurator/rooms";
import { decodeScene } from "@/lib/configurator/serialize";
import { useProgress } from "@react-three/drei";
import { paletteFromCartRefs } from "@/lib/configurator/palette";
import { SAMPLE_PRODUCTS, productsForCategory } from "@/lib/configurator/products";
import type { ItemSlot } from "@/lib/configurator/types";
import { repo } from "@/lib/repository";
import { useCart } from "@/state/cart";
import Scene from "@/components/configurator/Scene";
import Hud from "@/components/configurator/Hud";

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
  const [pickerSlot, setPickerSlot] = useState<ItemSlot | null>(null);
  const loadScene = useConfigurator((s) => s.loadScene);
  const sceneRoom = useConfigurator((s) => s.scene.room);
  const slots = useConfigurator((s) => s.scene.slots);
  const assignSlot = useConfigurator((s) => s.assignSlot);
  const clearSlot = useConfigurator((s) => s.clearSlot);
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
          dpr={[1, 1.75]}
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }}
        >
          <Scene room={room} onSlotClick={setPickerSlot} />
        </Canvas>
      )}
      <Hud room={room} palette={palette} />
      <LoadingOverlay />

      {/* preset-slot product picker */}
      {pickerSlot && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPickerSlot(null)}
        >
          <div className="w-80 rounded-xl bg-neutral-900 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-sm font-semibold capitalize">Choose a {pickerSlot.category}</div>
            <div className="grid grid-cols-2 gap-2">
              {productsForCategory(pickerSlot.category).map((p) => {
                const active = slots?.[pickerSlot.id] === p.ref;
                return (
                  <button
                    key={p.ref}
                    onClick={() => { assignSlot(pickerSlot.id, p.ref); setPickerSlot(null); }}
                    className={`rounded-lg border p-3 text-left text-xs transition ${active ? "border-emerald-400 bg-emerald-400/10" : "border-white/15 hover:border-white/50"}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              {slots?.[pickerSlot.id] && (
                <button className="text-red-300 underline" onClick={() => { clearSlot(pickerSlot.id); setPickerSlot(null); }}>
                  Remove
                </button>
              )}
              <button className="text-white/60 underline" onClick={() => setPickerSlot(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
