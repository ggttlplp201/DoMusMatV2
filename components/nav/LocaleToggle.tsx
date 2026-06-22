"use client";

import { LOCALES } from "@/lib/i18n";
import { useLocale } from "@/state/locale";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Idioma / Language / 语言"
      className="flex items-center rounded border border-aluminium overflow-hidden text-xs"
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={[
            "px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            locale === code
              ? "bg-brand text-white font-medium"
              : "text-aluminium-dark hover:text-ink hover:bg-neutral-fill",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
