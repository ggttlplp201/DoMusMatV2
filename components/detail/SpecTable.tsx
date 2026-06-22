import type { Product, Variant } from "@/lib/types";
import { formatDimensions } from "@/lib/format";
import { hasRealValue } from "@/lib/placeholder";

// PT label map for known spec keys
const PT_LABELS: Record<string, string> = {
  power_w: "Potência",
  lumens: "Fluxo luminoso",
  length_mm: "Comprimento",
  width_mm: "Largura",
  height_mm: "Altura",
  diameter_mm: "Diâmetro",
  dimensions: "Dimensões",
  voltage: "Tensão",
  color_temperature: "Temperatura de cor",
  cri: "IRC",
  ip_rating: "Proteção",
  beam_angle_deg: "Ângulo de feixe",
  beam_type: "Tipo de feixe",
  material: "Material",
  finish: "Acabamento",
  energy_class: "Classe energética",
  luminous_efficacy: "Eficácia luminosa",
  warranty_years: "Garantia",
  chip: "Chip",
  lifetime_hours: "Vida útil",
  certificates: "Certificações",
};

function label(key: string): string {
  return PT_LABELS[key] ?? key;
}

function formatValue(key: string, value: unknown): string | null {
  if (!hasRealValue(value)) return null;

  if (key === "ip_rating") return `IP${value}`;
  if (key === "beam_angle_deg") return `${value}°`;
  if (key === "power_w") return `${value} W`;
  if (key === "lumens") return `${value} lm`;
  if (key === "diameter_mm") return `Ø ${value} mm`;
  if (key === "warranty_years") return `${value} anos`;
  if (Array.isArray(value)) return value.join(" / ");

  return String(value);
}

interface SpecRow {
  key: string;
  labelText: string;
  value: string;
}

function buildRows(product: Product, variant: Variant): SpecRow[] {
  const rows: SpecRow[] = [];

  // (a) Variant attrs — combine dimensions if all present
  const attrs = variant.attrs;
  const { length_mm, width_mm, height_mm, diameter_mm, power_w, lumens, ...rest } = attrs as Record<string, string | number>;

  // Power
  if (hasRealValue(power_w)) {
    rows.push({ key: "power_w", labelText: label("power_w"), value: `${power_w} W` });
  }

  // Lumens
  if (hasRealValue(lumens)) {
    rows.push({ key: "lumens", labelText: label("lumens"), value: `${lumens} lm` });
  }

  // Dimensions: combined if all three present, otherwise individual
  const hasL = hasRealValue(length_mm);
  const hasW = hasRealValue(width_mm);
  const hasH = hasRealValue(height_mm);
  if (hasL && hasW && hasH) {
    rows.push({
      key: "dimensions",
      labelText: label("dimensions"),
      value: formatDimensions(Number(length_mm), Number(width_mm), Number(height_mm)),
    });
  } else {
    if (hasL) rows.push({ key: "length_mm", labelText: label("length_mm"), value: `${length_mm} mm` });
    if (hasW) rows.push({ key: "width_mm", labelText: label("width_mm"), value: `${width_mm} mm` });
    if (hasH) rows.push({ key: "height_mm", labelText: label("height_mm"), value: `${height_mm} mm` });
  }

  // Diameter
  if (hasRealValue(diameter_mm)) {
    rows.push({ key: "diameter_mm", labelText: label("diameter_mm"), value: `Ø ${diameter_mm} mm` });
  }

  // Remaining variant attrs
  for (const [k, v] of Object.entries(rest)) {
    if (!hasRealValue(v)) continue;
    const formatted = formatValue(k, v);
    if (formatted) rows.push({ key: k, labelText: label(k), value: formatted });
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
    const formatted = formatValue(k, v);
    if (formatted) rows.push({ key: k, labelText: label(k), value: formatted });
  }

  return rows;
}

export function SpecTable({ product, variant }: { product: Product; variant: Variant }) {
  const rows = buildRows(product, variant);

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
