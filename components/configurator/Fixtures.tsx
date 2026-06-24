"use client";

/**
 * Fixtures — fixed architectural models (windows). Always present, non-editable,
 * no pointer handlers. Each is auto-fit to its declared size and placed at the
 * fixture transform (windows are centred, not floor-grounded).
 */

import { Suspense } from "react";
import type { RoomShell } from "@/lib/configurator/types";
import FittedModel from "./FittedModel";

export default function Fixtures({ room }: { room: RoomShell }) {
  return (
    <>
      {room.fixtures.map((f) => (
        <group key={f.id} position={f.pos} rotation={[0, f.rotY, 0]}>
          <Suspense fallback={null}>
            {/* castShadow off so windows let sunlight through onto the floor */}
            <FittedModel url={f.modelUrl} realDimsMm={f.realDimsMm} ground={f.ground ?? true} uniform={f.uniform} castShadow={false} />
          </Suspense>
        </group>
      ))}
    </>
  );
}
