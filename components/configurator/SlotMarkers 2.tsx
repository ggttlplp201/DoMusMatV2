"use client";

/**
 * SlotMarkers — renders preset item slots.
 *  - empty slot → ghost outline + a floating "＋ Add …" button (drei Html)
 *  - filled slot → the chosen product model; clicking it re-opens the picker
 * Clicking a slot calls onSlotClick(slot) so the page can show the product picker.
 */

import { Suspense } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { ItemSlot, RoomShell } from "@/lib/configurator/types";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import { useConfigurator } from "@/state/configurator";
import FittedModel from "./FittedModel";

export default function SlotMarkers({ room, onSlotClick }: { room: RoomShell; onSlotClick: (slot: ItemSlot) => void }) {
  const slots = useConfigurator((s) => s.scene.slots);
  return (
    <>
      {room.slots.map((slot) => {
        const ref = slots?.[slot.id];
        const meta = ref ? CONFIGURABLE_PRODUCTS[ref] : undefined;
        return (
          <group key={slot.id} position={slot.pos} rotation={[0, slot.rotY, 0]}>
            {meta?.modelUrl ? (
              <group onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSlotClick(slot); }}>
                <Suspense fallback={null}>
                  <FittedModel url={meta.modelUrl} realDimsMm={meta.realDimsMm} modelRotY={meta.modelRotY} />
                </Suspense>
              </group>
            ) : (
              <SlotGhost slot={slot} onClick={() => onSlotClick(slot)} />
            )}
          </group>
        );
      })}
    </>
  );
}

function SlotGhost({ slot, onClick }: { slot: ItemSlot; onClick: () => void }) {
  const [w, h] = slot.outline;
  return (
    <>
      {/* upright outline frame */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 0.04]} />
        <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.7} />
      </mesh>
      {/* floor footprint */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.35]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {/* floating "+ add" button (constant screen size) */}
      <Html center position={[0, Math.max(1.0, h / 2), 0]} zIndexRange={[20, 0]}>
        <button
          onClick={onClick}
          style={{
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            background: "rgba(16,185,129,0.95)", color: "white", border: "none",
            borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.35)", userSelect: "none",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> {slot.label}
        </button>
      </Html>
    </>
  );
}
