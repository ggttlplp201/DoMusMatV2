export function Badge({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs ${active ? "border-brand text-brand" : "border-aluminium text-ink"}`}
    >
      {children}
    </span>
  );
}
