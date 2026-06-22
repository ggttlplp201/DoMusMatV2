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

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        id="sort-select"
        value={value}
        onChange={e => onChange(e.target.value as SortOption)}
        className="rounded border border-aluminium px-2 py-1 text-sm text-ink"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
