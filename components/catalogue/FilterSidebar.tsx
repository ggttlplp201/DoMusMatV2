"use client";
import { repo } from "@/lib/repository";
import { facetOptions } from "@/lib/filter";
import type { CatalogueFilters } from "@/lib/filter";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";

interface FilterSidebarProps {
  filters: CatalogueFilters;
  onChange: (filters: CatalogueFilters) => void;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

const FORMAT_CHIPS = ["IFC", "RFA", "DWG", "SKP", "PDF"];

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const t = useT();
  const { locale } = useLocale();
  const categories = repo.getCategories();
  const allProducts = repo.getProducts();
  const { power, ip, colorTemp } = facetOptions(allProducts);

  // Count products per category (based on current unfiltered set for sidebar counts)
  const categoryCounts: Record<string, number> = {};
  allProducts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  });

  const EMPTY: CatalogueFilters = { category: [], power: [], ip: [], colorTemp: [], format: [] };
  const hasAnyFilter =
    filters.category.length > 0 ||
    filters.power.length > 0 ||
    filters.ip.length > 0 ||
    filters.colorTemp.length > 0 ||
    filters.format.length > 0;

  return (
    <aside className="border-r border-[#E6E5DE] pt-[34px] px-[28px] pb-[80px] sticky top-[128px] self-start">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-[26px]">
        <h2 className="text-lg font-semibold text-[#17181C]">{t("cat.filters")}</h2>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => onChange(EMPTY)}
            className="text-[12.5px] text-[#DA1E28] cursor-pointer hover:underline"
          >
            {t("cat.clear")}
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8C8C84] mb-[14px]">
          {t("facet.category")}
        </p>
        <ul className="space-y-0">
          {categories.map(cat => {
            const count = categoryCounts[cat.id] ?? 0;
            const checked = filters.category.includes(cat.id);
            return (
              <li key={cat.id}>
                <label className="flex items-center gap-[10px] py-[6px] cursor-pointer text-[14.5px] text-[#3A3B40]">
                  <span
                    className={`w-4 h-4 border-[1.5px] rounded-[3px] flex-none flex items-center justify-center transition-colors ${
                      checked
                        ? "border-[#17181C] bg-[#17181C]"
                        : "border-[#C9C8C0] bg-white"
                    }`}
                    onClick={() => onChange({ ...filters, category: toggleItem(filters.category, cat.id) })}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === " " || e.key === "Enter") onChange({ ...filters, category: toggleItem(filters.category, cat.id) }); }}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">{localizedName(cat, locale)}</span>
                  <span className="font-mono text-[12px] text-[#B4B4AC]">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* File Format */}
      <div className="mt-6 pt-6 border-t border-[#EFEEE8]">
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8C8C84] mb-[14px]">
          {t("facet.format")}
        </p>
        <div className="flex flex-wrap gap-[7px]">
          {FORMAT_CHIPS.map(fmt => {
            const active = filters.format.includes(fmt);
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => onChange({ ...filters, format: toggleItem(filters.format, fmt) })}
                className={`font-mono text-xs border rounded px-2 py-0.5 transition-colors cursor-pointer ${
                  active
                    ? "border-[#17181C] bg-[#17181C] text-white"
                    : "border-[#E6E5DE] text-[#3A3B40] hover:border-[#17181C] hover:bg-[#F6F5F0]"
                }`}
              >
                {fmt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Power (W) */}
      {power.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#EFEEE8]">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8C8C84] mb-[14px]">
            {t("facet.power")}
          </p>
          <div className="flex flex-wrap gap-[7px]">
            {power.map(w => {
              const active = filters.power.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => onChange({ ...filters, power: toggleItem(filters.power, w) })}
                  className={`font-mono text-xs border rounded px-2 py-0.5 transition-colors cursor-pointer ${
                    active
                      ? "border-[#17181C] bg-[#17181C] text-white"
                      : "border-[#E6E5DE] text-[#3A3B40] hover:border-[#17181C] hover:bg-[#F6F5F0]"
                  }`}
                >
                  {w}W
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* IP Rating */}
      {ip.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#EFEEE8]">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8C8C84] mb-[14px]">
            {t("facet.ip")}
          </p>
          <div className="flex flex-wrap gap-[7px]">
            {ip.map(n => {
              const active = filters.ip.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ ...filters, ip: toggleItem(filters.ip, n) })}
                  className={`font-mono text-xs border rounded px-2 py-0.5 transition-colors cursor-pointer ${
                    active
                      ? "border-[#17181C] bg-[#17181C] text-white"
                      : "border-[#E6E5DE] text-[#3A3B40] hover:border-[#17181C] hover:bg-[#F6F5F0]"
                  }`}
                >
                  IP{n}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Temperature */}
      {colorTemp.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#EFEEE8]">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8C8C84] mb-[14px]">
            {t("facet.colorTemp")}
          </p>
          <div className="flex flex-wrap gap-[7px]">
            {colorTemp.map(ct => {
              const active = filters.colorTemp.includes(ct);
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => onChange({ ...filters, colorTemp: toggleItem(filters.colorTemp, ct) })}
                  className={`font-mono text-xs border rounded px-2 py-0.5 transition-colors cursor-pointer ${
                    active
                      ? "border-[#17181C] bg-[#17181C] text-white"
                      : "border-[#E6E5DE] text-[#3A3B40] hover:border-[#17181C] hover:bg-[#F6F5F0]"
                  }`}
                >
                  {ct}K
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
