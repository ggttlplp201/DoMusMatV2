"use client";

/**
 * SlotMarkers — renders preset item slots.
 *  - empty slot, camera near  → ghost outline + a floating "＋ Add …" button
 *  - empty slot, camera far   → a small floor dot (discoverable, not cluttered)
 *  - filled slot              → the chosen product model; clicking re-opens the picker
 * Only slots within NEAR_RADIUS of the camera show their full affordance, so you
 * see a handful at a time instead of every label in the building at once.
 * Clicking a slot calls onSlotClick(slot) so the page can show the product picker.
 */

import { Suspense, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ItemSlot, RoomShell } from "@/lib/configurator/types";
import { CONFIGURABLE_PRODUCTS, productsForCategory } from "@/lib/configurator/products";
import { useConfigurator } from "@/state/configurator";
import FittedModel from "./FittedModel";

const NEAR_RADIUS = 4.5;                       // m — fully reveal "+ Add" within this range
const NEAR_RADIUS_SQ = NEAR_RADIUS * NEAR_RADIUS;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SlotMarkers({ room }: { room: RoomShell }) {
  const slots = useConfigurator((s) => s.scene.slots);
  const capturing = useConfigurator((s) => s.capturing);
  const openPicker = useConfigurator((s) => s.openPicker);
  const camera = useThree((s) => s.camera);
  const [near, setNear] = useState<Set<string>>(() => new Set());
  const acc = useRef(0);

  // open the shared picker for a slot (fills that slot on "Place in room")
  const onSlotClick = (slot: ItemSlot) =>
    openPicker({
      title: `Choose ${cap(slot.category)}`,
      refs: productsForCategory(slot.category).map((p) => p.ref),
      surfaceLabel: "Floor",
      slotId: slot.id,
    });

  // throttled (~6.7Hz) proximity check; only re-render when the near-set changes
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.15) return;
    acc.current = 0;
    const { x, z } = camera.position;
    setNear((prev) => {
      const next = new Set<string>();
      for (const slot of room.slots) {
        const dx = slot.pos[0] - x, dz = slot.pos[2] - z;
        if (dx * dx + dz * dz <= NEAR_RADIUS_SQ) next.add(slot.id);
      }
      if (next.size === prev.size) {
        let same = true;
        for (const id of next) if (!prev.has(id)) { same = false; break; }
        if (same) return prev; // unchanged → skip re-render
      }
      return next;
    });
  });

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
            ) : capturing ? null : near.has(slot.id) ? (
              // close enough to act on — full outline + label, hidden while rendering panos
              <SlotGhost slot={slot} onClick={() => onSlotClick(slot)} />
            ) : (
              // far away — just a quiet floor dot so the spot is discoverable
              <SlotDot onClick={() => onSlotClick(slot)} />
            )}
          </group>
        );
      })}
    </>
  );
}

function SlotDot({ onClick }: { onClick: () => void }) {
  return (
    <mesh
      position={[0, 0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
    >
      <circleGeometry args={[0.2, 24]} />
      <meshBasicMaterial color="#34d399" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
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
