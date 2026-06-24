"use client";

interface Datum {
  label: string;
  value: number;
}

// Dependency-free horizontal bar chart. Bars are proportional to the max value.
export function BarChart({ data, valueSuffix }: { data: Datum[]; valueSuffix?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-sm">
          <span className="w-32 shrink-0 truncate text-aluminium-dark" title={d.label}>{d.label}</span>
          <span className="relative h-5 flex-1 overflow-hidden rounded bg-neutral-fill">
            <span
              className="absolute inset-y-0 left-0 rounded bg-brand"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums text-ink">{d.value}{valueSuffix ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
