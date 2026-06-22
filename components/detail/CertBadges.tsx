import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { hasRealValue } from "@/lib/placeholder";

interface CertBadgesProps {
  product: Product;
}

export function CertBadges({ product }: CertBadgesProps) {
  const specs = product.shared_specs as Record<string, unknown>;
  const badges: string[] = [];

  // Certificates
  const certs = specs.certificates;
  if (hasRealValue(certs) && Array.isArray(certs)) {
    for (const c of certs as string[]) {
      if (hasRealValue(c)) badges.push(c);
    }
  }

  // IP rating
  const ip = specs.ip_rating;
  if (hasRealValue(ip)) {
    badges.push(`IP${ip}`);
  }

  // Energy class
  const energy = specs.energy_class;
  if (hasRealValue(energy)) {
    badges.push(String(energy));
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {badges.map((b) => (
        <Badge key={b}>{b}</Badge>
      ))}
    </div>
  );
}
