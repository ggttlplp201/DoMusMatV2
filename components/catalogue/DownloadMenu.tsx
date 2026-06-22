"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasRealValue } from "@/lib/placeholder";
import { useT } from "@/state/locale";
import type { Product, BimAsset } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const REVIT_ARCHICAD_FORMATS = new Set<string>(["IFC", "RFA", "PLA"]);

interface AssetRowProps {
  asset: BimAsset;
  unavailableLabel: string;
}

function AssetRow({ asset, unavailableLabel }: AssetRowProps) {
  const hasFile = hasRealValue(asset.file);
  const rowLabel = asset.label || asset.format;
  return (
    <li role="menuitem" className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-neutral-fill">
      <span className="flex items-center gap-2 text-sm text-ink">
        {rowLabel}
        <span className="rounded bg-neutral-fill px-1.5 py-0.5 text-[10px] font-medium text-aluminium-dark border border-aluminium">
          {asset.format}
        </span>
      </span>
      {hasFile ? (
        <a
          href={asset.file}
          download
          className="text-xs text-brand hover:underline whitespace-nowrap"
        >
          {hasRealValue(asset.size) ? asset.size : unavailableLabel}
        </a>
      ) : (
        <span className="text-xs text-aluminium-dark whitespace-nowrap">
          {unavailableLabel}
        </span>
      )}
    </li>
  );
}

interface DownloadMenuProps {
  product: Product;
}

export function DownloadMenu({ product }: DownloadMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const triggerContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const primaryGroup = product.bim_assets.filter((a) =>
    REVIT_ARCHICAD_FORMATS.has(a.format)
  );
  const secondaryGroup = product.bim_assets.filter(
    (a) => !REVIT_ARCHICAD_FORMATS.has(a.format)
  );

  // GSAP open animation
  useGSAP(
    () => {
      if (!open || !menuRef.current) return;
      const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) return;

      gsap.fromTo(
        menuRef.current,
        { opacity: 0, y: -4, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.15, ease: "power2.out" }
      );
    },
    { scope: menuRef, dependencies: [open] }
  );

  // Close on click-outside
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerContainerRef.current &&
        !triggerContainerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    },
    []
  );

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        const btn = triggerContainerRef.current?.querySelector("button");
        btn?.focus();
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleOutsideClick, handleKeyDown]);

  const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const unavailableLabel = t("fb.bimAsset");

  return (
    <div className="relative" ref={triggerContainerRef}>
      <AnimatedButton
        onClick={handleTriggerClick}
        aria-label={t("download.title")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("download.title")}
        className="flex items-center gap-1 rounded border border-aluminium px-2 py-1 text-xs text-aluminium-dark transition-colors hover:border-brand hover:text-brand"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 1v8M4 6l3 3 3-3M2 11h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("download.trigger")}
      </AnimatedButton>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("download.title")}
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded border border-aluminium bg-white shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-aluminium px-3 py-2">
            <SectionLabel>{t("download.title")}</SectionLabel>
          </div>

          {primaryGroup.length === 0 && secondaryGroup.length === 0 ? (
            <p className="px-3 py-3 text-sm text-aluminium-dark">
              {unavailableLabel}
            </p>
          ) : (
            <>
              {primaryGroup.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-aluminium-dark uppercase tracking-wide">
                    {t("download.revitArchicad")}
                  </p>
                  <ul>
                    {primaryGroup.map((asset) => (
                      <AssetRow key={asset.format} asset={asset} unavailableLabel={unavailableLabel} />
                    ))}
                  </ul>
                </div>
              )}

              {secondaryGroup.length > 0 && (
                <div className={primaryGroup.length > 0 ? "border-t border-aluminium" : ""}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-aluminium-dark uppercase tracking-wide">
                    {t("download.otherFormats")}
                  </p>
                  <ul className="pb-1">
                    {secondaryGroup.map((asset) => (
                      <AssetRow key={asset.format} asset={asset} unavailableLabel={unavailableLabel} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
