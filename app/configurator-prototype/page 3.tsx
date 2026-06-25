"use client";

/**
 * THROWAWAY PROTOTYPE — virtual showroom configurator.
 *
 * Question it answers: do the two core mechanics feel right?
 *   1. "click & walk" camera — click the floor to walk there, drag to look around
 *   2. assign materials/items to a preset empty room — paint a surface, place an item,
 *      then double-click an item to enter a LOCKED drag-to-move mode, and Save to commit.
 *
 * Deliberately uses NO real GLB assets — primitives only — so we prove the
 * interaction *feel* before investing in the asset pipeline.
 *
 * Not production. Delete me once the mechanics are validated; fold the verdict
 * into the spec. See app/configurator-prototype/NOTES.md.
 */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ---- room definition -------------------------------------------------------
const W = 4, D = 3, H = 2.6; // metres
type SurfaceKind = "floor" | "wall" | "ceiling";
interface SurfaceDef {
  id: string;
  kind: SurfaceKind;
  pos: [number, number, number];
  rot: [number, number, number];
  size: [number, number];
  normal: [number, number, number];
}
const SURFACES: SurfaceDef[] = [
  { id: "floor",      kind: "floor",   pos: [0, 0, 0],          rot: [-Math.PI / 2, 0, 0], size: [W, D], normal: [0, 1, 0] },
  { id: "ceiling",    kind: "ceiling", pos: [0, H, 0],          rot: [Math.PI / 2, 0, 0],  size: [W, D], normal: [0, -1, 0] },
  { id: "wall-north", kind: "wall",    pos: [0, H / 2, -D / 2], rot: [0, 0, 0],            size: [W, H], normal: [0, 0, 1] },
  { id: "wall-south", kind: "wall",    pos: [0, H / 2, D / 2],  rot: [0, Math.PI, 0],      size: [W, H], normal: [0, 0, -1] },
  { id: "wall-east",  kind: "wall",    pos: [W / 2, H / 2, 0],  rot: [0, -Math.PI / 2, 0], size: [D, H], normal: [-1, 0, 0] },
  { id: "wall-west",  kind: "wall",    pos: [-W / 2, H / 2, 0], rot: [0, Math.PI / 2, 0],  size: [D, H], normal: [1, 0, 0] },
];

// ---- catalogue stand-ins ---------------------------------------------------
const MATERIALS = [
  { id: "marble-white", name: "Marble White", color: "#ECEAE4" },
  { id: "walnut",       name: "Walnut",       color: "#6B4A2B" },
  { id: "slate",        name: "Slate",        color: "#3A3F44" },
  { id: "sage",         name: "Sage",         color: "#9CAF88" },
  { id: "terracotta",   name: "Terracotta",   color: "#C66B3D" },
];
const DEFAULT_SURFACE_MAT: Record<string, string> = {
  floor: "#9a9a9a", ceiling: "#f4f4f4",
  "wall-north": "#e9e7e2", "wall-south": "#e9e7e2", "wall-east": "#e9e7e2", "wall-west": "#e9e7e2",
};

type ItemKind = "bollard" | "planter" | "panel";
const ITEMS: Record<ItemKind, { name: string; surface: SurfaceKind; color: string }> = {
  bollard: { name: "LED Bollard", surface: "floor", color: "#d9c27a" }, // a lamp (emissive)
  planter: { name: "Planter",     surface: "floor", color: "#7a6a55" },
  panel:   { name: "Wall Panel",  surface: "wall",  color: "#8a6240" },
};

interface PlacedItem {
  id: string;
  kind: ItemKind;
  pos: [number, number, number];
  rotY: number;
  surface: string;
}

// ---- snap helpers (shared by place + drag-move) ----------------------------
function snapPos(def: SurfaceDef, p: THREE.Vector3): [number, number, number] {
  if (def.kind === "floor") return [p.x, 0, p.z];
  const [nx, , nz] = def.normal; // wall: sit flush, slight offset along normal
  return [p.x + nx * 0.03, p.y, p.z + nz * 0.03];
}
function wallRotY(def: SurfaceDef) {
  const [nx, , nz] = def.normal;
  return Math.atan2(nx, nz); // face into room
}

