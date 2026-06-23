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
  color_temperature: "spec.color_temperature",
  cri: "spec.cri",
  ip_rating: "spec.ip_rating",
  beam_angle_deg: "spec.beam_angle_deg",
  beam_type: "spec.beam_type",
  beam_angles: "spec.beam_angles",
  material: "spec.material",
  finish: "spec.finish",
  energy_class: "spec.energy_class",
  luminous_efficacy: "spec.luminous_efficacy",
  warranty_years: "spec.warranty_years",
  certificates: "spec.certificates",
  length_mm: "spec.length",
  width_mm: "spec.width",
  height_mm: "spec.height",
  diameter_mm: "spec.diameter",
  chip: "spec.chip",
  lifetime_hours: "spec.lifetime_hours",
  // All shared_specs keys
  acoustic_dB: "spec.acoustic_dB",
  acoustic_underlay_mm: "spec.acoustic_underlay_mm",
  adhesive: "spec.adhesive",
  air_class: "spec.air_class",
  anti_fog: "spec.anti_fog",
  base_module_mm: "spec.base_module_mm",
  body: "spec.body",
  certification: "spec.certification",
  color: "spec.color",
  colour: "spec.colour",
  colours: "spec.colours",
  connection: "spec.connection",
  construction: "spec.construction",
  depth_mm: "spec.depth_mm",
  detail: "spec.detail",
  door_height_mm: "spec.door_height_mm",
  door_thickness_mm: "spec.door_thickness_mm",
  door_width_mm: "spec.door_width_mm",
  fire_resistance: "spec.fire_resistance",
  frame: "spec.frame",
  glazing: "spec.glazing",
  hinges: "spec.hinges",
  includes: "spec.includes",
  insulation: "spec.insulation",
  lamela_thickness_mm: "spec.lamela_thickness_mm",
  leaf_thickness_mm: "spec.leaf_thickness_mm",
  load_class: "spec.load_class",
  material_doors: "spec.material_doors",
  material_structure: "spec.material_structure",
  max_height_mm: "spec.max_height_mm",
  max_width_mm: "spec.max_width_mm",
  min_wall_mm: "spec.min_wall_mm",
  nominal_height_mm: "spec.nominal_height_mm",
  nominal_width_mm: "spec.nominal_width_mm",
  operating_temp: "spec.operating_temp",
  option: "spec.option",
  power_density: "spec.power_density",
  profile: "spec.profile",
  security_class: "spec.security_class",
  species: "spec.species",
  standards: "spec.standards",
  surface: "spec.surface",
  system: "spec.system",
  thermal_u_value: "spec.thermal_u_value",
  thickness_mm: "spec.thickness_mm",
  tolerance_height_mm: "spec.tolerance_height_mm",
  tolerance_length_mm: "spec.tolerance_length_mm",
  tolerance_thickness_mm: "spec.tolerance_thickness_mm",
  total_thickness_mm: "spec.total_thickness_mm",
  type: "spec.type",
  use: "spec.use",
  water_class: "spec.water_class",
  wind_class: "spec.wind_class",
};

/** Last-resort humanize: replace underscores with spaces and capitalize first letter */
function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// All string spec values should be localized
const SKIP_LOCALIZE_VALUE_KEYS = new Set(["ip_rating", "beam_angle_deg", "power_w", "lumens", "diameter_mm", "warranty_years"]);

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
    // Check if there's a spec.<key> i18n key
    const specKey = `spec.${key}`;
    const translated = t(specKey);
    if (translated !== specKey) return translated;
    // Last resort: humanize the snake_case key
    return humanizeKey(key);
  };

  const maybeLocalize = (key: string, raw: unknown): string => {
    // Localize booleans as "Sim"/"Não" → localizeSpecValue handles the mapping
    if (typeof raw === "boolean") {
      return localizeSpecValue(raw ? "Sim" : "Não", locale);
    }
    // Always try to localize string values unless it's a pure numeric/code format key
    if (!SKIP_LOCALIZE_VALUE_KEYS.has(key) && typeof raw === "string") {
      return localizeSpecValue(raw, locale);
    }
    if (Array.isArray(raw)) {
      return localizeSpecValue(raw, locale);
    }
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
    <div className="mt-8 overflow-x-auto">
      <table className="w-full min-w-0 text-sm border-collapse">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={i % 2 === 0 ? "bg-neutral-fill" : "bg-white"}
            >
              <td className="py-[13px] px-4 text-aluminium-dark font-medium w-1/2">
                {row.labelText}
              </td>
              <td className="py-[13px] px-4 text-ink tabular text-right">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
