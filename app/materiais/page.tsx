"use client";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { BomBuilder } from "@/components/bom/BomBuilder";
import { t } from "@/lib/strings";

export default function MateriaisPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-ink">Lista de materiais</h1>
        <BomBuilder />
        <p className="mt-8 text-xs text-aluminium-dark">{t.vatNote}</p>
      </main>
      <Footer />
    </>
  );
}
