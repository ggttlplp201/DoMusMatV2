"use client";
import { useBom } from "@/state/bom";
import { buildBomLines } from "@/lib/bom";
import { BomTable } from "./BomTable";
import { ExportButton } from "./ExportButton";

export function BomBuilder() {
  const { items, remove, clear } = useBom();
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
      <BomTable lines={lines} onRemove={remove} />
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
    </div>
  );
}
