"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useConfigurator } from "@/state/configurator";
import { getRoomShell } from "@/lib/configurator/rooms";
import { decodeScene } from "@/lib/configurator/serialize";
import { paletteFromCartRefs } from "@/lib/configurator/palette";
import { repo } from "@/lib/repository";
import { useCart } from "@/state/cart";
import Scene from "@/components/configurator/Scene";
import Hud from "@/components/configurator/Hud";

export default function ConfiguratorPage() {
  const [mounted, setMounted] = useState(false);
  const loadScene = useConfigurator((s) => s.loadScene);
  const sceneRoom = useConfigurator((s) => s.scene.room);
  const { items: cart } = useCart();

  // products the user picked that are actually configurable
  // cart items carry a variant SKU (ref); resolve via repository to the product id
  const palette = useMemo(
    () =>
      paletteFromCartRefs(
        cart.map((i) => i.ref),
        (ref) => repo.findByRef(ref)?.product.id,
      ),
    [cart],
  );

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
        <Canvas camera={{ fov: 70, near: 0.05, far: 100 }} dpr={[1, 1.75]}>
          <Scene room={room} />
        </Canvas>
      )}
      <Hud room={room} palette={palette} />
    </div>
  );
}
