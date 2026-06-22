"use client";

import { useState } from "react";
import { repo } from "@/lib/repository";
import { hasRealValue } from "@/lib/placeholder";
import { ModelViewer } from "./ModelViewer";
import { Gallery } from "./Gallery";
import { VariantSelector } from "./VariantSelector";
import { CertBadges } from "./CertBadges";
import { SpecTable } from "./SpecTable";

interface DetailViewProps {
  productId: string;
}

export function DetailView({ productId }: DetailViewProps) {
  const product = repo.getProduct(productId);

  const [selectedRef, setSelectedRef] = useState<string>(
    () => product?.variants[0]?.ref ?? ""
  );

  if (!product) return null;

  const selectedVariant =
    product.variants.find((v) => v.ref === selectedRef) ?? product.variants[0];

  return (
    <div className="flex flex-col gap-8">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
        {/* Left: 3D viewer or gallery */}
        <div>
          {hasRealValue(product.model3d) ? (
            // TODO: per-variant GLB models
            <ModelViewer src={product.model3d} alt={product.name} />
          ) : (
            <Gallery images={product.images} alt={product.name} />
          )}
        </div>

        {/* Right: product info */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-ink">{product.name}</h1>
          <p className="text-aluminium-dark text-sm leading-relaxed">{product.description_pt}</p>
          <CertBadges product={product} />
          <VariantSelector
            variants={product.variants}
            selectedRef={selectedRef}
            onSelect={setSelectedRef}
          />
        </div>
      </div>

      {/* Full-width below sections */}
      {selectedVariant && (
        <SpecTable product={product} variant={selectedVariant} />
      )}

      {/* TASK 12: BimDownloadsCenter */}
      {/* TASK 13: CompliancePanel */}
      {/* TASK 14B: StandardSheet + InstallationDetails */}
      {/* TASK 14C: SupplyChainTimeline */}
      {/* TASK 14: OrderCalculator */}
    </div>
  );
}
