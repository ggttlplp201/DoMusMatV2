import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue, resolvePlaceholder } from "@/lib/placeholder";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function SupplyChainTimeline({ product }: Props) {
  const chain = product.supply_chain;
  if (!chain) return null;

  const nodes = chain.delivery_nodes ?? [];

  return (
    <section>
      <SectionLabel>Cadeia de abastecimento</SectionLabel>
      <div className="overflow-x-auto">
        <ol className="flex items-start gap-0 text-sm min-w-max">
          {nodes.map((node, i) => (
            <li key={node.label} className="flex items-center">
              <div className="border border-aluminium rounded p-3 min-w-[100px] text-center">
                <p className="font-medium text-ink text-xs">{node.label}</p>
                <p className="text-aluminium-dark text-xs mt-1">
                  {hasRealValue(node.status) ? node.status : "—"}
                </p>
                <p className="text-aluminium-dark text-xs">
                  {resolvePlaceholder(node.eta, "ETA —") as string}
                </p>
              </div>
              {i < nodes.length - 1 && (
                <span className="px-2 text-aluminium-dark text-sm" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-3 text-sm text-aluminium-dark">
        Stock:{" "}
        <span className="text-ink">
          {resolvePlaceholder(chain.stock, "Sob consulta") as string}
        </span>
      </p>
    </section>
  );
}
