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

import { Suspense, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useConfigurator } from "@/state/configurator";
import { cameraMini } from "@/lib/configurator/cameraTrack";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import type { ItemSlot, RoomShell, SurfaceDef } from "@/lib/configurator/types";
import CameraRig, { useCameraRig } from "./CameraRig";
import RoomShellView from "./RoomShellView";
import ItemView from "./ItemView";
import SlotMarkers from "./SlotMarkers";
import Fixtures from "./Fixtures";
import LightFixtures from "./LightFixtures";
import PanoCapture from "./PanoCapture";

// ---- time-of-day sun (real moving direction, not just brightness) ---------
function Sun() {
  const time = useConfigurator((s) => s.timeOfDay);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    const sun = lightRef.current;
    const target = targetRef.current;
    if (!sun || !target) return;
    sun.target = target;
    const t = Math.min(1, Math.max(0, (time - 6) / 14)); // 0 sunrise(6h) → 1 sunset(20h)
    const azimuth = THREE.MathUtils.lerp(-Math.PI * 0.75, Math.PI * 0.75, t); // sweeps E→W
    const elevation = Math.sin(t * Math.PI) * Math.PI * 0.45 + 0.08;          // arcs up then down
    const r = 30;
    sun.position.set(
      Math.cos(azimuth) * Math.cos(elevation) * r,
      Math.sin(elevation) * r,
      Math.sin(azimuth) * Math.cos(elevation) * r,
    );
    sun.intensity = Math.max(0.15, Math.sin(t * Math.PI) * 2.8);
    target.position.set(0, 0, 0); // room centre
    target.updateMatrixWorld();
    sun.updateMatrixWorld();
  }, [time]);

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow={time < 19}
        color="#fff4e2"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />
      <object3D ref={targetRef} />
    </>
  );
}

// ---- day/night environment (switches HDRI past sunset) --------------------
function DayNightEnvironment() {
  const time = useConfigurator((s) => s.timeOfDay);
  const night = time >= 19; // past sunset → night sky, dim ambient so interior lights dominate
  return (
    <Suspense fallback={null}>
      <Environment
        files={night ? "/hdris/NightSkyHDRI003_2K_HDR.exr" : "/hdris/DaySkyHDRI063B_2K_HDR.exr"}
        background
        environmentIntensity={night ? 0.1 : 0.55}
        backgroundIntensity={night ? 0.5 : 0.6}
      />
    </Suspense>
  );
}

// ---- publishes the player's floor position/facing to the DOM minimap ------
function CameraTracker() {
  const dir = useRef(new THREE.Vector3());
  useFrame(({ camera }) => {
    cameraMini.x = camera.position.x;
    cameraMini.z = camera.position.z;
    camera.getWorldDirection(dir.current);
    cameraMini.dx = dir.current.x;
    cameraMini.dz = dir.current.z;
  });
  return null;
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
      {/* HDRI environment — day sky, or night sky past sunset */}
      <DayNightEnvironment />
      {/* sun — angle/colour driven by time of day; casts shadows */}
      <Sun />
      {/* feeds the player position/facing to the DOM minimap */}
      <CameraTracker />
      {/* offscreen 360 capture for the tour */}
      <PanoCapture />
      {/* low fill so deep-interior corners aren't crushed (HDRI does the rest) */}
      <ambientLight intensity={0.16} />

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

        {/* preset item slots — chosen products always render; "+ add" ghosts hide during capture */}
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
