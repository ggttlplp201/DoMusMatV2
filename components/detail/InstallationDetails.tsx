import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue, resolvePlaceholder } from "@/lib/placeholder";
import { fallbacks } from "@/lib/strings";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function InstallationDetails({ product }: Props) {
  const installation = product.standardization?.installation;
  if (!installation) return null;

  const instructions = resolvePlaceholder(installation.instructions, fallbacks.installation);
  const hasDoc = hasRealValue(installation.document);
  const mountingNodes = installation.mounting_nodes;

  return (
    <section>
      <SectionLabel>Instalação</SectionLabel>
      <div className="text-sm space-y-3">
        <p className="text-ink leading-relaxed">{instructions as string}</p>

        {hasRealValue(mountingNodes) ? (
          Array.isArray(mountingNodes) ? (
            <ul className="list-disc list-inside text-aluminium-dark space-y-1">
              {(mountingNodes as string[]).map((node, i) => (
                <li key={i}>{node}</li>
              ))}
            </ul>
          ) : (
            <p className="text-aluminium-dark">{String(mountingNodes)}</p>
          )
        ) : (
          <p className="text-aluminium-dark">—</p>
        )}

        {hasDoc && (
          <a
            href={installation.document}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-brand underline"
          >
            Manual de instalação
          </a>
        )}
      </div>
    </section>
  );
}
