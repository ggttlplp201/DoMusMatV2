// Design tokens for the configurator chrome (from the nav redesign handoff).
// Kept as plain constants so panels can match the exact frosted-glass spec with
// inline styles, independent of the app's Tailwind theme.

export const C = {
  accent: "#1f9d76",
  accentHover: "#17855f",
  accentTint: "rgba(31,157,118,0.12)",
  accentBorder: "rgba(31,157,118,0.5)",
  accentHalo: "rgba(31,157,118,0.25)",
  textPrimary: "#1d2530",
  textSecondary: "#5d6675",
  textMuted: "#7a818d",
  textFaint: "#9aa1ac",
  hairline: "rgba(20,28,40,0.10)",
  hairlineLight: "rgba(20,28,40,0.08)",
  segTrack: "rgba(20,28,40,0.05)",
  sun: "#d39528",
  panelFill: "rgba(252,253,252,0.74)",
  flyoutFill: "rgba(252,253,252,0.78)",
  modalFill: "rgba(255,255,255,0.92)",
  scrim: "rgba(22,26,32,0.34)",
  rowFill: "rgba(255,255,255,0.55)",
  rowFillHover: "rgba(255,255,255,0.85)",
} as const;

export const FONT = "var(--font-manrope), ui-sans-serif, system-ui, sans-serif";

export const BLUR = {
  panel: "blur(22px) saturate(140%)",
  flyout: "blur(24px) saturate(150%)",
  modal: "blur(30px) saturate(150%)",
  scrim: "blur(3px)",
} as const;

export const SHADOW = {
  panel: "0 12px 40px rgba(30,35,45,0.18)",
  flyout: "0 18px 50px rgba(30,35,45,0.2)",
  modal: "0 30px 80px rgba(20,24,32,0.42)",
  primaryBtn: "0 8px 18px rgba(31,157,118,0.32)",
  pill: "0 10px 26px rgba(31,157,118,0.45)",
  segActive: "0 1px 2px rgba(0,0,0,.12)",
} as const;

/** common frosted-panel style */
export function panel(kind: "panel" | "flyout"): React.CSSProperties {
  return {
    background: kind === "flyout" ? C.flyoutFill : C.panelFill,
    border: `1px solid rgba(255,255,255,${kind === "flyout" ? 0.62 : 0.6})`,
    backdropFilter: kind === "flyout" ? BLUR.flyout : BLUR.panel,
    WebkitBackdropFilter: kind === "flyout" ? BLUR.flyout : BLUR.panel,
    boxShadow: kind === "flyout" ? SHADOW.flyout : SHADOW.panel,
    fontFamily: FONT,
    color: C.textPrimary,
  };
}
