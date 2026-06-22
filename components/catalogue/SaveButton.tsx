"use client";
import { useLists } from "@/state/lists";

export function SaveButton({ productId }: { productId: string }) {
  const { toggle, has } = useLists();
  const saved = has(productId);
  return (
    <button
      onClick={(e) => { e.preventDefault(); toggle(productId); }}
      aria-label={saved ? "Remover dos guardados" : "Guardar produto"}
      className={`rounded border px-2 py-1 text-xs transition-colors ${
        saved
          ? "border-brand bg-brand text-white"
          : "border-aluminium text-aluminium-dark hover:border-brand hover:text-brand"
      }`}
    >
      {saved ? "♥ Guardado" : "♡ Guardar"}
    </button>
  );
}
