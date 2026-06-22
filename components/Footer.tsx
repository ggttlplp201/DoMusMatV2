import { repo } from "@/lib/repository";

export function Footer() {
  const m = repo.getManufacturer();
  return (
    <footer className="mt-16 border-t border-aluminium bg-neutral-fill">
      <div className="mx-auto max-w-[1440px] px-6 py-10 text-sm text-aluminium-dark">
        <p className="font-semibold text-ink">{m.name}</p>
        <p>{m.address}</p>
        <p>
          {m.phone} · {m.email}
        </p>
      </div>
    </footer>
  );
}
