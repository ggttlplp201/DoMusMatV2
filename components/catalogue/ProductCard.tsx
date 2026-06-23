"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { repo } from "@/lib/repository";
import { hasRealValue } from "@/lib/placeholder";
import { useCompare } from "@/state/compare";
import { useAnalytics } from "@/state/analytics";
import { useRouter } from "next/navigation";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { DownloadMenu } from "./DownloadMenu";
import type { Product } from "@/lib/types";

gsap.registerPlugin(useGSAP);

function getCategoryName(categoryId: string, locale: import("@/lib/i18n").Locale): string {
  const cat = repo.getCategories().find(c => c.id === categoryId);
  return cat ? localizedName(cat, locale) : categoryId;
}

function getPowerRange(product: Product): string | null {
  const powers = product.variants
    .map(v => Number(v.attrs?.["power_w"]))
    .filter(n => Number.isFinite(n));
  if (!powers.length) return null;
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  return min === max ? `${min}W` : `${min}–${max}W`;
}

function getIpLabel(product: Product): string | null {
  const v = product.shared_specs?.["ip_rating"];
  const n = typeof v === "number" ? v : parseInt(String(v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? `IP${n}` : null;
}

function getFirstColorTemp(product: Product): string | null {
  const ct = product.shared_specs?.["color_temperature"];
  if (Array.isArray(ct) && ct.length > 0) return String(ct[0]);
  return null;
}

function getFormats(product: Product): string[] {
  return [...new Set(product.bim_assets.map(a => a.format))];
}

export function ProductCard({ product }: { product: Product }) {
  const { toggle, has, canAdd } = useCompare();
  const analytics = useAnalytics();
  const t = useT();
  const { locale } = useLocale();
  const inCompare = has(product.id);
  const router = useRouter();

  const powerRange = getPowerRange(product);
  const ipLabel = getIpLabel(product);
  const colorTemp = getFirstColorTemp(product);
  const formats = getFormats(product);
  const variantCount = product.variants.length;
  const firstRef = product.variants[0]?.ref ?? "";

  const hasMultipleImages = product.images.length > 1;
  const [imageIndex, setImageIndex] = useState(0);
  const dirRef = useRef(1);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!imgWrapRef.current) return;
      const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      gsap.fromTo(
        imgWrapRef.current,
        { autoAlpha: 0, x: dirRef.current * 12 },
        { autoAlpha: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
    },
    { dependencies: [imageIndex], scope: imgWrapRef }
  );

  function handlePrev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dirRef.current = -1;
    setImageIndex(i => (i - 1 + product.images.length) % product.images.length);
  }

  function handleNext(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dirRef.current = 1;
    setImageIndex(i => (i + 1) % product.images.length);
  }

  return (
    <Link
      href={`/products/${product.id}`}
      onClick={() => analytics.track({ type: "view", ref: product.id })}
      className="group block bg-white border border-[#E6E5DE] rounded-[14px] overflow-hidden hover:bg-[#FAFAF7] hover:border-[#D8D7CF] transition-colors"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-[#F6F5F0] overflow-hidden">
        {product.images.length > 0 ? (
          <div ref={imgWrapRef} className="absolute inset-0">
            <Image
              src={product.images[imageIndex]}
              alt={localizedName(product, locale)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[#B4B4AC] p-4 text-center">
            {localizedName(product, locale)}
          </div>
        )}

        {/* Compare pill */}
        {inCompare && (
          <span className="absolute top-2 left-2 flex items-center gap-[5px] bg-[#DA1E28] text-white text-[11px] font-semibold px-[9px] py-1 rounded-[3px] z-10">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            {t("card.comparing")}
          </span>
        )}

        {/* 3D badge */}
        {hasRealValue(product.model3d) && (
          <button
            type="button"
            aria-label={t("card.view3d")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/products/${product.id}?view=3d`);
            }}
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer bg-white/80 text-[#17181C] text-xs font-medium px-2 py-1 rounded"
          >
            {t("card.view3d")}
          </button>
        )}

        {/* Prev/Next arrows */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              aria-label={t("card.prevImage")}
              onClick={handlePrev}
              className="absolute inset-y-0 left-1 my-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/70 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:bg-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              aria-label={t("card.nextImage")}
              onClick={handleNext}
              className="absolute inset-y-0 right-1 my-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/70 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:bg-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {/* Dot indicator */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
              {product.images.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                    i === imageIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-[20px_22px_0px]">
        {/* Category */}
        <p className="font-mono text-[11px] tracking-[0.06em] uppercase text-[#B4B4AC] mb-2">
          {getCategoryName(product.category, locale)}
        </p>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[#17181C] mb-2 leading-[1.25]">
          {localizedName(product, locale)}
        </h3>

        {/* Spec chips */}
        {(powerRange || ipLabel || colorTemp) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {powerRange && (
              <span className="bg-[#F6F5F0] text-xs rounded-[3px] px-2 py-0.5 text-[#3A3B40]">{powerRange}</span>
            )}
            {ipLabel && (
              <span className="bg-[#F6F5F0] text-xs rounded-[3px] px-2 py-0.5 text-[#3A3B40]">{ipLabel}</span>
            )}
            {colorTemp && (
              <span className="bg-[#F6F5F0] text-xs rounded-[3px] px-2 py-0.5 text-[#3A3B40]">{colorTemp}</span>
            )}
          </div>
        )}

        {/* Ref line */}
        <p className="font-mono text-xs text-[#8C8C84] mb-2">
          {product.ref_prefix}
          {variantCount > 1 ? ` · ${variantCount} ${t("card.references")}` : variantCount === 1 ? ` · ${firstRef}` : ""}
        </p>

        {/* File row */}
        {formats.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-[#B4B4AC]">{t("cat.fileLabel")}</span>
            {formats.map(fmt => (
              <span key={fmt} className="font-mono text-[10px] border border-[#E6E5DE] rounded-[2px] px-1 text-[#3A3B40]">
                {fmt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="border-t border-[#EFEEE8] flex items-center justify-between px-[22px] py-3 mt-3">
        <span className="text-sm font-semibold text-[#17181C] whitespace-nowrap">{t("fb.price")}</span>
        <div className="flex gap-1" onClick={e => e.preventDefault()}>
          {/* Compare button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(product.id);
            }}
            disabled={!inCompare && !canAdd}
            title={inCompare ? t("common.remove") : t("card.compare")}
            aria-label={inCompare ? t("common.remove") : t("card.compare")}
            className={`w-[34px] h-[34px] flex items-center justify-center border rounded transition-colors disabled:opacity-40 ${
              inCompare
                ? "border-[#17181C] bg-[#17181C] text-white"
                : "border-[#E6E5DE] text-[#3A3B40] hover:border-[#17181C] hover:bg-[#F6F5F0]"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="4" width="7" height="16" rx="1"/>
              <rect x="14" y="4" width="7" height="11" rx="1"/>
            </svg>
          </button>
          {/* Download button — wraps DownloadMenu popover */}
          <div
            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
            className="relative"
          >
            <DownloadMenu product={product} iconOnly />
          </div>
        </div>
      </div>
    </Link>
  );
}
