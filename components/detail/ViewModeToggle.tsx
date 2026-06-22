"use client";

import { useT } from "@/state/locale";

type ViewMode = "rendered" | "model";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  modelAvailable: boolean;
}

export function ViewModeToggle({ mode, onChange, modelAvailable }: ViewModeToggleProps) {
  const t = useT();
  const baseBtn =
    "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
  const activeBtn = "border-b-2 border-brand text-brand";
  const inactiveBtn = "text-aluminium-dark hover:text-ink";
  const disabledBtn = "text-aluminium-dark opacity-40 cursor-not-allowed";

  return (
    <div role="group" aria-label="Modo de visualização" className="flex border-b border-aluminium mb-4">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "rendered"}
        className={`${baseBtn} ${mode === "rendered" ? activeBtn : inactiveBtn}`}
        onClick={() => onChange("rendered")}
      >
        {t("view.rendered")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "model"}
        disabled={!modelAvailable}
        title={!modelAvailable ? t("fb.bimAsset") : undefined}
        className={`${baseBtn} ${!modelAvailable ? disabledBtn : mode === "model" ? activeBtn : inactiveBtn}`}
        onClick={() => { if (modelAvailable) onChange("model"); }}
      >
        {t("view.model3d")}
        {!modelAvailable && (
          <span className="ml-1 text-xs opacity-70" aria-hidden="true">
            {t("detail.comingSoon")}
          </span>
        )}
      </button>
    </div>
  );
}
