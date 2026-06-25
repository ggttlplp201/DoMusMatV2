"use client";

import { useEffect, useState } from "react";
import { useConfigurator, type LightType } from "@/state/configurator";
import { MATERIALS } from "@/lib/configurator/products";
import { encodeScene } from "@/lib/configurator/serialize";
import type { RoomShell, ProductMeta } from "@/lib/configurator/types";

interface HudProps {
  room: RoomShell;
  palette: ProductMeta[];
}

export default function Hud({ room, palette }: HudProps) {
  const scene      = useConfigurator((s) => s.scene);
  const tool       = useConfigurator((s) => s.tool);
  const selectedId = useConfigurator((s) => s.selectedId);
  const editingId  = useConfigurator((s) => s.editingId);
  const setTool    = useConfigurator((s) => s.setTool);
  const rotateItem = useConfigurator((s) => s.rotateItem);
  const deleteItem = useConfigurator((s) => s.deleteItem);
  const saveEdit   = useConfigurator((s) => s.saveEdit);
  const escape     = useConfigurator((s) => s.escape);
  const timeOfDay    = useConfigurator((s) => s.timeOfDay);
  const setTimeOfDay = useConfigurator((s) => s.setTimeOfDay);
  const roomLights   = useConfigurator((s) => s.roomLights);
  const setRoomLight = useConfigurator((s) => s.setRoomLight);
  const showLightHelpers    = useConfigurator((s) => s.showLightHelpers);
  const setShowLightHelpers = useConfigurator((s) => s.setShowLightHelpers);
  const [zoneId, setZoneId] = useState(room.lightZones[0]?.id ?? "");
  const zoneCfg = roomLights[zoneId] ?? { type: "none" as LightType, count: 0 };

  // ---- keyboard shortcuts (client-side only, inside useEffect) ---------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeId = editingId ?? selectedId;
      if (e.key === "r" || e.key === "R") {
        if (activeId) rotateItem(activeId, Math.PI / 12);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (activeId) deleteItem(activeId);
      } else if (e.key === "Escape") {
        escape();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedId, rotateItem, deleteItem, escape]);

  // ---- save/share (only touches browser APIs inside handler) -----------------
  const onShareSave = () => {
    const url = `${window.location.pathname}?s=${encodeScene(scene)}`;
    window.history.replaceState(null, "", url);
    navigator.clipboard?.writeText(window.location.origin + url);
  };

  const locked = editingId !== null;
  const editingItem = scene.items.find((i) => i.id === editingId) ?? null;

  // helper: active-button styling (mirrors prototype)
  const btn = (active: boolean) =>
    `px-3 py-1.5 rounded text-sm border transition ${
      active
        ? "bg-white text-black border-white"
        : "bg-black/40 text-white border-white/30 hover:border-white/70"
    }`;

  const fmtTime = (t: number) => {
    const h = Math.floor(t), m = Math.round((t - h) * 60);
    return `${h}:${m === 0 ? "00" : m}`;
  };

  return (
    <>
      {/* ---- top control bar: time of day + per-room lights ---- */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5 rounded-lg bg-black/55 backdrop-blur px-4 py-2">
        <label className="flex items-center gap-2 text-xs">
          <span className="opacity-70">🕑 Time</span>
          <input
            type="range" min={6} max={20} step={0.5} value={timeOfDay}
            onChange={(e) => setTimeOfDay(+e.target.value)}
            className="w-36 accent-amber-300"
          />
          <span className="tabular-nums w-9">{fmtTime(timeOfDay)}</span>
        </label>
        <div className="flex items-center gap-2 text-xs">
          <span className="opacity-70">💡</span>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="max-w-[9rem] rounded border border-white/20 bg-black/40 px-1 py-0.5"
          >
            {room.lightZones.map((z) => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </select>
          {(["none", "ceiling"] as LightType[]).map((t) => (
            <button
              key={t}
              onClick={() => setRoomLight(zoneId, { type: t, count: t === "none" ? 0 : zoneCfg.count || 6 })}
              className={`px-2 py-0.5 rounded ${zoneCfg.type === t ? "bg-white text-black" : "bg-black/40 border border-white/30 hover:border-white/70"}`}
            >
              {t === "none" ? "Off" : "Ceiling"}
            </button>
          ))}
          {zoneCfg.type === "ceiling" && (
            <span className="flex items-center gap-1">
              {[3, 6, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => setRoomLight(zoneId, { type: "ceiling", count: n })}
                  className={`px-1.5 py-0.5 rounded ${zoneCfg.count === n ? "bg-white text-black" : "bg-black/40 border border-white/30"}`}
                >
                  {n}
                </button>
              ))}
            </span>
          )}
          <button
            onClick={() => setShowLightHelpers(!showLightHelpers)}
            title="Show light direction cones"
            className={`px-2 py-0.5 rounded ${showLightHelpers ? "bg-white text-black" : "bg-black/40 border border-white/30 hover:border-white/70"}`}
          >
            Cones
          </button>
        </div>
      </div>

      {/* ---- left tool panel (dimmed / pointer-blocked while editing) ---- */}
      <div
        className={`absolute top-3 left-3 flex flex-col gap-3 p-3 rounded-lg bg-black/55 backdrop-blur w-60 transition ${
          locked ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {/* Navigate */}
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Navigate</div>
          <button
            className={btn(tool.kind === "look")}
            onClick={() => setTool({ kind: "look" })}
          >
            👣 Walk / look
          </button>
        </div>

        {/* Materials */}
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">
            Materials (click a surface)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MATERIALS.map((m) => (
              <button
                key={m.id}
                title={m.name}
                onClick={() => setTool({ kind: "paint", material: m.id })}
                className={`w-9 h-9 rounded border-2 ${
                  tool.kind === "paint" && tool.material === m.id
                    ? "border-white"
                    : "border-white/20"
                }`}
                style={{ background: m.color }}
              />
            ))}
          </div>
        </div>

        {/* Items (palette from cart) */}
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">
            Items (click a valid surface)
          </div>
          {palette.length === 0 ? (
            <p className="text-xs opacity-40 italic">
              No configurable products in cart
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {palette.map((meta) => (
                <button
                  key={meta.ref}
                  className={btn(tool.kind === "place" && tool.ref === meta.ref)}
                  onClick={() => setTool({ kind: "place", ref: meta.ref })}
                >
                  + {meta.name}{" "}
                  <span className="opacity-50">
                    ({meta.allowedSurfaces.join(", ")})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save & copy link */}
        <div className="pt-1 border-t border-white/10">
          <button
            className="w-full px-3 py-1.5 rounded text-sm bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-400/30 transition"
            onClick={onShareSave}
          >
            💾 Save &amp; copy link
          </button>
        </div>
      </div>

      {/* ---- edit-mode banner ---- */}
      {editingItem && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-lg bg-emerald-600/90 backdrop-blur shadow-lg">
          <span className="text-sm font-medium">
            🔒 Moving — drag to reposition
          </span>
          <button
            className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-xs"
            onClick={() => rotateItem(editingId!, Math.PI / 12)}
          >
            Rotate (R)
          </button>
          <button
            className="px-2 py-1 rounded bg-red-500/80 hover:bg-red-500 text-xs"
            onClick={() => deleteItem(editingId!)}
          >
            Delete (⌫)
          </button>
          <button
            className="px-3 py-1 rounded bg-white text-emerald-700 font-semibold text-sm"
            onClick={saveEdit}
          >
            Save ✓
          </button>
        </div>
      )}

      {/* ---- selected (not editing) hint ---- */}
      {selectedId && !editingId && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-xs">
          Selected — <b>double-click</b> the item to move it · R rotate · ⌫ delete
        </div>
      )}

      {/* ---- add / paint-mode banner ---- */}
      {!editingId && !selectedId && tool.kind !== "look" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-xs">
          {tool.kind === "place" ? (
            <>
              Adding — click a valid surface
            </>
          ) : (
            <>Painting — click a surface</>
          )}{" "}
          · press <b>Esc</b> to stop
        </div>
      )}

      {/* ---- bottom hint ---- */}
      <div className="absolute bottom-3 left-3 text-xs opacity-70 bg-black/50 rounded px-2 py-1">
        Drag to look · <b>Walk</b>: click floor to walk · click an item to select ·{" "}
        <b>double-click</b> an item to move it (locks camera) · <b>Save ✓</b> to finish ·{" "}
        <b>Esc</b> to exit add/edit mode
      </div>

      {/* ---- live scene document dump ---- */}
      <pre className="absolute top-3 right-3 max-h-[80vh] overflow-auto text-[10px] leading-tight bg-black/55 rounded p-2 w-72">
        {JSON.stringify(scene, null, 2)}
      </pre>
    </>
  );
}
