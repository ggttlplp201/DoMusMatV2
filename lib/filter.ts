import type { Product } from "./types";

export interface CatalogueFilters {
  category: string[];
  power: number[];
  ip: number[];
  colorTemp: string[];
  format: string[];
}

function ipOf(p: Product): number | undefined {
  const v = p.shared_specs?.["ip_rating"];
  const n = typeof v === "number" ? v : parseInt(String(v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function powersOf(p: Product): number[] {
  return p.variants.map(v => Number(v.attrs?.["power_w"])).filter(n => Number.isFinite(n));
}

function colorTempsOf(p: Product): string[] {
  const ct = p.shared_specs?.["color_temperature"];
  return Array.isArray(ct) ? ct.map(String) : [];
}

export function filterProducts(products: Product[], f: CatalogueFilters, query: string): Product[] {
  const q = query.trim().toLowerCase();
  return products.filter(p => {
    if (f.category.length && !f.category.includes(p.category)) return false;
    if (f.power.length && !powersOf(p).some(w => f.power.includes(w))) return false;
    if (f.ip.length) { const ip = ipOf(p); if (ip === undefined || !f.ip.includes(ip)) return false; }
    if (f.colorTemp.length && !colorTempsOf(p).some(c => f.colorTemp.includes(c))) return false;
    if ((f.format ?? []).length && !p.bim_assets.some(a => (f.format ?? []).includes(a.format))) return false;
    if (q) {
      const hay = `${p.name} ${p.category} ${p.ref_prefix} ${p.variants.map(v => v.ref).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function facetOptions(products: Product[]) {
  const power = [...new Set(products.flatMap(powersOf))].sort((a, b) => a - b);
  const ip = [...new Set(products.map(ipOf).filter((n): n is number => n !== undefined))].sort((a, b) => a - b);
  const colorTemp = [...new Set(products.flatMap(colorTempsOf))].sort();
  return { power, ip, colorTemp };
}
