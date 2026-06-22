"use client";

import { useState } from "react";
import { repo } from "@/lib/repository";
import { calculateOrder } from "@/lib/pricing";
import { formatPrice, formatLeadTime } from "@/lib/format";
import { t } from "@/lib/strings";
import { useCart } from "@/state/cart";
import { useAnalytics } from "@/state/analytics";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { QuantityStepper } from "./QuantityStepper";
import { TierProgressBar } from "./TierProgressBar";

interface OrderCalculatorProps {
  variantRef: string;
}

export function OrderCalculator({ variantRef }: OrderCalculatorProps) {
  const commercial = repo.getCommercial();
  const [qty, setQty] = useState(1);
  const r = calculateOrder({ ref: variantRef, quantity: qty, commercial });
  const { add } = useCart();
  const analytics = useAnalytics();

  return (
    <div className="sticky top-20 space-y-4 rounded border border-aluminium p-4">
      <SectionLabel>Orçamento / Encomenda</SectionLabel>

      <p className="text-xs text-aluminium-dark font-mono">{variantRef}</p>

      <QuantityStepper value={qty} min={r.minOrderQty} onChange={setQty} />

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-aluminium-dark">Preço unitário</dt>
          <dd className="font-medium text-ink">
            {formatPrice(r.discountedUnitPrice ?? r.unitPrice, commercial.currency)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-aluminium-dark">Total</dt>
          <dd className="font-medium text-ink">
            {r.available ? formatPrice(r.total, commercial.currency) : t.priceOnRequest}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-aluminium-dark">Prazo de entrega</dt>
          <dd className="font-medium text-ink">{formatLeadTime(r.leadTimeDays)}</dd>
        </div>
      </dl>

      {r.available && <TierProgressBar result={r} />}

      <div className="flex flex-col gap-2">
        <AnimatedButton
          onClick={() => { add(variantRef, qty); analytics.track({ type: "add_to_quote", ref: variantRef }); }}
          className="w-full rounded bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          {t.addToQuote}
        </AnimatedButton>
        <AnimatedButton
          onClick={() => { add(variantRef, qty); analytics.track({ type: "add_to_bom", ref: variantRef }); }}
          className="w-full rounded border border-aluminium px-4 py-2 text-sm font-medium text-ink"
        >
          {t.addToBom}
        </AnimatedButton>
        <AnimatedButton
          className="w-full px-4 py-2 text-sm text-aluminium-dark underline"
        >
          {t.requestCustomPricing}
        </AnimatedButton>
      </div>

      <p className="text-xs text-aluminium-dark">{t.vatNote}</p>
    </div>
  );
}
