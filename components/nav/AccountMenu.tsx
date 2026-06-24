"use client";
import Link from "next/link";
import { useAuth } from "@/state/auth";
import { useT } from "@/state/locale";

export function AccountMenu({ variant }: { variant: "desktop" | "mobile" }) {
  const { user, role, loading, signOut } = useAuth();
  const t = useT();

  const loginClass =
    variant === "desktop"
      ? "hidden md:inline-flex items-center ml-2 h-10 px-5 border border-ink rounded text-[14px] font-medium text-ink bg-white hover:bg-ink hover:text-white transition-colors"
      : "flex items-center rounded border border-ink px-3 min-h-[44px] text-sm text-left hover:bg-ink hover:text-white transition-colors";

  if (loading) {
    return variant === "desktop" ? <span className="hidden md:inline-flex ml-2 h-10 w-24" aria-hidden="true" /> : null;
  }

  if (!user) {
    return (
      <Link href="/login" className={loginClass}>
        {t("nav.login")}
      </Link>
    );
  }

  if (variant === "desktop") {
    return (
      <div className="hidden md:flex items-center gap-1 ml-2">
        {role === "manager" && (
          <Link href="/admin" className="inline-flex items-center h-10 px-3 rounded text-[14px] font-medium text-brand hover:bg-wash transition-colors">
            {t("nav.admin")}
          </Link>
        )}
        <Link href="/account" className="inline-flex items-center h-10 px-4 border border-ink rounded text-[14px] font-medium text-ink bg-white hover:bg-ink hover:text-white transition-colors">
          {t("nav.account")}
        </Link>
        <button type="button" onClick={() => { void signOut(); }} className="inline-flex items-center h-10 px-3 rounded text-[14px] text-muted hover:text-ink hover:bg-wash transition-colors">
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {role === "manager" && (
        <Link href="/admin" className="flex items-center min-h-[44px] text-sm font-medium text-brand">{t("nav.admin")}</Link>
      )}
      <Link href="/account" className="flex items-center min-h-[44px] text-sm text-ink">{t("nav.account")}</Link>
      <button type="button" onClick={() => { void signOut(); }} className="flex items-center min-h-[44px] text-sm text-left text-muted hover:text-ink">{t("auth.signOut")}</button>
    </div>
  );
}
