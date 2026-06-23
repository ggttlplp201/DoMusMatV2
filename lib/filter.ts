import type { Product } from "./types";
import { repo } from "./repository";

// Fold for lenient matching: lowercase + strip Latin diacritics (so PT "iluminacao"
// matches "Iluminação", "rodape" matches "Rodapé"). CJK is unaffected by NFKD here.
function fold(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

// CJK noun-suffix / filler chars that can be dropped so e.g. "镜子" ≡ "镜", "灯具" ≡ "灯".
const CJK_TRAILING = /[子儿头具]$/;

// Expand a query into equivalent variants for lenient matching.
function queryVariants(q: string): string[] {
  const out = new Set<string>();
  const base = q.trim();
  if (!base) return [];
  out.add(base);
  // strip a trailing CJK filler/suffix char (镜子 -> 镜, 灯具 -> 灯)
  let t = base;
  while (t.length > 1 && CJK_TRAILING.test(t)) {
    t = t.slice(0, -1);
    out.add(t);
  }
  return [...out];
}

// category id -> all localized names (pt/en/zh) joined + folded, for multilingual search
const CATEGORY_SEARCH: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const c of repo.getCategories()) {
    m[c.id] = fold(`${c.name} ${c.name_en ?? ""} ${c.name_zh ?? ""}`);
  }
  return m;
})();

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
  const variants = queryVariants(query).map(fold).filter(Boolean);
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  return products.filter(p => {
    if (f.category.length && !f.category.includes(p.category)) return false;
    if (f.power.length && !powersOf(p).some(w => f.power.includes(w))) return false;
    if (f.ip.length) { const ip = ipOf(p); if (ip === undefined || !f.ip.includes(ip)) return false; }
    if (f.colorTemp.length && !colorTempsOf(p).some(c => f.colorTemp.includes(c))) return false;
    if ((f.format ?? []).length && !p.bim_assets.some(a => (f.format ?? []).includes(a.format))) return false;
    if (variants.length) {
      // Folded haystack across PT/EN/ZH product names + localized category names + refs,
      // so a query in any language matches (e.g. "镜"/"镜子", "mirror", "espelho").
      const hay = fold(`${p.name} ${p.name_en ?? ""} ${p.name_zh ?? ""} ${p.category} ${CATEGORY_SEARCH[p.category] ?? ""} ${p.ref_prefix} ${p.variants.map(v => v.ref).join(" ")}`);
      // match if any query variant is a substring, OR (multi-word) every token is present
      const matched =
        variants.some(v => hay.includes(v)) ||
        (tokens.length > 1 && tokens.every(t => hay.includes(t)));
      if (!matched) return false;
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
