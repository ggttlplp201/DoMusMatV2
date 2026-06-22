import Image from "next/image";
import { repo } from "@/lib/repository";
import { formatPrice, formatDimensions } from "@/lib/format";
import { hasRealValue } from "@/lib/placeholder";
import { fallbacks } from "@/lib/strings";
import type { Product } from "@/lib/types";

function getPowerRange(product: Product): string {
  const powers = product.variants
    .map((v) => v.attrs.power_w)
    .filter((p) => hasRealValue(p))
    .map(Number);
  if (powers.length === 0) return "—";
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  return min === max ? `${min} W` : `${min}–${max} W`;
}

function getFirstVariantDimensions(product: Product): string {
  const v = product.variants[0];
  if (!v) return "—";
  const { length_mm, width_mm, height_mm } = v.attrs as Record<string, number>;
  if (hasRealValue(length_mm) && hasRealValue(width_mm) && hasRealValue(height_mm)) {
    return formatDimensions(length_mm, width_mm, height_mm);
  }
  return "—";
}

function getFirstVariantPrice(product: Product): string {
  const firstRef = product.variants[0]?.ref;
  if (!firstRef) return "—";
  const commercial = repo.getCommercial();
  return formatPrice(commercial.unit_prices?.[firstRef], commercial.currency);
}

function getConformidade(product: Product): string {
  const ce = product.compliance?.ce;
  return ce && hasRealValue(ce.value) ? ce.value : fallbacks.spec;
}

const ROWS: { key: string; label: string; getValue: (p: Product) => string }[] = [
  {
    key: "category",
    label: "Categoria",
    getValue: (p) => {
      const cats = repo.getCategories();
      return cats.find((c) => c.id === p.category)?.name ?? p.category;
    },
  },
  { key: "power", label: "Potência", getValue: getPowerRange },
  { key: "dimensions", label: "Dimensões", getValue: getFirstVariantDimensions },
  {
    key: "ip",
    label: "IP",
    getValue: (p) => {
      const ip = (p.shared_specs as Record<string, unknown>).ip_rating;
      return hasRealValue(ip) ? `IP${ip}` : fallbacks.spec;
    },
  },
  {
    key: "color_temperature",
    label: "Temp. cor",
    getValue: (p) => {
      const ct = (p.shared_specs as Record<string, unknown>).color_temperature;
      if (!hasRealValue(ct)) return fallbacks.spec;
      return Array.isArray(ct) ? ct.join(" / ") : String(ct);
    },
  },
  {
    key: "material",
    label: "Material",
    getValue: (p) => {
      const mat = (p.shared_specs as Record<string, unknown>).material;
      return hasRealValue(mat) ? String(mat) : fallbacks.spec;
    },
  },
  {
    key: "certificates",
    label: "Certificações",
    getValue: (p) => {
      const certs = (p.shared_specs as Record<string, unknown>).certificates;
      if (!hasRealValue(certs)) return fallbacks.spec;
      return Array.isArray(certs) ? certs.join(", ") : String(certs);
    },
  },
  { key: "price", label: "Preço", getValue: getFirstVariantPrice },
  { key: "conformidade", label: "Conformidade", getValue: getConformidade },
];

interface ComparisonTableProps {
  productIds: string[];
  onRemove?: (id: string) => void;
}

export function ComparisonTable({ productIds, onRemove }: ComparisonTableProps) {
  const products = productIds
    .map((id) => repo.getProduct(id))
    .filter((p): p is Product => p !== undefined);

  if (products.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="py-3 px-3 text-left font-medium text-aluminium-dark w-40">Atributo</th>
            {products.map((p) => (
              <th key={p.id} className="py-3 px-3 text-left font-medium text-ink min-w-[200px]">
                <div className="flex flex-col gap-2">
                  {/* Image */}
                  <div className="relative h-24 w-full overflow-hidden rounded bg-neutral-fill">
                    {p.images && p.images.length > 0 ? (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        className="object-contain"
                        sizes="200px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-aluminium-dark text-xs">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  {/* Name */}
                  <span>{p.name}</span>
                  {/* Remove button */}
                  {onRemove && (
                    <button
                      onClick={() => onRemove(p.id)}
                      className="text-xs text-aluminium-dark hover:text-ink"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.key} className={i % 2 === 0 ? "bg-neutral-fill" : "bg-white"}>
              <td className="py-2 px-3 font-medium text-aluminium-dark">{row.label}</td>
              {products.map((p) => (
                <td key={p.id} className="py-2 px-3 text-ink">
                  {row.getValue(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
