import { SectionLabel } from "@/components/ui/SectionLabel";
import { resolvePlaceholder } from "@/lib/placeholder";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function BimMetadataSummary({ product }: Props) {
  const meta = product.bim_metadata;
  if (!meta) return null;

  const rows: { label: string; value: string }[] = [
    { label: "ID do produto", value: String(resolvePlaceholder(meta.product_id, "—")) },
    {
      label: "Dimensões",
      value: meta.dimensions
        ? Object.entries(meta.dimensions)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "—",
    },
    {
      label: "Materiais",
      value:
        Array.isArray(meta.materials) && meta.materials.length > 0
          ? meta.materials.join(", ")
          : "—",
    },
    {
      label: "Propriedades IFC",
      value: meta.ifc_properties
        ? Object.entries(meta.ifc_properties)
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ")
        : "—",
    },
    { label: "Versão", value: String(resolvePlaceholder(meta.version, "—")) },
  ];

  return (
    <section>
      <SectionLabel>Metadados BIM</SectionLabel>
      <dl className="divide-y divide-aluminium text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[40%_60%] gap-2 py-2">
            <dt className="text-aluminium-dark">{label}</dt>
            <dd className="text-ink truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
