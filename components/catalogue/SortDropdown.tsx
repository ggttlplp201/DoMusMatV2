"use client";

export type SortOption = "featured" | "name-az" | "category";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Em destaque" },
  { value: "name-az", label: "Nome A–Z" },
  { value: "category", label: "Categoria" },
];

interface SortDropdownProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="sort-select" className="text-aluminium-dark">
        Ordenar:
      </label>
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
