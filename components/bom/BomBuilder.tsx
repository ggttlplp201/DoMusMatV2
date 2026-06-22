"use client";
import { useCart } from "@/state/cart";
import { buildBomLines } from "@/lib/bom";
import { BomTable } from "./BomTable";
import { ExportButton } from "./ExportButton";

export function BomBuilder() {
  const { items, remove, clear } = useCart();
  const lines = buildBomLines(items);

  if (items.length === 0) {
    return (
      <p className="text-aluminium-dark py-8 text-center">
        A sua lista de materiais está vazia.
      </p>
    );
  }

  return (
    <div>
      <BomTable lines={lines} />
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-3">
          <ExportButton lines={lines} />
        </div>
        <button
          onClick={clear}
          className="rounded border border-aluminium px-4 py-2 text-sm text-aluminium-dark hover:bg-neutral-fill"
        >
          Limpar
        </button>
      </div>
      <div className="mt-4 space-y-1">
        {items.map((item) => (
          <div key={item.ref} className="flex items-center justify-between text-sm">
            <span className="font-mono text-xs text-aluminium-dark">{item.ref}</span>
            <button
              onClick={() => remove(item.ref)}
              className="text-xs text-aluminium-dark hover:text-ink"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
