"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useConfigurator } from "@/state/configurator";
import { getRoomShell } from "@/lib/configurator/rooms";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import { decodeScene } from "@/lib/configurator/serialize";
import { useCart } from "@/state/cart";
import Scene from "@/components/configurator/Scene";
import Hud from "@/components/configurator/Hud";

export default function ConfiguratorPage() {
  const [mounted, setMounted] = useState(false);
  const loadScene = useConfigurator((s) => s.loadScene);
  const { items: cart } = useCart();

  // products the user picked that are actually configurable
  const palette = useMemo(
    () => cart.map((i) => CONFIGURABLE_PRODUCTS[i.ref]).filter(Boolean),
    [cart],
  );
  const room = useMemo(() => getRoomShell("house-40x30"), []);

  useEffect(() => {
    setMounted(true);
    const q = new URLSearchParams(window.location.search).get("s");
    const loaded = q ? decodeScene(q) : null;
    if (loaded) loadScene(loaded);
  }, [loadScene]);

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white select-none">
      {mounted && (
        <Canvas camera={{ fov: 70, near: 0.05, far: 100 }} dpr={[1, 1.75]}>
          <Scene room={room} />
        </Canvas>
      )}
      <Hud room={room} palette={palette} />
    </div>
  );
}
