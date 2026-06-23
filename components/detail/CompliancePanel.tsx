"use client";

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
    <div>
      {fields.map((key) => {
        const field = compliance[key as keyof typeof compliance];
        if (!field) return null;
        const hasValue = hasRealValue(field.value);
        const hasDoc = hasRealValue(field.document);

        return (
          <div key={key} className="flex items-center justify-between py-3 border-b border-[#EFEEE8]">
            <span className="text-[14.5px] font-medium text-[#17181C]">{LABELS[key]}</span>
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
                className={
                  hasValue
                    ? "flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1F8A5B] bg-[#E8F2EC] rounded-[3px] px-[10px] py-1"
                    : "text-[12.5px] text-[#8C8C84] bg-[#F6F5F0] rounded-[3px] px-[10px] py-1"
                }
              >
                {hasValue ? field.value : t("compliance.pending")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
