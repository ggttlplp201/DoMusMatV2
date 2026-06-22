"use client";
import { repo } from "@/lib/repository";
import { facetOptions } from "@/lib/filter";
import type { CatalogueFilters } from "@/lib/filter";
import { useT } from "@/state/locale";

interface FilterSidebarProps {
  filters: CatalogueFilters;
  onChange: (filters: CatalogueFilters) => void;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const t = useT();
  const categories = repo.getCategories();
  const { power, ip, colorTemp } = facetOptions(repo.getProducts());

  return (
    <aside className="w-full space-y-6 text-sm lg:w-56">
      {/* Category group */}
      <section>
        <p className="mb-2 font-semibold text-ink">{t("facet.category")}</p>
        <ul className="space-y-1">
          {categories.map(cat => {
            const id = `cat-${cat.id}`;
            return (
              <li key={cat.id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={filters.category.includes(cat.id)}
                  onChange={() =>
                    onChange({ ...filters, category: toggleItem(filters.category, cat.id) })
                  }
                  className="mr-2 accent-brand"
                />
                <label htmlFor={id} className="cursor-pointer text-aluminium-dark hover:text-ink">
                  {cat.name}
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Power group */}
      {power.length > 0 && (
        <section>
          <p className="mb-2 font-semibold text-ink">{t("facet.power")}</p>
          <ul className="space-y-1">
            {power.map(w => {
              const id = `power-${w}`;
              return (
                <li key={w}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={filters.power.includes(w)}
                    onChange={() =>
                      onChange({ ...filters, power: toggleItem(filters.power, w) })
                    }
                    className="mr-2 accent-brand"
                  />
                  <label htmlFor={id} className="cursor-pointer text-aluminium-dark hover:text-ink">
                    {w} W
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* IP group */}
      {ip.length > 0 && (
        <section>
          <p className="mb-2 font-semibold text-ink">{t("facet.ip")}</p>
          <ul className="space-y-1">
            {ip.map(n => {
              const id = `ip-${n}`;
              return (
                <li key={n}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={filters.ip.includes(n)}
                    onChange={() =>
                      onChange({ ...filters, ip: toggleItem(filters.ip, n) })
                    }
                    className="mr-2 accent-brand"
                  />
                  <label htmlFor={id} className="cursor-pointer text-aluminium-dark hover:text-ink">
                    IP{n}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Color temperature group */}
      {colorTemp.length > 0 && (
        <section>
          <p className="mb-2 font-semibold text-ink">{t("facet.colorTemp")}</p>
          <ul className="space-y-1">
            {colorTemp.map(ct => {
              const id = `ct-${ct}`;
              return (
                <li key={ct}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={filters.colorTemp.includes(ct)}
                    onChange={() =>
                      onChange({ ...filters, colorTemp: toggleItem(filters.colorTemp, ct) })
                    }
                    className="mr-2 accent-brand"
                  />
                  <label htmlFor={id} className="cursor-pointer text-aluminium-dark hover:text-ink">
                    {ct}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
