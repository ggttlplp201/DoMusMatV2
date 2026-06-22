"use client";
import { useLists } from "@/state/lists";
import { useT } from "@/state/locale";

export function SaveButton({ productId }: { productId: string }) {
  const { toggle, has } = useLists();
  const t = useT();
  const saved = has(productId);
  return (
    <button
      onClick={(e) => { e.preventDefault(); toggle(productId); }}
      aria-label={saved ? t("card.saved") : t("card.save")}
      className={`rounded border px-2 py-1 text-xs transition-colors ${
        saved
          ? "border-brand bg-brand text-white"
          : "border-aluminium text-aluminium-dark hover:border-brand hover:text-brand"
      }`}
    >
      {saved ? `♥ ${t("card.saved")}` : `♡ ${t("card.save")}`}
    </button>
  );
}
