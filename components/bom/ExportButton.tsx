"use client";
import type { BomLine } from "@/lib/bom";
import { toCsv } from "@/lib/bom";
import { useT } from "@/state/locale";

export function ExportButton({ lines }: { lines: BomLine[] }) {
  const t = useT();

  function handleCsv() {
    const csv = toCsv(lines);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "domusmat-bom.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="no-print flex gap-3 mt-4">
      <button
        onClick={handleCsv}
        className="rounded border border-aluminium px-4 py-2 text-sm text-ink hover:bg-neutral-fill"
      >
        {t("bom.exportCsv")}
      </button>
      <button
        onClick={handlePrint}
        className="rounded border border-aluminium px-4 py-2 text-sm text-ink hover:bg-neutral-fill"
      >
        {t("bom.print")}
      </button>
    </div>
  );
}
