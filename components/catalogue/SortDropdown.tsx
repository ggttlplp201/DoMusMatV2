"use client";

import { useT } from "@/state/locale";

export type SortOption = "featured" | "name-az" | "category";

interface SortDropdownProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const t = useT();

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "featured", label: t("cat.sort.featured") },
    { value: "name-az", label: t("cat.sort.name") },
    { value: "category", label: t("cat.sort.category") },
  ];

  const currentLabel = SORT_OPTIONS.find(o => o.value === value)?.label ?? SORT_OPTIONS[0].label;

  return (
    <div className="relative">
      <select
        id="sort-select"
        value={value}
        onChange={e => onChange(e.target.value as SortOption)}
        className="h-[38px] border border-[#E6E5DE] rounded px-3 pr-8 text-sm text-[#3A3B40] bg-white cursor-pointer appearance-none"
        aria-label={t("cat.sort.featured")}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Chevron icon */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#8C8C84]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </span>
    </div>
  );
}
