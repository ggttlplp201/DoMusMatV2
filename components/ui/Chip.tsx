export function Chip({ label }: { label: string }) {
  return <span className="inline-block rounded bg-neutral-fill px-2 py-0.5 text-xs text-ink tabular-nums">{label}</span>;
}
