"use client";

import type { Product, Variant } from "@/lib/types";
import { formatDimensions } from "@/lib/format";
import { hasRealValue } from "@/lib/placeholder";
import { useT, useLocale } from "@/state/locale";
import { localizeSpecValue, type Locale } from "@/lib/i18n";

// Maps spec data keys to i18n message keys
const SPEC_KEY_MAP: Record<string, string> = {
  power_w: "spec.power",
  lumens: "spec.lumens",
  dimensions: "spec.dimensions",
  voltage: "spec.voltage",
  color_temperature: "spec.colorTemp",
  cri: "spec.cri",
  ip_rating: "spec.ip",
  beam_angle_deg: "spec.beamAngle",
  beam_type: "spec.beamType",
  material: "spec.material",
  finish: "spec.finish",
  energy_class: "spec.energyClass",
  luminous_efficacy: "spec.efficacy",
  warranty_years: "spec.warranty",
  certificates: "spec.certificates",
  length_mm: "spec.length",
  width_mm: "spec.width",
  height_mm: "spec.height",
  diameter_mm: "spec.diameter",
  chip: "spec.chip",
  lifetime_hours: "spec.lifetime",
};

// Keys whose values should be localized (material / finish / beam_type)
const LOCALIZE_VALUE_KEYS = new Set(["material", "finish", "beam_type"]);

function formatValue(key: string, value: unknown, yearUnit: string): string | null {
  if (!hasRealValue(value)) return null;

  if (key === "ip_rating") return `IP${value}`;
  if (key === "beam_angle_deg") return `${value}°`;
  if (key === "power_w") return `${value} W`;
  if (key === "lumens") return `${value} lm`;
  if (key === "diameter_mm") return `Ø ${value} mm`;
  if (key === "warranty_years") return `${value} ${yearUnit}`;
  if (Array.isArray(value)) return value.join(" / ");

  return String(value);
}

interface SpecRow {
  key: string;
  labelText: string;
  value: string;
}

function buildRows(
  product: Product,
  variant: Variant,
  t: (key: string) => string,
  locale: Locale
): SpecRow[] {
  const rows: SpecRow[] = [];
  const yearUnit = t("unit.years");

  const getLabel = (key: string): string => {
    if (SPEC_KEY_MAP[key]) return t(SPEC_KEY_MAP[key]);
    return key;
  };

  const maybeLocalize = (key: string, raw: unknown): string => {
    if (LOCALIZE_VALUE_KEYS.has(key)) return localizeSpecValue(raw, locale);
    const formatted = formatValue(key, raw, yearUnit);
    return formatted ?? String(raw);
  };

  // (a) Variant attrs — combine dimensions if all present
  const attrs = variant.attrs;
  const { length_mm, width_mm, height_mm, diameter_mm, power_w, lumens, ...rest } = attrs as Record<string, string | number>;

  // Power
  if (hasRealValue(power_w)) {
    rows.push({ key: "power_w", labelText: getLabel("power_w"), value: `${power_w} W` });
  }

  // Lumens
  if (hasRealValue(lumens)) {
    rows.push({ key: "lumens", labelText: getLabel("lumens"), value: `${lumens} lm` });
  }

  // Dimensions: combined if all three present, otherwise individual
  const hasL = hasRealValue(length_mm);
  const hasW = hasRealValue(width_mm);
  const hasH = hasRealValue(height_mm);
  if (hasL && hasW && hasH) {
    rows.push({
      key: "dimensions",
      labelText: getLabel("dimensions"),
      value: formatDimensions(Number(length_mm), Number(width_mm), Number(height_mm)),
    });
  } else {
    if (hasL) rows.push({ key: "length_mm", labelText: getLabel("length_mm"), value: `${length_mm} mm` });
    if (hasW) rows.push({ key: "width_mm", labelText: getLabel("width_mm"), value: `${width_mm} mm` });
    if (hasH) rows.push({ key: "height_mm", labelText: getLabel("height_mm"), value: `${height_mm} mm` });
  }

  // Diameter
  if (hasRealValue(diameter_mm)) {
    rows.push({ key: "diameter_mm", labelText: getLabel("diameter_mm"), value: `Ø ${diameter_mm} mm` });
  }

  // Remaining variant attrs
  for (const [k, v] of Object.entries(rest)) {
    if (!hasRealValue(v)) continue;
    const value = maybeLocalize(k, v);
    rows.push({ key: k, labelText: getLabel(k), value });
  }

  // (b) shared_specs
  const shared = product.shared_specs as Record<string, unknown>;
  const sharedOrder = [
    "voltage",
    "color_temperature",
    "cri",
    "ip_rating",
    "beam_angle_deg",
    "beam_type",
    "material",
    "finish",
    "energy_class",
    "luminous_efficacy",
    "warranty_years",
    "chip",
    "lifetime_hours",
    "certificates",
  ];

  // Keys not in ordered list go last
  const sharedKeys = [
    ...sharedOrder.filter((k) => k in shared),
    ...Object.keys(shared).filter((k) => !sharedOrder.includes(k)),
  ];

  for (const k of sharedKeys) {
    const v = shared[k];
    if (!hasRealValue(v)) continue;
    const value = maybeLocalize(k, v);
    rows.push({ key: k, labelText: getLabel(k), value });
  }

  return rows;
}

export function SpecTable({ product, variant }: { product: Product; variant: Variant }) {
  const t = useT();
  const { locale } = useLocale();
  const rows = buildRows(product, variant, t, locale);

  if (rows.length === 0) return null;

  return (
    <div className="mt-8">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={i % 2 === 0 ? "bg-neutral-fill" : "bg-white"}
            >
              <td className="py-2 px-3 text-aluminium-dark font-medium w-1/2">
                {row.labelText}
              </td>
              <td className="py-2 px-3 text-ink tabular">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
