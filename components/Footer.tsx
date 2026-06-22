"use client";

import { repo } from "@/lib/repository";
import { useT } from "@/state/locale";

export function Footer() {
  const t = useT();
  const m = repo.getManufacturer();

  return (
    <footer className="bg-ink text-white">
      {/* Main columns */}
      <div className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Col 1: Logo + tagline */}
          <div className="flex flex-col gap-4">
            {/* Logo: red diamond + wordmark */}
            <div className="flex items-center gap-2">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="14"
                  y="1"
                  width="18"
                  height="18"
                  rx="2"
                  transform="rotate(45 14 1)"
                  fill="#C0392B"
                />
              </svg>
              <span className="text-lg font-bold tracking-tight text-white">
                DoMusMat
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Col 2: Legal Terms */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              {t("footer.legalTerms")}
            </h3>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a
                  href="#"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  {t("footer.privacy")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  {t("footer.terms")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.livroreclamacoes.pt/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  {t("footer.complaints")}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Contacts */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              {t("footer.contacts")}
            </h3>
            <address className="not-italic flex flex-col gap-2 text-sm text-white/60">
              <p>{m.address}</p>
              <div>
                <p>{m.phone}</p>
                <p className="text-white/40 text-xs">{t("footer.nationalLandline")}</p>
              </div>
              {m.phone_quotes && (
                <div>
                  <p>
                    {m.phone_quotes}{" "}
                    <span className="text-white/40 text-xs">{t("footer.requestQuotes")}</span>
                  </p>
                </div>
              )}
              <a
                href={`mailto:${m.email}`}
                className="transition-colors hover:text-white"
              >
                {m.email}
              </a>
            </address>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/15">
        <div className="mx-auto max-w-[1440px] px-6 py-4">
          <p className="text-xs text-white/40">
            © 2026 DoMusMat · {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
