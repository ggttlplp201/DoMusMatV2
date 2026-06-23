"use client";

import { hasRealValue, resolvePlaceholder } from "@/lib/placeholder";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function BimMetadataSummary({ product }: Props) {
  const t = useT();
  const meta = product.bim_metadata;
  if (!meta) return null;

  const fbSpec = t("fb.spec");
  const rows: { label: string; value: string }[] = [
    { label: t("bim.productId"), value: String(resolvePlaceholder(meta.product_id, fbSpec)) },
    {
      label: t("bim.dimensions"),
      value: meta.dimensions
        ? (() => {
            const real = Object.entries(meta.dimensions).filter(([, v]) => hasRealValue(v));
            return real.length > 0 ? real.map(([k, v]) => `${k}: ${v}`).join(", ") : fbSpec;
          })()
        : fbSpec,
    },
    {
      label: t("bim.materials"),
      value: hasRealValue(meta.materials)
        ? (meta.materials as string[]).filter(hasRealValue).join(", ")
        : fbSpec,
    },
    {
      label: t("bim.ifcProperties"),
      value: meta.ifc_properties
        ? (() => {
            const real = Object.entries(meta.ifc_properties)
              .filter(([, v]) => hasRealValue(v))
              .slice(0, 3);
            return real.length > 0 ? real.map(([k, v]) => `${k}: ${v}`).join("; ") : fbSpec;
          })()
        : fbSpec,
    },
    { label: t("bim.version"), value: String(resolvePlaceholder(meta.version, fbSpec)) },
  ];

  return (
    <div>
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-6 py-3 border-b border-[#EFEEE8]">
          <span className="text-sm text-[#8C8C84]">{label}</span>
          <span className="font-mono text-[13px] text-[#17181C] text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}
