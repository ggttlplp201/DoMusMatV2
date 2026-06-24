"use client";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/state/auth";
import { countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";

export default function AccountPage() {
  const { profile, loading, signOut } = useAuth();
  const t = useT();
  const { locale } = useLocale();

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
      </main>
      <Footer />
    </>
  );
}
