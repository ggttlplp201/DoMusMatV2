"use client";

import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/state/auth";
import { useT } from "@/state/locale";

/** Manager-only shell. The proxy already guards /admin/*; this is the client-side mirror. */
export function AdminGate({ title, children }: { title?: string; children: React.ReactNode }) {
  const { loading, role } = useAuth();
  const t = useT();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-10">
        {title && <h1 className="mb-6 text-2xl font-bold text-ink">{title}</h1>}
        {loading && <p className="text-aluminium-dark py-8">{t("admin.prod.loading")}</p>}
        {!loading && role === "manager" && children}
      </main>
      <Footer />
    </>
  );
}
