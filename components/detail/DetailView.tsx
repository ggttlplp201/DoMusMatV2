"use client";

import { useState, useEffect } from "react";
import { repo } from "@/lib/repository";
import { hasRealValue } from "@/lib/placeholder";
import { ModelViewer } from "./ModelViewer";
import { Gallery } from "./Gallery";
import { VariantSelector } from "./VariantSelector";
import { CertBadges } from "./CertBadges";
import { SpecTable } from "./SpecTable";
import { BimDownloadsCenter } from "./BimDownloadsCenter";
import { BimMetadataSummary } from "./BimMetadataSummary";
import { CompliancePanel } from "./CompliancePanel";
import { StandardSheet } from "./StandardSheet";
import { InstallationDetails } from "./InstallationDetails";
import { SupplyChainTimeline } from "./SupplyChainTimeline";
import { OrderCalculator } from "@/components/calculator/OrderCalculator";
import { useAnalytics } from "@/state/analytics";
import { ViewModeToggle } from "./ViewModeToggle";
import { useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";

interface DetailViewProps {
  productId: string;
}

export function DetailView({ productId }: DetailViewProps) {
  const product = repo.getProduct(productId);

  const modelAvailable = hasRealValue(product?.model3d);

  const [selectedRef, setSelectedRef] = useState<string>(
    () => product?.variants[0]?.ref ?? ""
  );
  const [viewMode, setViewMode] = useState<"rendered" | "model">(
    () => (modelAvailable ? "model" : "rendered")
  );
  const analytics = useAnalytics();
  const { locale } = useLocale();

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

  return (
    <div className="flex flex-col gap-8 pb-24 lg:pb-0">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
        {/* Left: 3D viewer or gallery */}
        <div>
          <ViewModeToggle
            mode={viewMode}
            onChange={setViewMode}
            modelAvailable={modelAvailable}
          />
          {viewMode === "model" && modelAvailable ? (
            // TODO: per-variant GLB models
            <ModelViewer src={product.model3d} alt={localizedName(product, locale)} />
          ) : (
            <Gallery images={product.images} alt={localizedName(product, locale)} />
          )}
        </div>

        {/* Right: product info */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-ink">{localizedName(product, locale)}</h1>
          <p className="text-aluminium-dark text-sm leading-relaxed">{description}</p>
          <CertBadges product={product} />
          <VariantSelector
            variants={product.variants}
            selectedRef={selectedRef}
            onSelect={handleVariantSelect}
          />
          {/* OrderCalculator: right rail on lg+, hidden here on mobile (shown in sticky bar below) */}
          <div className="hidden lg:block">
            <OrderCalculator variantRef={selectedRef} />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar: only visible below lg */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-aluminium bg-white px-4 py-3 shadow-lg">
        <OrderCalculator variantRef={selectedRef} />
      </div>

      {/* Full-width below sections */}
      {selectedVariant && (
        <SpecTable product={product} variant={selectedVariant} />
      )}

      {/* TASK 12 */}
      <div className="space-y-10">
        <BimDownloadsCenter product={product} />
        <BimMetadataSummary product={product} />
        {/* TASK 13 */}
        <CompliancePanel product={product} />
        {/* TASK 14B */}
        <StandardSheet product={product} />
        <InstallationDetails product={product} />
        {/* TASK 14C */}
        <SupplyChainTimeline product={product} />
      </div>
    </div>
  );
}
