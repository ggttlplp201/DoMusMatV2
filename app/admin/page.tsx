"use client";
import { Fragment, useEffect, useState } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/state/auth";
import { countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";
import { createClient } from "@/lib/supabase/client";
import { BarChart } from "@/components/admin/BarChart";
import { ordersToCsv } from "@/lib/ordersCsv";
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

interface OrderItemRow {
  product_ref: string;
  product_name_snapshot: string | null;
  quantity: number;
}

interface OrderRow {
  id: string;
  user_id: string;
  source: string | null;
  status: string;
  total_quantity: number;
  created_at: string;
  updated_at: string | null;
  note: string | null;
  profiles: {
    email: string;
    company_name: string | null;
    country: string | null;
  } | null;
  order_items: OrderItemRow[];
}

type SortKey = "newest" | "oldest" | "mostUnits";

const ORDER_STATUSES = ["submitted", "in_review", "quoted", "fulfilled", "cancelled"] as const;

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
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersFetched, setOrdersFetched] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || role !== "manager") return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setCustomers((data as CustomerRow[]) ?? []);
        setFetched(true);
      });
    return () => { cancelled = true; };
  }, [loading, role, supabase]);

  useEffect(() => {
    if (loading || role !== "manager") return;
    let cancelled = false;
    supabase
      .from("orders")
      .select("*, profiles(email, company_name, country), order_items(product_name_snapshot, product_ref, quantity)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setOrders((data as OrderRow[]) ?? []);
        setOrdersFetched(true);
      });
    return () => { cancelled = true; };
  }, [loading, role, supabase]);

  async function updateStatus(orderId: string, newStatus: string) {
    setSavingId(orderId);
    setStatusError(null);
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      setStatusError(t("admin.statusUpdateError"));
    } else {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    setSavingId((prev) => (prev === orderId ? null : prev));
  }

  function handleExportCsv() {
    const rows = orders.map((o) => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      source: o.source ?? "",
      total_quantity: o.total_quantity,
      itemCount: o.order_items?.length ?? 0,
      email: o.profiles?.email ?? "",
      company: o.profiles?.company_name ?? "",
      country: o.profiles?.country ?? "",
    }));
    const csv = ordersToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Compute by-country breakdown (uses unsorted orders state for charts)
  const byCountry: { label: string; value: number }[] = (() => {
    const map = new Map<string, number>();
    for (const row of customers) {
      const code = row.country?.trim() || "";
      const label = code ? countryName(code, locale) : "—";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  })();

  // Orders: by-status chart data (uses unsorted state)
  const byStatus: { label: string; value: number }[] = (() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      const key = order.status;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, value]) => ({ label: t(`order.status.${key}`), value }))
      .sort((a, b) => b.value - a.value);
  })();

  // Orders: top materials chart data (uses unsorted state)
  const topMaterials: { label: string; value: number }[] = (() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.order_items) {
        const key = item.product_name_snapshot || item.product_ref;
        map.set(key, (map.get(key) ?? 0) + item.quantity);
      }
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  })();

  // Sorted copy for table display — never mutates state
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortKey === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortKey === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    // mostUnits
    return b.total_quantity - a.total_quantity;
  });

  // Table has 5 columns: expand toggle, customer, date, status, units
  const TABLE_COLS = 5;

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
                <BarChart data={byCountry} />
              </section>
            )}

            {/* Customers table */}
            <section className="mb-12">
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

            {/* Orders section */}
            <section>
              <h2 className="mb-6 text-xl font-bold text-ink">{t("admin.orders")}</h2>

              {!ordersFetched ? (
                <p className="text-aluminium-dark py-8">…</p>
              ) : orders.length === 0 ? (
                <p className="text-aluminium-dark py-8 text-center">{t("admin.noOrders")}</p>
              ) : (
                <>
                  {/* Orders KPI */}
                  <div className="mb-8 inline-block rounded border border-aluminium bg-neutral-fill px-4 py-3">
                    <div className="text-sm text-aluminium-dark">{t("admin.totalOrders")}</div>
                    <div className="text-2xl font-bold text-ink tabular-nums">{orders.length}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                    {/* By status */}
                    {byStatus.length > 0 && (
                      <section>
                        <h3 className="mb-3 text-base font-semibold text-ink">{t("admin.byStatus")}</h3>
                        <BarChart data={byStatus} />
                      </section>
                    )}

                    {/* Top materials */}
                    {topMaterials.length > 0 && (
                      <section>
                        <h3 className="mb-3 text-base font-semibold text-ink">{t("admin.topMaterials")}</h3>
                        <BarChart data={topMaterials} />
                      </section>
                    )}
                  </div>

                  {/* Orders table: heading row with CSV export + sort controls */}
                  <section>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-ink">{t("admin.recentOrders")}</h3>
                      <div className="ml-auto flex items-center gap-3">
                        {/* Sort control */}
                        <label className="flex items-center gap-1.5 text-sm text-aluminium-dark">
                          <span>{t("admin.sortBy")}</span>
                          <select
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as SortKey)}
                            className="border border-hairline rounded px-2 py-1 text-sm bg-white"
                          >
                            <option value="newest">{t("admin.sort.newest")}</option>
                            <option value="oldest">{t("admin.sort.oldest")}</option>
                            <option value="mostUnits">{t("admin.sort.mostUnits")}</option>
                          </select>
                        </label>
                        {/* CSV export button */}
                        <button
                          onClick={handleExportCsv}
                          disabled={orders.length === 0}
                          className="rounded border border-hairline bg-white px-3 py-1 text-sm text-ink hover:bg-neutral-fill disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t("admin.exportCsv")}
                        </button>
                      </div>
                    </div>

                    {statusError && (
                      <p className="mb-2 text-sm text-red-600">{statusError}</p>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-neutral-fill text-aluminium-dark">
                            <th className="py-2 px-3 text-left font-medium">{t("admin.col.details")}</th>
                            <th className="py-2 px-3 text-left font-medium">{t("admin.col.customer")}</th>
                            <th className="py-2 px-3 text-left font-medium">{t("admin.col.date")}</th>
                            <th className="py-2 px-3 text-left font-medium">{t("admin.col.status")}</th>
                            <th className="py-2 px-3 text-right font-medium">{t("admin.col.units")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedOrders.map((order, i) => {
                            const isExpanded = expandedId === order.id;
                            const rowBg = i % 2 === 0 ? "bg-white" : "bg-neutral-fill";
                            return (
                              <Fragment key={order.id}>
                                <tr className={rowBg}>
                                  {/* Expand toggle */}
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      onClick={() => toggleExpand(order.id)}
                                      aria-label={t("admin.expand")}
                                      aria-expanded={isExpanded}
                                      className="text-aluminium-dark hover:text-ink text-xl leading-none px-2 py-1"
                                    >
                                      {isExpanded ? "▾" : "▸"}
                                    </button>
                                  </td>
                                  <td className="py-2 px-3 text-ink">
                                    {order.profiles?.company_name || order.profiles?.email || "—"}
                                  </td>
                                  <td className="py-2 px-3 tabular-nums text-ink">
                                    {new Date(order.created_at).toLocaleDateString(LOCALE_TAG[locale])}
                                  </td>
                                  <td className="py-2 px-3 text-ink">
                                    <select
                                      value={order.status}
                                      aria-label={t("admin.changeStatus")}
                                      disabled={savingId === order.id}
                                      onChange={(e) => updateStatus(order.id, e.target.value)}
                                      className="border border-hairline rounded px-2 py-1 text-sm bg-white"
                                    >
                                      {ORDER_STATUSES.map((s) => (
                                        <option key={s} value={s}>{t(`order.status.${s}`)}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 tabular-nums text-right text-ink">
                                    {order.total_quantity}
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className={rowBg}>
                                    <td colSpan={TABLE_COLS} className="px-4 pb-4 pt-1">
                                      <div className="rounded border border-aluminium bg-neutral-fill p-4 text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                        {/* Customer */}
                                        <div>
                                          <span className="text-aluminium-dark font-medium">{t("admin.col.customer")}: </span>
                                          <span className="text-ink">
                                            {order.profiles?.email || "—"}
                                            {order.profiles?.company_name ? ` · ${order.profiles.company_name}` : ""}
                                          </span>
                                        </div>
                                        {/* Country */}
                                        <div>
                                          <span className="text-aluminium-dark font-medium">{t("admin.col.country")}: </span>
                                          <span className="text-ink">
                                            {order.profiles?.country
                                              ? countryName(order.profiles.country, locale)
                                              : "—"}
                                          </span>
                                        </div>
                                        {/* Created date */}
                                        <div>
                                          <span className="text-aluminium-dark font-medium">{t("admin.col.date")}: </span>
                                          <span className="text-ink tabular-nums">
                                            {new Date(order.created_at).toLocaleDateString(LOCALE_TAG[locale])}
                                          </span>
                                        </div>
                                        {/* Updated date */}
                                        {order.updated_at && (
                                          <div>
                                            <span className="text-aluminium-dark font-medium">{t("admin.updated")}: </span>
                                            <span className="text-ink tabular-nums">
                                              {new Date(order.updated_at).toLocaleDateString(LOCALE_TAG[locale])}
                                            </span>
                                          </div>
                                        )}
                                        {/* Status */}
                                        <div>
                                          <span className="text-aluminium-dark font-medium">{t("admin.col.status")}: </span>
                                          <span className="text-ink">{t(`order.status.${order.status}`)}</span>
                                        </div>
                                        {/* Source */}
                                        {order.source && (
                                          <div>
                                            <span className="text-aluminium-dark font-medium">{t("admin.col.source")}: </span>
                                            <span className="text-ink">{t(`order.source.${order.source}`)}</span>
                                          </div>
                                        )}
                                        {/* Note */}
                                        <div className="sm:col-span-2">
                                          <span className="text-aluminium-dark font-medium">{t("admin.note")}: </span>
                                          <span className="text-ink">{order.note || "—"}</span>
                                        </div>
                                        {/* Items */}
                                        {order.order_items && order.order_items.length > 0 && (
                                          <div className="sm:col-span-2">
                                            <span className="text-aluminium-dark font-medium">{t("admin.items")}: </span>
                                            <ul className="mt-1 space-y-0.5 pl-2">
                                              {order.order_items.map((item, idx) => (
                                                <li key={idx} className="text-ink">
                                                  {item.product_name_snapshot || item.product_ref} × {item.quantity}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
