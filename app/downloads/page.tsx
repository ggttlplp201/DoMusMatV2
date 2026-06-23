"use client";

import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { repo } from "@/lib/repository";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { hasRealValue } from "@/lib/placeholder";

export default function DownloadsPage() {
  const t = useT();
  const { locale } = useLocale();

  const products = repo.getProducts();
  const categories = repo.getCategories();

  // Group products by category (in catalogue order)
  const grouped = categories
    .map((cat) => ({
      category: cat,
      products: products.filter((p) => p.category === cat.id),
    }))
    .filter((g) => g.products.length > 0);

  return (
    <>
      <Nav />
      <main
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "64px 36px 96px",
        }}
        className="max-lg:!px-6 max-lg:!pt-10 max-lg:!pb-16"
      >
        {/* Page header */}
        <div style={{ marginBottom: "56px" }}>
          <div
            className="font-mono uppercase"
            style={{
              fontSize: "12px",
              letterSpacing: "0.14em",
              color: "#DA1E28",
              marginBottom: "16px",
            }}
          >
            DoMusMat · BIM / CAD
          </div>
          <h1
            style={{
              fontSize: "44px",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              margin: "0 0 16px",
            }}
            className="max-lg:!text-[32px]"
          >
            {t("downloads.title")}
          </h1>
          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.7,
              color: "#8C8C84",
              maxWidth: "560px",
              margin: 0,
            }}
          >
            {t("downloads.subtitle")}
          </p>
        </div>

        {/* Category sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
          {grouped.map(({ category, products: catProducts }) => (
            <section key={category.id}>
              {/* Section header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "20px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #E6E5DE",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    margin: 0,
                    color: "#17181C",
                  }}
                >
                  {localizedName(category, locale)}
                </h2>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    color: "#8C8C84",
                    background: "#F6F5F0",
                    border: "1px solid #E6E5DE",
                    borderRadius: "4px",
                    padding: "3px 8px",
                  }}
                >
                  {category.id.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#B4B4AC",
                    marginLeft: "auto",
                  }}
                >
                  {catProducts.length}{" "}
                  {locale === "zh" ? "个产品" : locale === "en" ? "products" : "produtos"}
                </span>
              </div>

              {/* Product rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {catProducts.map((product) => {
                  const assets = product.bim_assets ?? [];

                  return (
                    <div
                      key={product.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: "16px",
                        alignItems: "center",
                        background: "#fff",
                        border: "1px solid #E6E5DE",
                        borderRadius: "10px",
                        padding: "18px 22px",
                      }}
                      className="max-md:!grid-cols-1 max-md:!gap-3"
                    >
                      {/* Left: product info */}
                      <div>
                        <div
                          style={{
                            fontSize: "15.5px",
                            fontWeight: 600,
                            color: "#17181C",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {localizedName(product, locale)}
                        </div>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: "11px",
                            letterSpacing: "0.06em",
                            color: "#B4B4AC",
                            marginTop: "4px",
                          }}
                        >
                          {product.ref_prefix}
                        </div>
                      </div>

                      {/* Right: BIM asset chips */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          justifyContent: "flex-end",
                        }}
                        className="max-md:!justify-start"
                      >
                        {assets.length === 0 ? (
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "11px",
                              letterSpacing: "0.05em",
                              color: "#8C8C84",
                              border: "1px solid #E6E5DE",
                              borderRadius: "4px",
                              padding: "4px 9px",
                            }}
                          >
                            {t("fb.bimAsset")}
                          </span>
                        ) : (
                          assets.map((asset, idx) =>
                            hasRealValue(asset.file) ? (
                              <a
                                key={idx}
                                href={asset.file}
                                download
                                className="font-mono"
                                style={{
                                  fontSize: "11px",
                                  letterSpacing: "0.05em",
                                  color: "#fff",
                                  background: "#DA1E28",
                                  borderRadius: "4px",
                                  padding: "4px 9px",
                                  textDecoration: "none",
                                  transition: "background 0.15s",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title={asset.label || asset.format}
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  aria-hidden="true"
                                >
                                  <path d="M6 1v7m0 0L3 5m3 3 3-3M1 11h10" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {asset.format}
                              </a>
                            ) : (
                              <span
                                key={idx}
                                className="font-mono"
                                style={{
                                  fontSize: "11px",
                                  letterSpacing: "0.05em",
                                  color: "#8C8C84",
                                  border: "1px solid #E6E5DE",
                                  borderRadius: "4px",
                                  padding: "4px 9px",
                                }}
                                title={asset.label || asset.format}
                              >
                                {asset.format} · {t("download.request")}
                              </span>
                            )
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
