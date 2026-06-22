"use client";
import Image from "next/image";
import Link from "next/link";
import { repo } from "@/lib/repository";
import { formatPrice } from "@/lib/format";
import { hasRealValue } from "@/lib/placeholder";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { SaveButton } from "./SaveButton";
import { DownloadMenu } from "./DownloadMenu";
import { useCompare } from "@/state/compare";
import { useAnalytics } from "@/state/analytics";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

function getCategoryName(categoryId: string): string {
  const cat = repo.getCategories().find(c => c.id === categoryId);
  return cat?.name ?? categoryId;
}

function getPowerRange(product: Product): string | null {
  const powers = product.variants
    .map(v => Number(v.attrs?.["power_w"]))
    .filter(n => Number.isFinite(n));
  if (!powers.length) return null;
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  return min === max ? `${min}W` : `${min}–${max}W`;
}

function getIpLabel(product: Product): string | null {
  const v = product.shared_specs?.["ip_rating"];
  const n = typeof v === "number" ? v : parseInt(String(v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? `IP${n}` : null;
}

function getFirstColorTemp(product: Product): string | null {
  const ct = product.shared_specs?.["color_temperature"];
  if (Array.isArray(ct) && ct.length > 0) return String(ct[0]);
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  const commercial = repo.getCommercial();
  const { toggle, has, canAdd } = useCompare();
  const analytics = useAnalytics();
  const t = useT();
  const inCompare = has(product.id);

  const firstRef = product.variants[0]?.ref ?? "";
  const price = formatPrice(commercial.unit_prices[firstRef], commercial.currency);

  const powerRange = getPowerRange(product);
  const ipLabel = getIpLabel(product);
  const colorTemp = getFirstColorTemp(product);

  const variantCount = product.variants.length;

  return (
    <div className="group relative flex flex-col rounded border border-aluminium bg-white transition-shadow hover:shadow-md">
      {/* Clickable area: image + product info */}
      <Link
        href={`/products/${product.id}`}
        onClick={() => analytics.track({ type: "view", ref: product.id })}
        className="flex flex-col"
      >
        {/* Image area */}
        <div className="relative h-48 w-full overflow-hidden rounded-t bg-neutral-fill">
          {product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-fill p-4 text-center text-sm text-aluminium-dark">
              {product.name}
            </div>
          )}
          {/* 3D badge on hover */}
          {hasRealValue(product.model3d) && (
            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Badge>{t("card.view3d")}</Badge>
            </div>
          )}
        </div>

        {/* Card info body */}
        <div className="flex flex-1 flex-col gap-2 p-4 pb-2">
          {/* Category label */}
          <p className="text-xs text-aluminium-dark">{getCategoryName(product.category)}</p>

          {/* Product name */}
          <h3 className="text-sm font-semibold text-ink leading-snug">{product.name}</h3>

          {/* Spec chips */}
          {(powerRange || ipLabel || colorTemp) && (
            <div className="flex flex-wrap gap-1">
              {powerRange && <Chip label={powerRange} />}
              {ipLabel && <Chip label={ipLabel} />}
              {colorTemp && <Chip label={colorTemp} />}
            </div>
          )}

          {/* Ref line */}
          <p className="text-xs text-aluminium-dark">
            {product.ref_prefix}
            {variantCount > 1 ? ` · ${variantCount} ${t("card.references")}` : variantCount === 1 ? ` · ${firstRef}` : ""}
          </p>

          {/* Price */}
          <p className="mt-auto text-sm font-medium text-ink">{price}</p>
        </div>
      </Link>

      {/* Actions row — outside the Link to avoid nested anchors */}
      <div className="flex gap-2 px-4 pb-4">
        <SaveButton productId={product.id} />
        <AnimatedButton
          onClick={() => toggle(product.id)}
          disabled={!inCompare && !canAdd}
          aria-label={inCompare ? t("common.remove") : t("card.compare")}
          className={`rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
            inCompare
              ? "border-brand bg-brand text-white"
              : "border-aluminium text-aluminium-dark hover:border-brand hover:text-brand"
          }`}
        >
          {inCompare ? `✓ ${t("card.compare")}` : `+ ${t("card.compare")}`}
        </AnimatedButton>
        <DownloadMenu product={product} />
      </div>
    </div>
  );
}
