"use client";

import { useEffect } from "react";
import { useConfigurator } from "@/state/configurator";
import { encodeScene } from "@/lib/configurator/serialize";
import type { RoomShell, ProductMeta } from "@/lib/configurator/types";
import { useGeneratePhotoreal } from "@/lib/configurator/useGeneratePhotoreal";
import Minimap from "./Minimap";
import ToolRail from "./chrome/ToolRail";
import TopBar from "./chrome/TopBar";

interface HudProps {
  room: RoomShell;
  palette: ProductMeta[];
}

export default function Hud({ room, palette }: HudProps) {
  const scene      = useConfigurator((s) => s.scene);
  const tool       = useConfigurator((s) => s.tool);
  const selectedId = useConfigurator((s) => s.selectedId);
  const editingId  = useConfigurator((s) => s.editingId);
  const rotateItem = useConfigurator((s) => s.rotateItem);
  const deleteItem = useConfigurator((s) => s.deleteItem);
  const saveEdit   = useConfigurator((s) => s.saveEdit);
  const escape     = useConfigurator((s) => s.escape);
  const photo = useGeneratePhotoreal(room);

  // ---- keyboard shortcuts ----------------------------------------------------
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

  // ---- save/share ------------------------------------------------------------
  const onShareSave = () => {
    const url = `${window.location.pathname}?s=${encodeScene(scene)}`;
    window.history.replaceState(null, "", url);
    navigator.clipboard?.writeText(window.location.origin + url);
  };

  const rendering = photo.phase === "exporting" || photo.phase === "uploading";
  const editingItem = scene.items.find((i) => i.id === editingId) ?? null;

  return (
    <>
      {/* ---- full-screen rendering overlay (blocks all interaction) ---- */}
      {rendering && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-neutral-950/95 backdrop-blur-md">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
          <div className="text-center">
            <p className="text-sm font-medium tracking-wide text-white">Rendering your 360° walkthrough</p>
            <p className="mt-1 text-xs text-white/60">{photo.note || "Preparing…"}</p>
          </div>
          <p className="mt-1 max-w-xs text-center text-[11px] leading-relaxed text-white/40">
            Capturing day and night panoramas — this can take a moment. Please keep this tab open.
          </p>
        </div>
      )}

      {/* ---- redesigned chrome ---- */}
      <ToolRail palette={palette} onShareSave={onShareSave} photo={{ generate: photo.generate, phase: photo.phase, error: photo.error }} />
      <TopBar room={room} />
      <Minimap room={room} />

      {/* ---- edit-mode banner ---- */}
      {editingItem && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-lg bg-emerald-600/90 backdrop-blur shadow-lg text-white">
          <span className="text-sm font-medium">Moving — drag to reposition</span>
          <button className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-xs" onClick={() => rotateItem(editingId!, Math.PI / 12)}>Rotate (R)</button>
          <button className="px-2 py-1 rounded bg-red-500/80 hover:bg-red-500 text-xs" onClick={() => deleteItem(editingId!)}>Delete</button>
          <button className="px-3 py-1 rounded bg-white text-emerald-700 font-semibold text-sm" onClick={saveEdit}>Save</button>
        </div>
      )}

      {/* ---- selected (not editing) hint ---- */}
      {selectedId && !editingId && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-xs text-white">
          Selected — <b>double-click</b> the item to move it · R to rotate · Del to delete
        </div>
      )}

      {/* ---- add / paint-mode banner ---- */}
      {!editingId && !selectedId && tool.kind !== "look" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-xs text-white">
          {tool.kind === "place" ? <>Adding — click a valid surface</> : <>Painting — click a surface</>}{" "}
          · press <b>Esc</b> to stop
        </div>
      )}

      {/* ---- bottom hint ---- */}
      <div className="absolute bottom-3 left-3 text-xs text-white/70 bg-black/50 rounded px-2 py-1">
        Drag to look · <b>Walk</b>: click floor to walk · click an item to select ·{" "}
        <b>double-click</b> an item to move it (locks camera) · <b>Esc</b> to exit add/edit mode
      </div>
    </>
  );
}
