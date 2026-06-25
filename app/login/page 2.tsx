"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/state/locale";

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(t("auth.login.error"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  const field = "w-full h-11 border border-hairline bg-wash rounded px-3 text-[15px] text-ink outline-none focus:border-ink";

  return (
    <main className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold text-ink">{t("auth.login.title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-body">{t("auth.login.email")}
          <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="text-sm text-body">{t("auth.login.password")}
          <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-brand">{error}</p>}
        <button type="submit" disabled={busy} className="mt-2 rounded bg-brand px-6 py-2 min-h-[44px] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {t("auth.login.submit")}
        </button>
      </form>
      <p className="mt-4 text-sm text-body">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="text-brand hover:underline">{t("auth.login.registerLink")}</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  );
}
