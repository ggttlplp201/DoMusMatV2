"use client";

/**
 * Scene — R3F scene root for the configurator.
 *
 * Assembles: lights, RoomShellView, ItemView[], CameraRig.
 * Routes pointer events to Zustand store actions, matching the prototype's
 * onSurfaceClick / onSurfaceMove / item onClick / onDoubleClick exactly.
 *
 * Pointer event routing (mirrors prototype):
 *   surface click (look)  → walkTo (floor only, not a drag)
 *   surface click (paint) → paintSurface(s.id, tool.material)
 *   surface click (place) → placeItem(meta, s, point) if allowed surface kind
 *   surface pointermove (buttons===1, editing) → moveItem(editingId, s, point)
 *     only when surface kind matches the editing item's allowed surfaces
 *   item click (look, not drag) → select(id)
 *   item double-click (look) → beginEdit(id)
 */

import { Suspense, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useConfigurator } from "@/state/configurator";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import type { ItemSlot, RoomShell, SurfaceDef } from "@/lib/configurator/types";
import CameraRig, { useCameraRig } from "./CameraRig";
import RoomShellView from "./RoomShellView";
import ItemView from "./ItemView";
import SlotMarkers from "./SlotMarkers";
import Fixtures from "./Fixtures";
import LightFixtures from "./LightFixtures";

// ---- time-of-day sun ------------------------------------------------------
function sunFromTime(t: number) {
  const u = Math.min(1, Math.max(0, (t - 6) / 12)); // 0..1 across 6→18h
  const el = Math.sin(u * Math.PI);                 // elevation 0(dawn)→1(noon)→0(dusk)
  const az = Math.cos(u * Math.PI);                 // +1 east → −1 west
  const dir = new THREE.Vector3(az, Math.max(0.12, el), 0.55).normalize();
  const intensity = 0.5 + 3.2 * el;                 // dim at dawn/dusk, bright at noon
  const color = new THREE.Color("#ff9442").lerp(new THREE.Color("#fff4e2"), el);
  return { position: dir.multiplyScalar(22).toArray() as [number, number, number], intensity, color: `#${color.getHexString()}` };
}

function Sun() {
  const t = useConfigurator((s) => s.timeOfDay);
  const sun = useMemo(() => sunFromTime(t), [t]);
  return (
    <directionalLight
      castShadow
      position={sun.position}
      intensity={sun.intensity}
      color={sun.color}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-camera-near={0.5}
      shadow-camera-far={60}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
    />
  );
}

// ---- inner scene (needs to be inside CameraRig's context provider) -------
function SceneInner({ room, onSlotClick }: { room: RoomShell; onSlotClick: (slot: ItemSlot) => void }) {
  const { walkTo, wasDrag } = useCameraRig();

  const scene      = useConfigurator((s) => s.scene);
  const tool       = useConfigurator((s) => s.tool);
  const selectedId = useConfigurator((s) => s.selectedId);
  const editingId  = useConfigurator((s) => s.editingId);

  const paintSurface = useConfigurator((s) => s.paintSurface);
  const placeItem    = useConfigurator((s) => s.placeItem);
  const moveItem     = useConfigurator((s) => s.moveItem);
  const select       = useConfigurator((s) => s.select);
  const beginEdit    = useConfigurator((s) => s.beginEdit);

  // mirror editingId into a ref so event handlers (closures) see current value
  // without causing re-renders on every frame
  const editingIdRef = useRef<string | null>(null);
  editingIdRef.current = editingId;

  const toolRef = useRef(tool);
  toolRef.current = tool;

  // helper: convert THREE.Vector3 to store tuple
  const toTuple = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

  // ---- surface click handler ----------------------------------------------
  const onSurfaceClick = (def: SurfaceDef) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (editingIdRef.current) return;   // editing: movement is via drag, not click
    if (wasDrag()) return;              // it was a look-drag, not a click

    const t = toolRef.current;
    const p = e.point;

    if (t.kind === "look") {
      if (def.kind === "floor") walkTo(p);
      return;
    }
    if (t.kind === "paint") {
      paintSurface(def.id, t.material);
      return;
    }
    if (t.kind === "place") {
      const meta = CONFIGURABLE_PRODUCTS[t.ref];
      if (meta && meta.allowedSurfaces.includes(def.kind)) {
        placeItem(meta, def, toTuple(p));
      }
    }
  };

  // ---- surface pointer-move handler (locked drag-to-move) -----------------
  const onSurfaceMove = (def: SurfaceDef) => (e: ThreeEvent<PointerEvent>) => {
    const eid = editingIdRef.current;
    if (!eid) return;
    if ((e.nativeEvent as PointerEvent).buttons !== 1) return; // only while dragging
    // find the editing item's product meta to check allowed surfaces
    const editingItem = scene.items.find((i) => i.id === eid);
    if (!editingItem) return;
    const meta = CONFIGURABLE_PRODUCTS[editingItem.ref];
    if (!meta || !meta.allowedSurfaces.includes(def.kind)) return;
    e.stopPropagation();
    moveItem(eid, def, toTuple(e.point));
  };

  return (
    <>
      {/* HDRI environment — image-based lighting, reflections + sky background */}
      <Suspense fallback={null}>
        <Environment files="/hdris/MorningSkyHDRI014B_1K_HDR.exr" background />
      </Suspense>
      {/* sun — angle/colour driven by time of day; casts shadows */}
      <Sun />
      {/* low fill so deep-interior corners aren't crushed (HDRI does the rest) */}
      <ambientLight intensity={0.12} />

      {/* room shell + placed items (GLB/texture loads suspend) */}
      <Suspense fallback={null}>
        <RoomShellView
          room={room}
          assignedMaterials={scene.surfaces}
          onClick={onSurfaceClick}
          onPointerMove={onSurfaceMove}
        />

        {scene.items.map((item) => (
          <ItemView
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            editing={item.id === editingId}
            onClick={(e) => {
              e.stopPropagation();
              if (editingIdRef.current) return;
              if (wasDrag()) return;
              if (toolRef.current.kind === "look") select(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (toolRef.current.kind === "look") beginEdit(item.id);
            }}
          />
        ))}

        {/* preset item slots (ghost "+ add" markers / chosen products) */}
        <SlotMarkers room={room} onSlotClick={onSlotClick} />

        {/* fixed windows */}
        <Fixtures room={room} />

        {/* interior light fixtures (hanging bar, ceiling lights) */}
        <LightFixtures room={room} />
      </Suspense>
    </>
  );
}

// ---- public component (mounts inside Canvas) -----------------------------
export default function Scene({ room, onSlotClick }: { room: RoomShell; onSlotClick: (slot: ItemSlot) => void }) {
  const editingId = useConfigurator((s) => s.editingId);
  const lockedRef = useRef(false);
  lockedRef.current = editingId !== null;

  return (
    <CameraRig lockedRef={lockedRef} bounds={room.bounds} eyeHeight={room.eyeHeight}>
      <SceneInner room={room} onSlotClick={onSlotClick} />
    </CameraRig>
  );
}