// ---- tool state ------------------------------------------------------------
type Tool =
  | { kind: "look" }
  | { kind: "paint"; material: string }
  | { kind: "place"; item: ItemKind };

// ===========================================================================
// Camera rig — click-to-walk + drag-to-look. Locked while editing an item.
// ===========================================================================
function useWalkLook(lockedRef: React.RefObject<boolean>) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const target = useRef(new THREE.Vector3(0, 1.6, 1.0));
  const dragging = useRef(false);
  const movedPx = useRef(0);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    camera.position.set(0, 1.6, 1.0);
    const el = gl.domElement;
    const down = (e: PointerEvent) => { dragging.current = true; movedPx.current = 0; last.current = { x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!dragging.current || lockedRef.current) return;
      const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
      movedPx.current += Math.abs(dx) + Math.abs(dy);
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current += dx * 0.003;   // drag right → look right
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current + dy * 0.003)); // drag down → look down
    };
    const up = () => { dragging.current = false; };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [camera, gl, lockedRef]);

  useFrame(() => {
    camera.position.lerp(target.current, 0.18);
    camera.position.y = 1.6;
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
  });

  const walkTo = (p: THREE.Vector3) => {
    const x = Math.max(-W / 2 + 0.4, Math.min(W / 2 - 0.4, p.x));
    const z = Math.max(-D / 2 + 0.4, Math.min(D / 2 - 0.4, p.z));
    target.current.set(x, 1.6, z);
  };
  const wasDrag = () => movedPx.current > 6;
  return { walkTo, wasDrag };
}

// ===========================================================================
// Scene
// ===========================================================================
function Scene({
  tool, surfaces, items, selectedId, editingId,
  onPaint, onPlace, onSelect, onEdit, onDragItem,
}: {
  tool: Tool;
  surfaces: Record<string, string>;
  items: PlacedItem[];
  selectedId: string | null;
  editingId: string | null;
  onPaint: (surfaceId: string) => void;
  onPlace: (surface: SurfaceDef, point: THREE.Vector3) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDragItem: (surface: SurfaceDef, point: THREE.Vector3) => void;
}) {
  const lockedRef = useRef(false);
  lockedRef.current = editingId !== null;
  const { walkTo, wasDrag } = useWalkLook(lockedRef);

  const editingItem = items.find((i) => i.id === editingId) ?? null;

  const onSurfaceClick = (def: SurfaceDef) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (editingId) return;            // editing: movement is via drag, not click
    if (wasDrag()) return;            // it was a look-drag, not a click
    const p = e.point;
    if (tool.kind === "look") { if (def.kind === "floor") walkTo(p); return; }
    if (tool.kind === "paint") { onPaint(def.id); return; }
    if (tool.kind === "place" && ITEMS[tool.item].surface === def.kind) onPlace(def, p);
  };

  const onSurfaceMove = (def: SurfaceDef) => (e: ThreeEvent<PointerEvent>) => {
    if (!editingItem) return;
    if ((e.nativeEvent as PointerEvent).buttons !== 1) return; // only while dragging
    if (ITEMS[editingItem.kind].surface !== def.kind) return;  // allowed surface only
    e.stopPropagation();
    onDragItem(def, e.point);
  };

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 4, 2]} intensity={0.8} />
      <pointLight position={[0, H - 0.3, 0]} intensity={6} distance={9} />

      {SURFACES.map((s) => (
        <mesh key={s.id} position={s.pos} rotation={s.rot} onClick={onSurfaceClick(s)} onPointerMove={onSurfaceMove(s)}>
          <planeGeometry args={s.size} />
          <meshStandardMaterial color={surfaces[s.id] ?? DEFAULT_SURFACE_MAT[s.id]} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      ))}

      {items.map((it) => (
        <ItemMesh
          key={it.id}
          item={it}
          selected={it.id === selectedId}
          editing={it.id === editingId}
          onClick={(e) => { e.stopPropagation(); if (!editingId && !wasDrag() && tool.kind === "look") onSelect(it.id); }}
          onDoubleClick={(e) => { e.stopPropagation(); if (tool.kind === "look") onEdit(it.id); }}
        />
      ))}
    </>
  );
}

