"use client";

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Pesquisar produtos"
      placeholder="Search products, references..."
      className="w-full rounded border border-aluminium px-3 py-2 text-sm"
    />
  );
}
