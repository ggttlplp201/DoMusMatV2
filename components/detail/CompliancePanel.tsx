"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue } from "@/lib/placeholder";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function CompliancePanel({ product }: Props) {
  const t = useT();
  const compliance = product.compliance;
  if (!compliance) return null;

  const LABELS: Record<string, string> = {
    ce: "CE",
    dop: "DoP",
    euroclass: t("compliance.euroclass"),
    voc: "VOC",
    epd: "EPD",
    acoustic: t("compliance.acoustic"),
    dpp: "DPP",
  };

  const fields = Object.keys(LABELS) as Array<keyof typeof LABELS>;

  return (
    <section>
      <SectionLabel>{t("compliance.title")}</SectionLabel>
      <ul className="divide-y divide-aluminium text-sm">
        {fields.map((key) => {
          const field = compliance[key as keyof typeof compliance];
          if (!field) return null;
          const hasValue = hasRealValue(field.value);
          const hasDoc = hasRealValue(field.document);

          return (
            <li key={key} className="flex items-center justify-between gap-4 py-2">
              <span className="text-ink font-medium">{LABELS[key]}</span>
              <div className="flex items-center gap-2 ml-auto">
                {hasDoc && (
                  <a
                    href={field.document}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand underline"
                  >
                    {t("compliance.document")}
                  </a>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    hasValue
                      ? "bg-green-100 text-green-800"
                      : "bg-neutral-fill text-aluminium-dark"
                  }`}
                >
                  {hasValue ? field.value : t("compliance.pending")}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
