"use client";

import { useT } from "@/state/locale";
import type { BomLine } from "@/lib/bom";

interface BomTableProps {
  lines: BomLine[];
  onRemove?: (ref: string) => void;
}

export function BomTable({ lines, onRemove }: BomTableProps) {
  const t = useT();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-neutral-fill text-aluminium-dark">
            <th className="py-2 px-3 text-left font-medium">{t("bom.col.ref")}</th>
            <th className="py-2 px-3 text-left font-medium">{t("bom.col.product")}</th>
            <th className="py-2 px-3 text-right font-medium">{t("bom.col.qty")}</th>
            <th className="py-2 px-3 text-left font-medium">{t("bom.col.specs")}</th>
            <th className="py-2 px-3 text-left font-medium">{t("bom.col.compliance")}</th>
            <th className="py-2 px-3 text-right font-medium">{t("bom.col.unitPrice")}</th>
            <th className="py-2 px-3 text-right font-medium">{t("bom.col.total")}</th>
            {onRemove && <th className="py-2 px-3 text-right font-medium sr-only">{t("common.remove")}</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr
              key={line.ref}
              className={i % 2 === 0 ? "bg-white" : "bg-neutral-fill"}
            >
              <td className="py-2 px-3 font-mono text-xs text-ink">{line.ref}</td>
              <td className="py-2 px-3 text-ink">{line.name}</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink">{line.quantity}</td>
              <td className="py-2 px-3 text-aluminium-dark">{line.specs || "—"}</td>
              <td className="py-2 px-3 text-aluminium-dark">{line.complianceStatus}</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink">{line.unitPrice}</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink">{line.lineTotal}</td>
              {onRemove && (
                <td className="py-2 px-3 text-right">
                  <button
                    type="button"
                    aria-label={`${t("common.remove")} ${line.ref}`}
                    onClick={() => onRemove(line.ref)}
                    className="text-xs text-aluminium-dark hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
