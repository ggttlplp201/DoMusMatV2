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

import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useConfigurator } from "@/state/configurator";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import type { RoomShell, SurfaceDef } from "@/lib/configurator/types";
import CameraRig, { useCameraRig } from "./CameraRig";
import RoomShellView from "./RoomShellView";
import ItemView from "./ItemView";

// ---- inner scene (needs to be inside CameraRig's context provider) -------
function SceneInner({ room }: { room: RoomShell }) {
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
      {/* ---- lights (ambient 0.7 + directional 0.8 + point) -------------- */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 4, 2]} intensity={0.8} />
      <pointLight position={[0, 2.3, 0]} intensity={6} distance={9} />

      {/* ---- room shell -------------------------------------------------- */}
      <RoomShellView
        room={room}
        assignedMaterials={scene.surfaces}
        onClick={onSurfaceClick}
        onPointerMove={onSurfaceMove}
      />

      {/* ---- placed items ------------------------------------------------ */}
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
    </>
  );
}

// ---- public component (mounts inside Canvas) -----------------------------
export default function Scene({ room }: { room: RoomShell }) {
  const editingId = useConfigurator((s) => s.editingId);
  const lockedRef = useRef(false);
  lockedRef.current = editingId !== null;

  return (
    <CameraRig lockedRef={lockedRef} bounds={room.bounds} eyeHeight={room.eyeHeight}>
      <SceneInner room={room} />
    </CameraRig>
  );
}
