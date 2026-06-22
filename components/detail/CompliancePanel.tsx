import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue } from "@/lib/placeholder";
import { fallbacks } from "@/lib/strings";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

const LABELS: Record<string, string> = {
  ce: "CE",
  dop: "DoP",
  euroclass: "Euroclass (fogo)",
  voc: "VOC",
  epd: "EPD",
  acoustic: "Acústica",
  dpp: "DPP",
};

export function CompliancePanel({ product }: Props) {
  const compliance = product.compliance;
  if (!compliance) return null;

  const fields = Object.keys(LABELS) as Array<keyof typeof LABELS>;

  return (
    <section>
      <SectionLabel>Conformidade</SectionLabel>
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
                    Documento
                  </a>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    hasValue
                      ? "bg-green-100 text-green-800"
                      : "bg-neutral-fill text-aluminium-dark"
                  }`}
                >
                  {hasValue ? field.value : fallbacks.compliancePending}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
