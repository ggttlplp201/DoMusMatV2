"use client";

import type { Variant } from "@/lib/types";

interface VariantSelectorProps {
  variants: Variant[];
  selectedRef: string;
  onSelect: (ref: string) => void;
}

function variantLabel(variant: Variant): string {
  const { attrs } = variant;
  if (attrs.power_w != null) return `${attrs.power_w}W`;
  if (attrs.lumens != null) return `${attrs.lumens} lm`;
  if (attrs.length_mm != null) return `${attrs.length_mm} mm`;
  return variant.ref;
}

export function VariantSelector({ variants, selectedRef, onSelect }: VariantSelectorProps) {
  if (variants.length === 0) return null;

  if (variants.length === 1) {
    const v = variants[0];
    return (
      <div className="flex gap-2 flex-wrap mt-3">
        <span
          className="rounded border border-brand text-brand px-3 py-1.5 text-sm font-medium cursor-default"
        >
          {variantLabel(v)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap mt-3" role="group" aria-label="Variantes">
      {variants.map((v) => {
        const isActive = v.ref === selectedRef;
        return (
          <button
            key={v.ref}
            onClick={() => onSelect(v.ref)}
            aria-pressed={isActive}
            className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-brand text-brand"
                : "border-aluminium text-ink hover:border-aluminium-dark"
            }`}
          >
            {variantLabel(v)}
          </button>
        );
      })}
    </div>
  );
}
