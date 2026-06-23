"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/repository";
import { hasRealValue } from "@/lib/placeholder";
import { ModelViewer } from "./ModelViewer";
import { Gallery } from "./Gallery";
import { VariantSelector } from "./VariantSelector";
import { SpecTable } from "./SpecTable";
import { BimMetadataSummary } from "./BimMetadataSummary";
import { CompliancePanel } from "./CompliancePanel";
import { useAnalytics } from "@/state/analytics";
import { useLocale, useT } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { useCart } from "@/state/cart";
import { useBom } from "@/state/bom";

const NODE_LABEL_KEY: Record<string, string> = {
  "Produção": "supply.node.production",
  "Expedição": "supply.node.dispatch",
  "Transporte": "supply.node.transport",
  "Em obra": "supply.node.onsite",
};

const ASSET_LABEL_KEY: Record<string, string> = {
  "Ficha Técnica": "bim.asset.fichatecnica",
};

const tabBase = "pb-[14px] text-[15px] font-medium cursor-pointer transition-colors select-none";
const tabActive = "text-[#17181C] border-b-2 border-[#DA1E28] -mb-px";
const tabInactive = "text-[#8C8C84] border-b-2 border-transparent -mb-px hover:text-[#17181C]";
const tabDisabled = "text-[#B4B4AC] border-b-2 border-transparent -mb-px cursor-not-allowed";

interface DetailViewProps {
  productId: string;
}