function ItemMesh({ item, selected, editing, onClick, onDoubleClick }: {
  item: PlacedItem; selected: boolean; editing: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const cfg = ITEMS[item.kind];
  const emissive = item.kind === "bollard" ? cfg.color : "#000000";
  const ring = editing ? "#46e0a0" : "#ffffff";
  return (
    <group position={item.pos} rotation={[0, item.rotY, 0]} onClick={onClick} onDoubleClick={onDoubleClick}>
      {item.kind === "bollard" && (
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.9, 16]} />
          <meshStandardMaterial color={cfg.color} emissive={emissive} emissiveIntensity={0.8} />
        </mesh>
      )}
      {item.kind === "planter" && (
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color={cfg.color} roughness={0.9} />
        </mesh>
      )}
      {item.kind === "panel" && (
        <mesh>
          <boxGeometry args={[0.6, 1.2, 0.04]} />
          <meshStandardMaterial color={cfg.color} roughness={0.6} />
        </mesh>
      )}
      {(selected || editing) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 24]} />
          <meshBasicMaterial color={ring} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ===========================================================================
// Page
// ===========================================================================
let nextId = 1;

export default function ConfiguratorPrototype() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tool, setTool] = useState<Tool>({ kind: "look" });
  const [surfaces, setSurfaces] = useState<Record<string, string>>({});
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem = items.find((i) => i.id === editingId) ?? null;

  const sceneDoc = useMemo(
    () => ({
      room: "preset-empty-box",
      surfaces: Object.fromEntries(
        Object.entries(surfaces).map(([k, v]) => [k, MATERIALS.find((m) => m.color === v)?.id ?? v])
      ),
      items: items.map(({ id, kind, pos, rotY, surface }) => ({
        id, kind, surface, pos: pos.map((n) => +n.toFixed(2)), rotY: +rotY.toFixed(2),
      })),
    }),
    [surfaces, items]
  );

  // keyboard: R rotate selected/editing item, Delete remove
  useEffect(() => {
    const activeId = editingId ?? selectedId;
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R")
        setItems((prev) => prev.map((it) => (it.id === activeId ? { ...it, rotY: it.rotY + Math.PI / 12 } : it)));
      if (e.key === "Delete" || e.key === "Backspace") {
        setItems((prev) => prev.filter((it) => it.id !== activeId));
        setSelectedId(null); setEditingId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedId]);

  // Escape: leave add/paint or edit mode → back to walk/look
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingId) { setEditingId(null); setSelectedId(null); }
      else { setTool({ kind: "look" }); setSelectedId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId]);

  const placeItem = (kind: ItemKind, def: SurfaceDef, point: THREE.Vector3) => {
    const id = `item-${nextId++}`;
    setItems((prev) => [...prev, { id, kind, pos: snapPos(def, point), rotY: def.kind === "wall" ? wallRotY(def) : 0, surface: def.id }]);
    setSelectedId(id);
  };

  const dragItem = (def: SurfaceDef, point: THREE.Vector3) => {
    if (!editingId) return;
    setItems((prev) => prev.map((it) =>
      it.id === editingId
        ? { ...it, pos: snapPos(def, point), rotY: def.kind === "wall" ? wallRotY(def) : it.rotY, surface: def.id }
        : it
    ));
  };

  const enterEdit = (id: string) => { setTool({ kind: "look" }); setSelectedId(id); setEditingId(id); };
  const save = () => { setEditingId(null); setSelectedId(null); };
  const rotateActive = () => { const a = editingId ?? selectedId; if (a) setItems((p) => p.map((it) => it.id === a ? { ...it, rotY: it.rotY + Math.PI / 12 } : it)); };
  const deleteActive = () => { const a = editingId ?? selectedId; if (a) { setItems((p) => p.filter((it) => it.id !== a)); setSelectedId(null); setEditingId(null); } };

  const locked = editingId !== null;
  const btn = (active: boolean) =>
    `px-3 py-1.5 rounded text-sm border transition ${active ? "bg-white text-black border-white" : "bg-black/40 text-white border-white/30 hover:border-white/70"}`;

  return (
    <div className="fixed inset-0 bg-neutral-900 text-white select-none">
      {mounted && (
        <Canvas camera={{ fov: 70, near: 0.05, far: 100 }} dpr={[1, 1.75]}>
          <Scene
            tool={tool}
            surfaces={surfaces}
            items={items}
            selectedId={selectedId}
            editingId={editingId}
            onPaint={(sid) => tool.kind === "paint" && setSurfaces((p) => ({ ...p, [sid]: MATERIALS.find((m) => m.id === tool.material)!.color }))}
            onPlace={(def, point) => tool.kind === "place" && placeItem(tool.item, def, point)}
            onSelect={(id) => setSelectedId(id)}
            onEdit={enterEdit}
            onDragItem={dragItem}
          />
        </Canvas>
      )}

      {/* ---- HUD (dimmed/disabled while editing) ---- */}
      <div className={`absolute top-3 left-3 flex flex-col gap-3 p-3 rounded-lg bg-black/55 backdrop-blur w-60 transition ${locked ? "opacity-40 pointer-events-none" : ""}`}>
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Navigate</div>
          <button className={btn(tool.kind === "look")} onClick={() => { setTool({ kind: "look" }); setSelectedId(null); }}>
            👣 Walk / look
          </button>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Materials (click a surface)</div>
          <div className="flex flex-wrap gap-1.5">
            {MATERIALS.map((m) => (
              <button
                key={m.id}
                title={m.name}
                onClick={() => { setTool({ kind: "paint", material: m.id }); setSelectedId(null); }}
                className={`w-9 h-9 rounded border-2 ${tool.kind === "paint" && tool.material === m.id ? "border-white" : "border-white/20"}`}
                style={{ background: m.color }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Items (click a valid surface)</div>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(ITEMS) as ItemKind[]).map((k) => (
              <button
                key={k}
                className={btn(tool.kind === "place" && tool.item === k)}
                onClick={() => { setTool({ kind: "place", item: k }); setSelectedId(null); }}
              >
                + {ITEMS[k].name} <span className="opacity-50">({ITEMS[k].surface})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- edit-mode banner (camera + walk locked) ---- */}
      {editingItem && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-lg bg-emerald-600/90 backdrop-blur shadow-lg">
          <span className="text-sm font-medium">🔒 Moving {ITEMS[editingItem.kind].name} — drag it to reposition</span>
          <button className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-xs" onClick={rotateActive}>Rotate (R)</button>
          <button className="px-2 py-1 rounded bg-red-500/80 hover:bg-red-500 text-xs" onClick={deleteActive}>Delete (⌫)</button>
          <button className="px-3 py-1 rounded bg-white text-emerald-700 font-semibold text-sm" onClick={save}>Save ✓</button>
        </div>
      )}

      {/* selected (not editing): hint to double-click */}
      {selectedId && !editingId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-xs">
          Selected — <b>double-click</b> the item to move it · R rotate · ⌫ delete
        </div>
      )}

      {/* add/paint mode banner */}
      {!editingId && !selectedId && tool.kind !== "look" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-xs">
          {tool.kind === "place" ? <>Adding <b>{ITEMS[tool.item].name}</b> — click a valid surface</> : <>Painting — click a surface</>} · press <b>Esc</b> to stop
        </div>
      )}

      {/* hint */}
      <div className="absolute bottom-3 left-3 text-xs opacity-70 bg-black/50 rounded px-2 py-1">
        Drag to look · <b>Walk</b>: click floor to walk · click an item to select · <b>double-click</b> an item to move it (locks camera) · <b>Save</b> to finish · <b>Esc</b> to exit add/edit mode
      </div>

      {/* live scene document */}
      <pre className="absolute top-3 right-3 max-h-[80vh] overflow-auto text-[10px] leading-tight bg-black/55 rounded p-2 w-72">
        {JSON.stringify(sceneDoc, null, 2)}
      </pre>
    </div>
  );
}
