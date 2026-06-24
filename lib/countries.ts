import type { Locale } from "./i18n";

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  pt: string;
  en: string;
  zh: string;
}

// Focused B2B list (Portugal home market, EU, China, and common export targets).
// Extend as needed; the register form renders these in the active locale.
export const COUNTRIES: Country[] = [
  { code: "PT", pt: "Portugal", en: "Portugal", zh: "葡萄牙" },
  { code: "ES", pt: "Espanha", en: "Spain", zh: "西班牙" },
  { code: "FR", pt: "França", en: "France", zh: "法国" },
  { code: "DE", pt: "Alemanha", en: "Germany", zh: "德国" },
  { code: "IT", pt: "Itália", en: "Italy", zh: "意大利" },
  { code: "GB", pt: "Reino Unido", en: "United Kingdom", zh: "英国" },
  { code: "NL", pt: "Países Baixos", en: "Netherlands", zh: "荷兰" },
  { code: "BE", pt: "Bélgica", en: "Belgium", zh: "比利时" },
  { code: "CH", pt: "Suíça", en: "Switzerland", zh: "瑞士" },
  { code: "IE", pt: "Irlanda", en: "Ireland", zh: "爱尔兰" },
  { code: "PL", pt: "Polónia", en: "Poland", zh: "波兰" },
  { code: "SE", pt: "Suécia", en: "Sweden", zh: "瑞典" },
  { code: "NO", pt: "Noruega", en: "Norway", zh: "挪威" },
  { code: "DK", pt: "Dinamarca", en: "Denmark", zh: "丹麦" },
  { code: "AT", pt: "Áustria", en: "Austria", zh: "奥地利" },
  { code: "CN", pt: "China", en: "China", zh: "中国" },
  { code: "HK", pt: "Hong Kong", en: "Hong Kong", zh: "香港" },
  { code: "US", pt: "Estados Unidos", en: "United States", zh: "美国" },
  { code: "BR", pt: "Brasil", en: "Brazil", zh: "巴西" },
  { code: "AE", pt: "Emirados Árabes Unidos", en: "United Arab Emirates", zh: "阿联酋" },
  { code: "AO", pt: "Angola", en: "Angola", zh: "安哥拉" },
  { code: "MZ", pt: "Moçambique", en: "Mozambique", zh: "莫桑比克" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryName(code: string, locale: Locale): string {
  const c = BY_CODE.get(code);
  if (!c) return code;
  return c[locale] ?? c.pt;
}
