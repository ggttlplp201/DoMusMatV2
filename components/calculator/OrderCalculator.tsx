"use client";

import { useState } from "react";
import { useCatalogue } from "@/state/catalogue";
import { calculateOrder } from "@/lib/pricing";
import { formatPrice, formatLeadTime } from "@/lib/format";
import { useT } from "@/state/locale";
import { useCart } from "@/state/cart";
import { useBom } from "@/state/bom";
import { useAnalytics } from "@/state/analytics";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { QuantityStepper } from "./QuantityStepper";
import { TierProgressBar } from "./TierProgressBar";

interface OrderCalculatorProps {
  variantRef: string;
}

export function OrderCalculator({ variantRef }: OrderCalculatorProps) {
  const repo = useCatalogue();
  const commercial = repo.getCommercial();
  const t = useT();
  const [qty, setQty] = useState(1);
  const r = calculateOrder({ ref: variantRef, quantity: qty, commercial });
  const { add: addToCart } = useCart();
  const { add: addToBom } = useBom();
  const analytics = useAnalytics();

  return (
    <div className="sticky top-20 space-y-4 rounded border border-aluminium p-4">
      <SectionLabel>{t("order.title")}</SectionLabel>

      <p className="text-xs text-aluminium-dark font-mono">{variantRef}</p>

      <QuantityStepper value={qty} min={r.minOrderQty} onChange={setQty} />

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-aluminium-dark">{t("order.unitPrice")}</dt>
          <dd className="font-medium text-ink">
            {formatPrice(r.discountedUnitPrice ?? r.unitPrice, commercial.currency, t("fb.price"))}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-aluminium-dark">{t("order.total")}</dt>
          <dd className="font-medium text-ink">
            {r.available ? formatPrice(r.total, commercial.currency, t("fb.price")) : t("fb.price")}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-aluminium-dark">{t("order.leadTime")}</dt>
          <dd className="font-medium text-ink">{formatLeadTime(r.leadTimeDays, t("fb.leadTime"))}</dd>
        </div>
      </dl>

      {r.available && <TierProgressBar result={r} />}

      <div className="flex flex-col gap-2">
        <AnimatedButton
          onClick={() => { addToCart(variantRef, qty); analytics.track({ type: "add_to_quote", ref: variantRef }); }}
          className="w-full rounded bg-brand px-4 py-2 min-h-[44px] text-sm font-medium text-white"
        >
          {t("order.addToQuote")}
        </AnimatedButton>
        <AnimatedButton
          onClick={() => { addToBom(variantRef, qty); analytics.track({ type: "add_to_bom", ref: variantRef }); }}
          className="w-full rounded border border-aluminium px-4 py-2 min-h-[44px] text-sm font-medium text-ink"
        >
          {t("order.addToBom")}
        </AnimatedButton>
        <AnimatedButton
          className="w-full px-4 py-2 text-sm text-aluminium-dark underline"
        >
          {t("order.requestCustom")}
        </AnimatedButton>
      </div>

      <p className="text-xs text-aluminium-dark">{t("order.vatNote")}</p>
    </div>
  );
}
