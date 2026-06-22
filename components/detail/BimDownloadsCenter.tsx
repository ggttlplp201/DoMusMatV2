"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue } from "@/lib/placeholder";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

function AssetRow({ asset, unavailableLabel }: { asset: Product["bim_assets"][number]; unavailableLabel: string }) {
  if (hasRealValue(asset.file)) {
    return (
      <a
        href={asset.file}
        download
        className="flex items-center gap-2 rounded border border-aluminium p-3 text-sm hover:bg-neutral-fill transition-colors"
      >
        <span className="font-medium text-ink">{asset.label}</span>
        <span className="text-aluminium-dark text-xs">
          {asset.format}
          {hasRealValue(asset.size) ? ` · ${asset.size}` : ""}
        </span>
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded border border-aluminium p-3 text-sm opacity-60 cursor-not-allowed">
      <span className="font-medium text-ink">{asset.label}</span>
      <span className="text-aluminium-dark text-xs">{asset.format}</span>
      <span className="ml-auto text-xs text-aluminium-dark italic">{unavailableLabel}</span>
    </div>
  );
}

export function BimDownloadsCenter({ product }: Props) {
  const t = useT();
  const unavailableLabel = t("fb.bimAsset");
  const primary = product.bim_assets.filter((a) => a.primary);
  const secondary = product.bim_assets.filter((a) => !a.primary);

  return (
    <section>
      <SectionLabel>{t("bim.title")}</SectionLabel>
      {primary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {primary.map((asset) => (
            <AssetRow key={asset.format} asset={asset} unavailableLabel={unavailableLabel} />
          ))}
        </div>
      )}
      {secondary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {secondary.map((asset) => (
            <AssetRow key={asset.format} asset={asset} unavailableLabel={unavailableLabel} />
          ))}
        </div>
      )}
    </section>
  );
}
