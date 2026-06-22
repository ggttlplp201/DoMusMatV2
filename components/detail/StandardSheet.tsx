"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { resolvePlaceholder } from "@/lib/placeholder";
import { fallbacks } from "@/lib/strings";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function StandardSheet({ product }: Props) {
  const t = useT();
  const s = product.standardization;
  if (!s) return null;

  const rows = [
    { label: t("std.priceRange"), value: resolvePlaceholder(s.price_range, fallbacks.spec) },
    { label: t("std.deliveryPeriod"), value: resolvePlaceholder(s.delivery_period, fallbacks.spec) },
    { label: t("std.maintenance"), value: resolvePlaceholder(s.maintenance_cycle, fallbacks.spec) },
  ];

  return (
    <section>
      <SectionLabel>{t("std.title")}</SectionLabel>
      <dl className="text-sm">
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            className={`grid grid-cols-[45%_55%] gap-2 py-2 ${
              i % 2 === 0 ? "bg-neutral-fill" : ""
            } px-2`}
          >
            <dt className="text-aluminium-dark">{label}</dt>
            <dd className="text-ink">{value as string}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
