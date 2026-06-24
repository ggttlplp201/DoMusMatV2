"use client";
import { useBom } from "@/state/bom";
import { buildBomLines } from "@/lib/bom";
import { useT, useLocale } from "@/state/locale";
import { useSubmitOrder } from "@/state/useSubmitOrder";
import { BomTable } from "./BomTable";
import { ExportButton } from "./ExportButton";

export function BomBuilder() {
  const { items, remove, clear } = useBom();
  const t = useT();
  const { locale } = useLocale();
  const lines = buildBomLines(items, { locale, priceFallback: t("fb.price") });
  const { submit, busy, error: submitError, orderId } = useSubmitOrder("bom", "/materiais");

  async function handleSubmit() {
    const id = await submit(items);
    if (id) clear();
  }

  if (items.length === 0) {
    if (orderId) {
      return (
        <div className="mt-4 rounded border border-aluminium bg-neutral-fill px-4 py-3 text-sm">
          <p className="font-medium text-ink">{t("order.submittedTitle")}</p>
          <p className="text-aluminium-dark">{t("order.submittedBody")}</p>
          <p className="mt-2 text-aluminium-dark">
            {t("order.orderRef")}: <span className="font-mono">{orderId}</span>
          </p>
        </div>
      );
    }
    return (
      <p className="text-aluminium-dark py-8 text-center">
        {t("bom.empty")}
      </p>
    );
  }

  return (
    <div>
      <BomTable lines={lines} onRemove={remove} />
      {orderId && (
        <div className="mt-4 rounded border border-aluminium bg-neutral-fill px-4 py-3 text-sm">
          <p className="font-medium text-ink">{t("order.submittedTitle")}</p>
          <p className="text-aluminium-dark">{t("order.submittedBody")}</p>
          <p className="mt-2 text-aluminium-dark">
            {t("order.orderRef")}: <span className="font-mono">{orderId}</span>
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <ExportButton lines={lines} />
        </div>
        <div className="flex flex-col items-end gap-1">
          {submitError && (
            <p className="text-xs text-brand">{t("order.submitError")}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={clear}
              className="rounded border border-aluminium px-4 py-2 min-h-[44px] text-sm text-aluminium-dark hover:bg-neutral-fill"
            >
              {t("common.clear")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="rounded bg-brand px-6 py-2 min-h-[44px] text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? t("order.submitting") : t("order.submitRequest")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
