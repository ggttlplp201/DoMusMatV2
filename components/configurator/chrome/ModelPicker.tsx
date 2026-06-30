"use client";

/**
 * ModelPicker — the shared "Choose a …" modal (two panes: option list + live
 * rotatable preview). Driven by the store's `picker` target:
 *  - slotId set  → "Place in room" fills that preset slot
 *  - slotId unset → "Place in room" arms the place tool (then click a surface)
 */

import { useEffect, useState } from "react";
import { useConfigurator } from "@/state/configurator";
import { CONFIGURABLE_PRODUCTS } from "@/lib/configurator/products";
import { C, FONT, BLUR, SHADOW } from "./tokens";
import { CloseIcon, CubeIcon } from "./icons";
import ModelPreview from "./ModelPreview";

export default function ModelPicker() {
  const picker = useConfigurator((s) => s.picker);
  const closePicker = useConfigurator((s) => s.closePicker);
  const assignSlot = useConfigurator((s) => s.assignSlot);
  const clearSlot = useConfigurator((s) => s.clearSlot);
  const setTool = useConfigurator((s) => s.setTool);
  const slots = useConfigurator((s) => s.scene.slots);
  const [idx, setIdx] = useState(0);

  // when a new picker opens, preselect the slot's current product (or the first)
  useEffect(() => {
    if (!picker) return;
    const current = picker.slotId ? slots?.[picker.slotId] : undefined;
    const found = current ? picker.refs.indexOf(current) : -1;
    setIdx(found >= 0 ? found : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker]);

  if (!picker) return null;
  const metas = picker.refs.map((r) => CONFIGURABLE_PRODUCTS[r]).filter(Boolean);
  const meta = metas[idx] ?? metas[0];
  if (!meta) return null;

  const filled = picker.slotId ? !!slots?.[picker.slotId] : false;
  const place = () => {
    if (picker.slotId) assignSlot(picker.slotId, meta.ref);
    else setTool({ kind: "place", ref: meta.ref });
    closePicker();
  };
  const remove = () => { if (picker.slotId) clearSlot(picker.slotId); closePicker(); };

  return (
    <div
      onClick={closePicker}
      style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: C.scrim, backdropFilter: BLUR.scrim, WebkitBackdropFilter: BLUR.scrim, fontFamily: FONT }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 600, maxWidth: "92%", borderRadius: 20, background: C.modalFill, border: "1px solid rgba(255,255,255,0.7)", backdropFilter: BLUR.modal, WebkitBackdropFilter: BLUR.modal, boxShadow: SHADOW.modal, color: C.textPrimary, animation: "cfgPop 0.18s ease" }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>{picker.title}</div>
          <button onClick={closePicker} aria-label="Close" style={iconBtn}><CloseIcon size={16} /></button>
        </div>

        {/* body */}
        <div style={{ display: "flex", padding: "0 18px" }}>
          {/* left option list */}
          <div style={{ width: 208, borderRight: `1px solid ${C.hairline}`, maxHeight: 288, overflow: "auto", paddingRight: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {metas.map((m, i) => {
              const sel = i === idx;
              return (
                <button
                  key={m.ref}
                  onClick={() => setIdx(i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 10, textAlign: "left", cursor: "pointer", background: sel ? C.accentTint : C.rowFill, border: `1px solid ${sel ? C.accent : C.hairline}`, color: C.textPrimary }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: 7, background: C.segTrack, display: "grid", placeItems: "center", color: C.accent, flexShrink: 0 }}><CubeIcon size={17} /></span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                </button>
              );
            })}
          </div>

          {/* right preview */}
          <div style={{ flex: 1, paddingLeft: 18 }}>
            <div style={{ borderRadius: 14, background: "radial-gradient(120% 90% at 50% 22%, #ffffff, #edefed 72%)", minHeight: 196, height: 196, position: "relative", overflow: "hidden" }}>
              <ModelPreview meta={meta} />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{meta.name}</div>
              <div style={{ fontWeight: 500, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{picker.surfaceLabel ?? "Floor"}</div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center", padding: "14px 18px 16px" }}>
          {filled && (
            <button onClick={remove} style={{ background: "none", border: "none", fontWeight: 600, fontSize: 13, color: "#c0463a", cursor: "pointer", marginRight: "auto" }}>Remove</button>
          )}
          <button onClick={closePicker} style={{ background: "none", border: "none", fontWeight: 600, fontSize: 13, color: C.textSecondary, cursor: "pointer" }}>Cancel</button>
          <button onClick={place} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 13, padding: "10px 16px", cursor: "pointer", boxShadow: SHADOW.primaryBtn }}>Place in room</button>
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, background: "rgba(20,28,40,0.06)", border: "none",
  color: C.textSecondary, display: "grid", placeItems: "center", cursor: "pointer",
};
