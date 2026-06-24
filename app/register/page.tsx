"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";

export default function RegisterPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: company, country } },
    });
    setBusy(false);
    if (error) {
      setError(t("auth.register.error"));
      return;
    }
    router.push("/account");
  }

  const field = "w-full h-11 border border-hairline bg-wash rounded px-3 text-[15px] text-ink outline-none focus:border-ink";

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-4 sm:px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("auth.register.title")}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-body">{t("auth.register.fullName")}
            <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="text-sm text-body">{t("auth.register.company")}
            <input className={field} value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label className="text-sm text-body">{t("auth.register.country")}
            <select className={field} value={country} onChange={(e) => setCountry(e.target.value)} required>
              <option value="" disabled hidden>{t("auth.register.countryPlaceholder")}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{countryName(c.code, locale)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-body">{t("auth.login.email")}
            <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="text-sm text-body">{t("auth.login.password")}
            <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {error && <p className="text-sm text-brand">{error}</p>}
          <button type="submit" disabled={busy} className="mt-2 rounded bg-brand px-6 py-2 min-h-[44px] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {t("auth.register.submit")}
          </button>
        </form>
        <p className="mt-4 text-sm text-body">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-brand hover:underline">{t("auth.register.loginLink")}</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
