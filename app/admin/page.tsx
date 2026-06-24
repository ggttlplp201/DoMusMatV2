"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/state/auth";
import { countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n";

interface CustomerRow {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  country: string;
  role: string;
  created_at: string;
}

const LOCALE_TAG: Record<Locale, string> = {
  pt: "pt-PT",
  en: "en-GB",
  zh: "zh-CN",
};

export default function AdminPage() {
  const { loading, role } = useAuth();
  const t = useT();
  const { locale } = useLocale();
  const [supabase] = useState(() => createClient());
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (loading || role !== "manager") return;
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCustomers((data as CustomerRow[]) ?? []);
        setFetched(true);
      });
  }, [loading, role, supabase]);

  // Compute by-country breakdown
  const byCountry: { label: string; count: number }[] = (() => {
    const map = new Map<string, number>();
    for (const row of customers) {
      const code = row.country?.trim() || "";
      const label = code ? countryName(code, locale) : "—";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  })();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("admin.title")}</h1>

        {loading && (
          <p className="text-aluminium-dark py-8">…</p>
        )}

        {!loading && role === "manager" && (
          <>
            {/* KPI */}
            <div className="mb-8 inline-block rounded border border-aluminium bg-neutral-fill px-4 py-3">
              <div className="text-sm text-aluminium-dark">{t("admin.totalCustomers")}</div>
              <div className="text-2xl font-bold text-ink tabular-nums">{customers.length}</div>
            </div>

            {/* By country */}
            {byCountry.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.byCountry")}</h2>
                <ul className="flex flex-wrap gap-3">
                  {byCountry.map(({ label, count }) => (
                    <li
                      key={label}
                      className="rounded border border-aluminium bg-neutral-fill px-4 py-2 text-sm text-ink"
                    >
                      <span className="font-medium">{label}</span>
                      <span className="ml-2 text-aluminium-dark tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Customers table */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.customers")}</h2>

              {!fetched ? (
                <p className="text-aluminium-dark py-8">…</p>
              ) : customers.length === 0 ? (
                <p className="text-aluminium-dark py-8 text-center">{t("admin.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-neutral-fill text-aluminium-dark">
                        <th className="py-2 px-3 text-left font-medium">{t("admin.col.name")}</th>
                        <th className="py-2 px-3 text-left font-medium">{t("admin.col.company")}</th>
                        <th className="py-2 px-3 text-left font-medium">{t("admin.col.email")}</th>
                        <th className="py-2 px-3 text-left font-medium">{t("admin.col.country")}</th>
                        <th className="py-2 px-3 text-left font-medium">{t("admin.col.role")}</th>
                        <th className="py-2 px-3 text-left font-medium">{t("admin.col.joined")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((row, i) => (
                        <tr
                          key={row.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-neutral-fill"}
                        >
                          <td className="py-2 px-3 text-ink">{row.full_name || "—"}</td>
                          <td className="py-2 px-3 text-ink">{row.company_name || "—"}</td>
                          <td className="py-2 px-3 text-ink">{row.email}</td>
                          <td className="py-2 px-3 text-ink">
                            {row.country?.trim()
                              ? countryName(row.country, locale)
                              : "—"}
                          </td>
                          <td className="py-2 px-3 text-ink">{t(`account.role.${row.role}`)}</td>
                          <td className="py-2 px-3 tabular-nums text-ink">
                            {new Date(row.created_at).toLocaleDateString(LOCALE_TAG[locale])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
