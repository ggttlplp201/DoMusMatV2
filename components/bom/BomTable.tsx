import type { BomLine } from "@/lib/bom";

export function BomTable({ lines }: { lines: BomLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-neutral-fill text-aluminium-dark">
            <th className="py-2 px-3 text-left font-medium">Referência</th>
            <th className="py-2 px-3 text-left font-medium">Produto</th>
            <th className="py-2 px-3 text-right font-medium">Qtd</th>
            <th className="py-2 px-3 text-left font-medium">Especificações</th>
            <th className="py-2 px-3 text-left font-medium">Conformidade</th>
            <th className="py-2 px-3 text-right font-medium">Preço unitário</th>
            <th className="py-2 px-3 text-right font-medium">Total</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
