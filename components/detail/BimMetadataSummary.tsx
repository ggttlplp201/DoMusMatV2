"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue, resolvePlaceholder } from "@/lib/placeholder";
import { fallbacks } from "@/lib/strings";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function BimMetadataSummary({ product }: Props) {
  const t = useT();
  const meta = product.bim_metadata;
  if (!meta) return null;

  const rows: { label: string; value: string }[] = [
    { label: "ID do produto", value: String(resolvePlaceholder(meta.product_id, fallbacks.spec)) },
    {
      label: "Dimensões",
      value: meta.dimensions
        ? (() => {
            const real = Object.entries(meta.dimensions).filter(([, v]) => hasRealValue(v));
            return real.length > 0 ? real.map(([k, v]) => `${k}: ${v}`).join(", ") : fallbacks.spec;
          })()
        : fallbacks.spec,
    },
    {
      label: "Materiais",
      value: hasRealValue(meta.materials)
        ? (meta.materials as string[]).filter(hasRealValue).join(", ")
        : fallbacks.spec,
    },
    {
      label: "Propriedades IFC",
      value: meta.ifc_properties
        ? (() => {
            const real = Object.entries(meta.ifc_properties)
              .filter(([, v]) => hasRealValue(v))
              .slice(0, 3);
            return real.length > 0 ? real.map(([k, v]) => `${k}: ${v}`).join("; ") : fallbacks.spec;
          })()
        : fallbacks.spec,
    },
    { label: "Versão", value: String(resolvePlaceholder(meta.version, fallbacks.spec)) },
  ];

  return (
    <section>
      <SectionLabel>{t("bim.metadata")}</SectionLabel>
      <dl className="divide-y divide-aluminium text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[40%_60%] gap-2 py-2">
            <dt className="text-aluminium-dark">{label}</dt>
            <dd className="text-ink truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
