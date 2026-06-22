"use client";

import { useT } from "@/state/locale";

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t("search.placeholder")}
      placeholder={t("search.placeholder")}
      className="w-full rounded border border-aluminium px-3 py-2 text-sm"
    />
  );
}
