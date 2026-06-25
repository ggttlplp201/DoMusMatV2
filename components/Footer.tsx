"use client";

import { repo } from "@/lib/repository";
import { useT } from "@/state/locale";

export function Footer() {
  const t = useT();
  const m = repo.getManufacturer();

  return (
    <footer className="mt-16 md:mt-24" style={{ background: "#141414", color: "#fff" }}>
      {/* Main grid */}
      <div
        className="mx-auto max-w-[1440px] px-9"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gap: "48px",
          padding: "64px 36px",
        }}
      >
        {/* Col 1: Logo + tagline */}
        <div>
          <div className="flex items-center gap-[11px] mb-5">
            <span
              className="block w-[18px] h-[18px] bg-brand rotate-45 rounded-sm flex-none"
              aria-hidden
            />
            <span className="text-[21px] font-bold tracking-[-0.02em] text-white">DoMusMat</span>
          </div>
          <p className="text-[14.5px] leading-[1.6] max-w-[340px] m-0" style={{ color: "#A3A39C" }}>
            {t("footer.tagline")}
          </p>
        </div>

        {/* Col 2: Legal */}
        <div>
          <div
            className="font-mono text-[11px] tracking-[0.1em] uppercase mb-[18px]"
            style={{ color: "#76766F" }}
          >
            {t("footer.legalTerms")}
          </div>
          <ul className="flex flex-col gap-3 text-[14.5px] m-0 p-0 list-none" style={{ color: "#C9C9C2" }}>
            <li>
              <a href="#" className="transition-colors hover:text-white" style={{ color: "inherit" }}>
                {t("footer.privacy")}
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-white" style={{ color: "inherit" }}>
                {t("footer.terms")}
              </a>
            </li>
            <li>
              <a
                href="https://www.livroreclamacoes.pt/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                style={{ color: "inherit" }}
              >
                {t("footer.complaints")}
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Contacts */}
        <div>
          <div
            className="font-mono text-[11px] tracking-[0.1em] uppercase mb-[18px]"
            style={{ color: "#76766F" }}
          >
            {t("footer.contacts")}
          </div>
          <address className="not-italic flex flex-col gap-3 text-[14.5px]" style={{ color: "#C9C9C2" }}>
            <p className="m-0">{m.address}</p>
            <div>
              <p className="m-0">{m.phone}</p>
              <p className="m-0 text-[12.5px]" style={{ color: "#76766F" }}>
                {t("footer.nationalLandline")}
              </p>
            </div>
            {m.phone_quotes && (
              <div>
                <p className="m-0">
                  {m.phone_quotes}{" "}
                  <span className="text-[12.5px]" style={{ color: "#76766F" }}>
                    {t("footer.requestQuotes")}
                  </span>
                </p>
              </div>
            )}
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                className="transition-colors hover:text-white"
                style={{ color: "inherit" }}
              >
                {m.email}
              </a>
            )}
          </address>
        </div>
      </div>

      {/* Bottom rule */}
      <div style={{ borderTop: "1px solid #2A2A2A" }}>
        <div
          className="mx-auto max-w-[1440px] text-[12.5px]"
          style={{ padding: "22px 36px", color: "#76766F" }}
        >
          © 2026 DoMusMat · Materiais de Construção, Lda.
        </div>
      </div>
    </footer>
  );
}
