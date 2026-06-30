"use client";

/**
 * ToolRail — the frosted icon rail (Materials / Items / Actions) plus the
 * single flyout panel it expands. One flyout open at a time (store.activeTool);
 * clicking the active icon closes it. Navigate was dropped (walk/look is the
 * only mode). Items rows open the shared ModelPicker via store.openPicker.
 */

import { useMemo } from "react";
import { useConfigurator, type FlyoutTool } from "@/state/configurator";
import { MATERIALS } from "@/lib/configurator/products";
import type { ProductMeta } from "@/lib/configurator/types";
import { C, FONT, BLUR, SHADOW, panel } from "./tokens";
import { SwatchIcon, PlusIcon, SparkleIcon, ChevronIcon, LinkIcon, CubeIcon } from "./icons";

// Items list → picker grouping (Storage merges our cabinet/wardrobe/dresser)
const ITEM_GROUPS = [
  { key: "door", label: "Door", title: "Choose a Door", cats: ["door"], surface: "Floor · fits doorway" },
  { key: "storage", label: "Storage", title: "Choose Storage", cats: ["cabinet", "wardrobe", "dresser"], surface: "Floor" },
  { key: "table", label: "Table", title: "Choose a Table", cats: ["table"], surface: "Floor" },
] as const;

interface Props {
  palette: ProductMeta[];
  onShareSave: () => void;
  photo: { generate: () => void; phase: string; error: string | null };
}

export default function ToolRail({ palette, onShareSave, photo }: Props) {
  const tool = useConfigurator((s) => s.tool);
  const setTool = useConfigurator((s) => s.setTool);
  const activeTool = useConfigurator((s) => s.activeTool);
  const setActiveTool = useConfigurator((s) => s.setActiveTool);
  const openPicker = useConfigurator((s) => s.openPicker);

  const groups = useMemo(
    () => ITEM_GROUPS.map((g) => ({ ...g, options: palette.filter((p) => p.category && g.cats.includes(p.category as never)) }))
      .filter((g) => g.options.length > 0),
    [palette],
  );

  const railBtn = (key: FlyoutTool, label: string, icon: React.ReactNode) => {
    const active = activeTool === key;
    return (
      <button
        key={key} title={label} aria-label={label}
        onClick={() => setActiveTool(key)}
        style={{ width: 42, height: 42, borderRadius: 11, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: active ? C.accentTint : "transparent", color: active ? C.accent : C.textSecondary }}
      >
        {icon}
      </button>
    );
  };

  return (
    <>
      {/* icon rail */}
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 25, display: "flex", flexDirection: "column", gap: 6, padding: 7, borderRadius: 16, ...panel("panel") }}>
        {railBtn("materials", "Materials", <SwatchIcon size={21} />)}
        {railBtn("items", "Add item", <PlusIcon size={22} />)}
        <div style={{ height: 1, background: C.hairline, margin: "2px 4px" }} />
        {railBtn("actions", "Actions", <SparkleIcon size={21} />)}
      </div>

      {/* flyout */}
      {activeTool && (
        <div style={{ position: "absolute", top: 16, left: 74, zIndex: 24, width: 300, padding: 15, borderRadius: 16, animation: "cfgFlyin 0.16s ease", ...panel("flyout") }}>
          {activeTool === "materials" && (
            <>
              <Header eyebrow="Materials" hint="Click a surface" />
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                {MATERIALS.map((m) => {
                  const sel = tool.kind === "paint" && tool.material === m.id;
                  return (
                    <button
                      key={m.id} title={m.name}
                      onClick={() => setTool({ kind: "paint", material: m.id })}
                      style={{
                        width: 36, height: 36, flexShrink: 0, borderRadius: 10, border: `1px solid ${C.hairline}`,
                        backgroundColor: m.color,
                        backgroundImage: m.textures?.color ? `url(${m.textures.color})` : undefined,
                        backgroundSize: "cover", backgroundPosition: "center",
                        cursor: "pointer", boxShadow: sel ? `0 0 0 2px #fff, 0 0 0 4px ${C.accent}` : "none",
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}

          {activeTool === "items" && (
            <>
              <Header eyebrow="Add item" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.length === 0 && <p style={{ fontSize: 12, color: C.textFaint, fontStyle: "italic", margin: 0 }}>No items available</p>}
                {groups.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => openPicker({ title: g.title, refs: g.options.map((p) => p.ref), surfaceLabel: g.surface })}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, border: `1px solid ${C.hairline}`, background: C.rowFill, cursor: "pointer", textAlign: "left", color: C.textPrimary }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: 9, background: C.segTrack, display: "grid", placeItems: "center", color: C.accent, flexShrink: 0 }}><CubeIcon size={19} /></span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 13 }}>{g.label}</span>
                      <span style={{ display: "block", fontWeight: 500, fontSize: 11, color: C.textFaint }}>{g.options.length} option{g.options.length === 1 ? "" : "s"}</span>
                    </span>
                    <ChevronIcon size={16} />
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTool === "actions" && (
            <>
              <Header eyebrow="Actions" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={onShareSave} style={{ ...actionBtn, background: C.accent, color: "#fff", boxShadow: SHADOW.primaryBtn }}>
                  <LinkIcon size={16} /> Save &amp; copy link
                </button>
                <button
                  onClick={photo.generate}
                  disabled={photo.phase === "exporting" || photo.phase === "uploading"}
                  style={{ ...actionBtn, background: "rgba(255,255,255,0.7)", color: C.textPrimary, border: `1px solid ${C.hairline}`, opacity: photo.phase === "exporting" || photo.phase === "uploading" ? 0.5 : 1 }}
                >
                  <SparkleIcon size={16} />
                  {photo.phase === "exporting" ? "Exporting…" : photo.phase === "uploading" ? "Uploading…" : "Photoreal walkthrough"}
                </button>
                {photo.phase === "error" && photo.error && <p style={{ margin: 0, fontSize: 11, color: "#c0463a" }}>{photo.error}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Header({ eyebrow, hint }: { eyebrow: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
      <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>{eyebrow}</span>
      {hint && <span style={{ fontSize: 11, color: C.textFaint }}>{hint}</span>}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
  padding: 11, borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT,
};