export function DetailView({ productId }: DetailViewProps) {
  const product = repo.getProduct(productId);
  const analytics = useAnalytics();
  const { locale } = useLocale();
  const t = useT();
  const { add: addToCart } = useCart();
  const { add: addToBom } = useBom();
  const searchParams = useSearchParams();

  const modelAvailable = hasRealValue(product?.model3d);

  const [selectedRef, setSelectedRef] = useState<string>(
    () => product?.variants[0]?.ref ?? ""
  );
  const [mediaTab, setMediaTab] = useState<"render" | "model" | "tech">(
    () => (searchParams.get("view") === "3d" && modelAvailable ? "model" : "render")
  );
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) analytics.track({ type: "view", ref: product.id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const description =
    locale === "en" && hasRealValue(product.description_en)
      ? product.description_en
      : locale === "zh" && hasRealValue(product.description_zh)
        ? product.description_zh
        : product.description_pt;

  function handleVariantSelect(ref: string) {
    setSelectedRef(ref);
    analytics.track({ type: "view", ref });
  }

  const selectedVariant =
    product.variants.find((v) => v.ref === selectedRef) ?? product.variants[0];

  // Category name
  const categories = repo.getCategories();
  const category = categories.find((c) => c.id === product.category);
  const categoryName = category ? localizedName(category, locale) : product.category;

  // Cert chips
  const specs = product.shared_specs as Record<string, unknown>;
  const certChips: string[] = [];
  const certs = specs.certificates;
  if (hasRealValue(certs) && Array.isArray(certs)) {
    for (const c of certs as string[]) { if (hasRealValue(c)) certChips.push(c); }
  }
  const ip = specs.ip_rating;
  if (hasRealValue(ip)) certChips.push(`IP${ip}`);
  const energy = specs.energy_class;
  if (hasRealValue(energy)) certChips.push(String(energy));

  // Power label from selected variant
  const powerLabel = hasRealValue(selectedVariant?.attrs?.power_w)
    ? `${selectedVariant.attrs.power_w} W`
    : null;

  // Tab pill labels
  const tabPillLabels: Record<"render" | "model" | "tech", string> = {
    render: t("detail.tab.render.label") || "Vista renderizada · RENDER",
    model: t("detail.tab.model.label") || "Modelo 3D",
    tech: t("detail.tab.tech.label") || "Desenho técnico · DRAWING",
  };

  // Supply chain
  const chain = product.supply_chain;
  const supplyNodes = chain?.delivery_nodes ?? [];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-[9px] py-[22px] text-[13.5px] text-[#8C8C84]">
        <Link href="/catalogue" className="flex items-center gap-[6px] hover:text-[#17181C] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          {t("detail.back") || "返回目录"}
        </Link>
        <span style={{ color: "#D8D7CF" }}>/</span>
        <span>{categoryName}</span>
        <span style={{ color: "#D8D7CF" }}>/</span>
        <span className="text-[#17181C]">{localizedName(product, locale)}</span>
      </nav>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-14 pb-10 items-start">

        {/* LEFT: Media column */}
        <div>
          {/* Tab row */}
          <div role="tablist" aria-label={t("detail.tab.render") || "Media"} className="flex gap-7 border-b border-[#E6E5DE] mb-[22px]">
            <button
              type="button"
              role="tab"
              aria-selected={mediaTab === "render"}
              aria-controls="media-panel"
              id="tab-render"
              className={`${tabBase} ${mediaTab === "render" ? tabActive : tabInactive}`}
              onClick={() => setMediaTab("render")}
            >
              {t("detail.tab.render") || "Vista renderizada"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mediaTab === "model"}
              aria-controls="media-panel"
              id="tab-model"
              className={`${tabBase} flex items-center gap-2 ${
                mediaTab === "model" ? tabActive : modelAvailable ? tabInactive : tabDisabled
              }`}
              onClick={() => { if (modelAvailable) setMediaTab("model"); }}
              disabled={!modelAvailable}
            >
              {t("detail.tab.model") || "Modelo 3D"}
              {!modelAvailable && (
                <span className="text-[10px] font-semibold tracking-[0.04em] text-white bg-[#B4B4AC] rounded-[3px] px-[6px] py-[2px]">
                  {t("detail.comingSoon") || "即将推出"}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mediaTab === "tech"}
              aria-controls="media-panel"
              id="tab-tech"
              className={`${tabBase} ${mediaTab === "tech" ? tabActive : tabInactive}`}
              onClick={() => setMediaTab("tech")}
            >
              {t("detail.tab.tech") || "Desenho técnico"}
            </button>
          </div>

          {/* Media area */}
          <div
            id="media-panel"
            role="tabpanel"
            aria-labelledby={`tab-${mediaTab}`}
            className="relative"
          >
            {mediaTab === "render" && (
              <Gallery images={product.images} alt={localizedName(product, locale)} />
            )}
            {mediaTab === "model" && modelAvailable && (
              <div className="bg-[#F6F5F0] border border-[#E6E5DE] rounded-[14px] overflow-hidden">
                <ModelViewer src={product.model3d} alt={localizedName(product, locale)} />
              </div>
            )}
            {mediaTab === "tech" && (
              <div className="aspect-square bg-[#F6F5F0] border border-[#E6E5DE] rounded-[14px] overflow-hidden flex items-center justify-center">
                <span className="text-[#8C8C84] text-sm">{t("detail.techDrawing")}</span>
              </div>
            )}
            {/* Bottom-left pill */}
            <div className={`absolute left-4 font-mono text-[11px] tracking-[0.08em] text-white bg-black/55 px-[9px] py-[5px] rounded-[3px] pointer-events-none ${mediaTab === "render" ? "bottom-[100px]" : "bottom-4"}`}>
              {tabPillLabels[mediaTab]}
            </div>
          </div>
        </div>

        {/* RIGHT: Info column */}
        <div>
          {/* Mono red eyebrow: category name */}
          <div className="font-mono text-[12px] tracking-[0.1em] uppercase text-[#DA1E28] mb-3">
            {categoryName}
          </div>

          {/* H1 */}
          <h1 className="text-[40px] font-semibold tracking-[-0.025em] leading-[1.05] mb-[18px] text-[#17181C]">
            {localizedName(product, locale)}
          </h1>

          {/* Description */}
          <p className="text-[15.5px] leading-[1.65] text-[#3A3B40] mb-[22px]">{description}</p>

          {/* Cert chips */}
          {certChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {certChips.map((chip) => (
                <span key={chip} className="text-[13px] text-[#3A3B40] border border-[#E6E5DE] rounded-[4px] px-[13px] py-[6px]">{chip}</span>
              ))}
            </div>
          )}

          {/* Power row: muted label + red-outlined chip + mono ref */}
          {(powerLabel || selectedVariant?.ref) && (
            <div className="flex items-center gap-[10px] mb-[30px]">
              {powerLabel && (
                <>
                  <span className="text-[13px] text-[#8C8C84]">{t("spec.power") || "功率"}</span>
                  <span className="text-[14px] font-semibold text-[#DA1E28] border-[1.5px] border-[#DA1E28] rounded-[4px] px-[16px] py-[7px]">{powerLabel}</span>
                </>
              )}
              <span className="font-mono text-[13px] text-[#8C8C84]">{selectedVariant?.ref}</span>
            </div>
          )}

          {/* VariantSelector (only if variants.length > 1) */}
          {product.variants.length > 1 && (
            <div className="mb-6">
              <VariantSelector variants={product.variants} selectedRef={selectedRef} onSelect={handleVariantSelect} />
            </div>
          )}

          {/* Download panel */}
          <div className="border border-[#17181C] rounded-[12px] overflow-hidden">
            {/* Dark header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#17181C] text-white">
              <span className="text-[15px] font-semibold flex items-center gap-[9px]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>
                </svg>
                {t("download.heading")}
              </span>
              <span className="font-mono text-[11px] tracking-[0.06em] text-[#9A9A92]">
                {product.bim_assets.length}{t("download.fileCount")}
              </span>
            </div>

            {/* Asset rows — 2-column grid on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              {product.bim_assets.map((asset, idx) => {
                const localizedLabel = ASSET_LABEL_KEY[asset.label] ? t(ASSET_LABEL_KEY[asset.label]) : asset.label;
                const meta = `${asset.format}${hasRealValue(asset.size) ? ` · ${asset.size}` : ""}`;
                const isReal = hasRealValue(asset.file);
                return (
                  <div key={asset.label + asset.format} className="flex items-center gap-[14px] px-5 py-3 border-b border-r border-[#EFEEE8] [&:nth-child(even)]:border-r-0 last:border-b-0 [&:nth-last-child(2):nth-child(odd)]:border-b-0">
                    {/* Format badge */}
                    <span className="font-mono text-[11px] font-medium text-[#17181C] bg-[#F6F5F0] border border-[#E6E5DE] rounded-[3px] px-2 py-[6px] min-w-[46px] text-center shrink-0">{asset.format}</span>
                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-medium text-[#17181C] truncate">{localizedLabel}</div>
                      <div className="font-mono text-[12px] text-[#8C8C84] mt-[2px]">{meta}</div>
                    </div>
                    {/* Action */}
                    {isReal ? (
                      <a
                        href={asset.file}
                        download
                        className="flex items-center gap-[7px] h-9 px-4 bg-[#DA1E28] text-white rounded-[4px] text-[13.5px] font-semibold hover:bg-[#B5161F] transition-colors shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>
                        </svg>
                        {t("download.trigger") || "下载"}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-[7px] h-9 px-4 bg-white text-[#17181C] border border-[#C9C8C0] rounded-[4px] text-[13.5px] font-medium hover:border-[#17181C] hover:bg-[#F6F5F0] transition-colors shrink-0"
                      >
                        {t("download.request")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="px-5 py-[13px] text-[12px] text-[#8C8C84] bg-[#FAFAF7]">
              {t("download.loginNote")}
            </div>
          </div>

          {/* Quote panel */}
          <div className="border border-[#E6E5DE] rounded-[12px] p-[22px] mt-[18px]">
            <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8C8C84] mb-4">
              {t("quote.label")}
            </div>
            <div className="flex items-center gap-[14px] mb-[18px]">
              {/* Qty stepper */}
              <div className="flex border border-[#E6E5DE] rounded-[4px] overflow-hidden">
                <button
                  type="button"
                  className="w-10 h-[42px] flex items-center justify-center text-[#17181C] hover:bg-[#F6F5F0] transition-colors"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label={t("qty.decrease")}
                >
                  −
                </button>
                <div className="w-12 h-[42px] flex items-center justify-center border-x border-[#E6E5DE] text-[15px] font-medium text-[#17181C]">
                  {qty}
                </div>
                <button
                  type="button"
                  className="w-10 h-[42px] flex items-center justify-center text-[#17181C] hover:bg-[#F6F5F0] transition-colors"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label={t("qty.increase")}
                >
                  +
                </button>
              </div>
              {/* Price / lead time info */}
              <div className="flex-1">
                <div className="flex justify-between text-[13.5px] py-[3px]">
                  <span className="text-[#8C8C84]">{t("detail.unitPrice")}</span>
                  <span className="font-medium text-[#3A3B40]">{t("fb.price") || "价格面议"}</span>
                </div>
                <div className="flex justify-between text-[13.5px] py-[3px]">
                  <span className="text-[#8C8C84]">{t("detail.leadTime")}</span>
                  <span className="font-medium text-[#3A3B40]">{t("fb.leadTime") || "交期面议"}</span>
                </div>
              </div>
            </div>

            {/* Add to quote */}
            <button
              type="button"
              className="w-full h-12 bg-[#DA1E28] text-white border-none rounded-[4px] text-[15px] font-semibold cursor-pointer mb-[10px] hover:bg-[#B5161F] transition-colors"
              onClick={() => { addToCart(selectedRef, qty); analytics.track({ type: "add_to_quote", ref: selectedRef }); }}
            >
              {t("order.addToQuote")}
            </button>
            {/* Add to BOM */}
            <button
              type="button"
              className="w-full h-12 bg-white text-[#17181C] border border-[#E6E5DE] rounded-[4px] text-[15px] font-medium cursor-pointer hover:border-[#17181C] transition-colors"
              onClick={() => { addToBom(selectedRef, qty); analytics.track({ type: "add_to_bom", ref: selectedRef }); }}
            >
              {t("order.addToBom")}
            </button>
            <p className="text-[12px] text-[#8C8C84] mt-[14px] text-center">{t("order.vatNote")}</p>
          </div>
        </div>
      </div>

      {/* Specs section */}
      <section className="border-t border-[#E6E5DE] pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-16 items-start">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] mb-[22px] text-[#17181C]">
              {t("spec.title") || "技术参数"}
            </h2>
            {selectedVariant && <SpecTable product={product} variant={selectedVariant} />}
          </div>
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] mb-[22px] text-[#17181C]">{t("bim.metadata") || "BIM 元数据"}</h2>
            <div className="mb-9"><BimMetadataSummary product={product} /></div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] mb-[18px] text-[#17181C]">{t("compliance.title") || "合规与认证"}</h2>
            <CompliancePanel product={product} />
          </div>
        </div>
      </section>

      {/* Supply chain section */}
      {chain && supplyNodes.length > 0 && (
        <section className="border-t border-[#E6E5DE] pt-12 pb-[72px]">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] mb-6 text-[#17181C]">
            {t("supply.title") || "供应链"}
            <span className="font-mono text-[12px] font-normal text-[#8C8C84] tracking-[0.06em] ml-2">SUPPLY CHAIN</span>
          </h2>
          <div className="flex gap-[14px]">
            {supplyNodes.map((node, i) => (
              <div key={node.label} className="flex-1 border border-[#E6E5DE] rounded-[12px] px-5 py-[22px]">
                <div className="font-mono text-[11px] text-[#B4B4AC] mb-[10px]">{String(i + 1).padStart(2, "0")}</div>
                <div className="text-[17px] font-semibold text-[#17181C]">
                  {NODE_LABEL_KEY[node.label] ? t(NODE_LABEL_KEY[node.label]) : node.label}
                </div>
                <div className="text-[13px] text-[#8C8C84] mt-1.5">
                  {hasRealValue(node.eta) ? String(node.eta) : t("fb.eta") || "预计时间待定"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[13.5px] text-[#8C8C84] mt-[18px]">
            {t("supply.stock") || "库存"}：
            <span className="text-[#17181C]">{hasRealValue(chain.stock) ? String(chain.stock) : t("fb.stock") || "库存面议"}</span>
            {" · "}
            {t("supply.installNote") || "安装说明按需提供"}
          </p>
        </section>
      )}
    </div>
  );
}
