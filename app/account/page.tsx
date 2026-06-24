"use client";
import { useState, useEffect } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/state/auth";
import { countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";
import { createClient } from "@/lib/supabase/client";

interface OrderRow {
  id: string;
  source: string;
  status: string;
  total_quantity: number;
  created_at: string;
  order_items: {
    id: string;
    product_name_snapshot: string | null;
    product_ref: string;
    quantity: number;
  }[];
}

export default function AccountPage() {
  const { profile, loading, signOut } = useAuth();
  const t = useT();
  const { locale } = useLocale();

  const [supabase] = useState(() => createClient());
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) setOrders(data as OrderRow[]);
      });
    return () => { active = false; };
  }, [profile, supabase]);

  const localeTag = locale === "pt" ? "pt-PT" : locale === "en" ? "en-GB" : "zh-CN";

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("account.title")}</h1>
        {loading && <p className="text-body">…</p>}
        {!loading && profile && (
          <>
            <p className="mb-4 text-lg font-medium text-ink">{profile.full_name}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted">{t("account.email")}</dt><dd className="text-ink">{profile.email}</dd>
              <dt className="text-muted">{t("account.company")}</dt><dd className="text-ink">{profile.company_name || "—"}</dd>
              <dt className="text-muted">{t("account.country")}</dt><dd className="text-ink">{profile.country ? countryName(profile.country, locale) : "—"}</dd>
              <dt className="text-muted">{t("account.role")}</dt><dd className="text-ink">{t(`account.role.${profile.role}`)}</dd>
            </dl>
          </>
        )}
        {!loading && profile && (
          <button
            type="button"
            onClick={() => { void signOut(); }}
            className="mt-8 rounded border border-aluminium px-4 py-2 min-h-[44px] text-sm text-aluminium-dark hover:bg-neutral-fill"
          >
            {t("auth.signOut")}
          </button>
        )}
        {!loading && profile && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-ink">{t("account.orders.title")}</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-muted">{t("account.orders.empty")}</p>
            ) : (
              <ul className="space-y-4">
                {orders.map((o) => (
                  <li key={o.id} className="rounded border border-aluminium bg-neutral-fill p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm text-ink font-medium">
                        {new Date(o.created_at).toLocaleDateString(localeTag)}
                      </span>
                      <span className="rounded bg-wash px-2 py-0.5 text-xs text-muted border border-hairline">
                        {t(`order.status.${o.status}`)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-3">
                      <span>{t(`order.source.${o.source}`)}</span>
                      <span>{o.total_quantity} {t("order.units")}</span>
                    </div>
                    <ul className="space-y-1">
                      {o.order_items.map((item) => (
                        <li key={item.id} className="text-xs text-ink">
                          {item.product_name_snapshot ?? item.product_ref} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
