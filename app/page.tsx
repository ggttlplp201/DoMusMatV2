"use client";

import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { repo } from "@/lib/repository";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { RenderModelCompare } from "@/components/home/RenderModelCompare";

// ─── Data (computed once at module level for perf) ─────────────────────────

const CATEGORY_CODES: Record<string, string> = {
  "iluminacao-led": "LED",
  pavimentos: "FLR",
  rodapes: "SKB",
  carpintaria: "JNR",
  drenagem: "DRN",
  portas: "DOR",
  serralharia: "MTL",
  espelhos: "MIR",
};

const CATEGORY_COUNTS: Record<string, number> = {
  "iluminacao-led": 12,
  pavimentos: 5,
  rodapes: 2,
  carpintaria: 3,
  drenagem: 3,
  portas: 12,
  serralharia: 1,
  espelhos: 9,
};

function computeStats() {
  const products = repo.getProducts();
  const categories = repo.getCategories();
  const formats = new Set<string>();
  let totalAssets = 0;
  for (const p of products) {
    if (p.bim_assets) {
      for (const a of p.bim_assets) {
        formats.add(a.format);
        totalAssets++;
      }
    }
  }
  return {
    productCount: products.length,
    categoryCount: categories.length,
    formatCount: formats.size,
    assetCount: totalAssets,
  };
}

const stats = computeStats();

// ─── Icons ─────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

// High Bay product for the hero compare slider
const HIGH_BAY_ID = "barra-led-high-bay";
const HIGH_BAY_MODEL = "/models/high_bay_led_bar.glb";
const highBayProduct = repo.getProduct(HIGH_BAY_ID);
const highBayImage = highBayProduct?.images?.[0] ?? null;

function HeroSection() {
  const t = useT();

  const titleLines = t("home.heroTitle").split("\n");

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        gap: "56px",
        alignItems: "center",
        padding: "84px 36px 72px",
        maxWidth: "1440px",
        margin: "0 auto",
      }}
      className="max-lg:!grid-cols-1 max-lg:!gap-10 max-lg:!px-6 max-lg:!pt-12 max-lg:!pb-10"
    >
      {/* Left: copy */}
      <div>
        {/* Red mono eyebrow */}
        <div
          className="font-mono uppercase"
          style={{
            fontSize: "12.5px",
            letterSpacing: "0.14em",
            color: "#DA1E28",
            marginBottom: "22px",
          }}
        >
          DoMusMat · Biblioteca de Produtos
        </div>

        {/* H1 */}
        <h1
          style={{
            fontSize: "58px",
            lineHeight: 1.04,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            margin: "0 0 24px",
          }}
          className="max-lg:!text-[40px]"
        >
          {titleLines[0]}
          {titleLines[1] && (
            <>
              <br />
              {titleLines[1]}
            </>
          )}
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.65,
            color: "#3A3B40",
            maxWidth: "480px",
            margin: "0 0 36px",
          }}
          className="max-lg:!text-[15px]"
        >
          {t("home.heroBody")}
        </p>

        {/* CTAs */}
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/catalogue"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "52px",
              padding: "0 28px",
              background: "#DA1E28",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            className="hover:!bg-[#B5161F]"
          >
            {t("home.cta.browse")}
          </Link>
          <Link
            href="/downloads"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              height: "52px",
              padding: "0 28px",
              background: "#fff",
              color: "#17181C",
              border: "1px solid #17181C",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
            }}
            className="hover:!bg-[#17181C] hover:!text-white"
          >
            <DownloadIcon />
            {t("home.cta.download")}
          </Link>
        </div>
      </div>

      {/* Right: render / 3D compare slider */}
      {highBayImage ? (
        <RenderModelCompare
          imageSrc={highBayImage}
          modelSrc={HIGH_BAY_MODEL}
          imageAlt="High Bay LED render"
        />
      ) : (
        <div
          style={{
            position: "relative",
            aspectRatio: "4/3",
            background: "#F6F5F0",
            border: "1px solid #E6E5DE",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        />
      )}
    </section>
  );
}

// ─── Stats Band ─────────────────────────────────────────────────────────────

function StatsBand() {
  const t = useT();

  const statItems = [
    { n: stats.productCount, label: t("home.stat.products") },
    { n: stats.categoryCount, label: t("home.stat.categories") },
    { n: stats.formatCount, label: t("home.stat.formats") },
    { n: stats.assetCount, label: t("home.stat.files") },
  ];

  return (
    <section
      style={{
        borderTop: "1px solid #E6E5DE",
        borderBottom: "1px solid #E6E5DE",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          maxWidth: "1440px",
          margin: "0 auto",
        }}
        className="max-sm:!grid-cols-2"
      >
        {statItems.map((s, i) => (
          <div
            key={i}
            style={{
              padding: "32px 36px",
              borderRight: i < statItems.length - 1 ? "1px solid #EFEEE8" : undefined,
            }}
            className="max-sm:!px-6 max-sm:!py-6"
          >
            <div
              style={{
                fontSize: "40px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
              className="max-sm:!text-[32px]"
            >
              {s.n}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#8C8C84",
                marginTop: "8px",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Categories ─────────────────────────────────────────────────────────────

function CategoriesSection() {
  const t = useT();
  const { locale } = useLocale();
  const categories = repo.getCategories();

  return (
    <section
      style={{
        padding: "72px 36px",
        maxWidth: "1440px",
        margin: "0 auto",
      }}
      className="max-lg:!px-6 max-lg:!py-10"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
        className="max-sm:flex-col max-sm:gap-3"
      >
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {t("home.cats.title")}
        </h2>
        <Link
          href="/catalogue"
          style={{
            fontSize: "14px",
            color: "#DA1E28",
            fontWeight: 500,
            textDecoration: "none",
          }}
          className="hover:underline"
        >
          {t("home.cats.viewAll")}
        </Link>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
        className="max-lg:!grid-cols-2"
      >
        {categories.map((cat) => {
          const code = CATEGORY_CODES[cat.id] ?? cat.id.toUpperCase().slice(0, 3);
          const count = CATEGORY_COUNTS[cat.id] ?? 0;
          const countSuffix = t("home.cats.countSuffix");
          return (
            <Link
              key={cat.id}
              href={`/catalogue?category=${cat.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "#fff",
                padding: "28px 24px",
                minHeight: "150px",
                border: "1px solid #E6E5DE",
                borderRadius: "12px",
                textDecoration: "none",
                color: "inherit",
                transition: "background 0.15s, border-color 0.15s",
              }}
              className="hover:!bg-wash hover:!border-[#D8D7CF]"
            >
              {/* Mono code */}
              <div
                className="font-mono"
                style={{
                  fontSize: "12px",
                  color: "#B4B4AC",
                }}
              >
                {code}
              </div>

              {/* Name + count */}
              <div>
                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "#17181C",
                  }}
                >
                  {localizedName(cat, locale)}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#8C8C84",
                    marginTop: "5px",
                  }}
                >
                  {count} {countSuffix}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Featured Downloads ─────────────────────────────────────────────────────

function FeaturedSection() {
  const t = useT();
  const { locale } = useLocale();
  const products = repo.getProducts().slice(0, 3);
  const categories = repo.getCategories();

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <section
      style={{
        padding: "0 36px 84px",
        maxWidth: "1440px",
        margin: "0 auto",
      }}
      className="max-lg:!px-6 max-lg:!pb-12"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
        className="max-sm:flex-col max-sm:gap-2"
      >
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {t("home.featured.title")}
        </h2>
        <span
          className="font-mono uppercase"
          style={{
            fontSize: "12px",
            letterSpacing: "0.08em",
            color: "#8C8C84",
          }}
        >
          BIM · CAD · RENDER
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
        className="max-lg:!grid-cols-1"
      >
        {products.map((product) => {
          const image = product.images?.[0] ?? null;
          const cat = catMap[product.category];
          const catName = cat ? localizedName(cat, locale).toUpperCase() : product.category.toUpperCase();
          const formats = [...new Set(product.bim_assets?.map((a) => a.format) ?? [])].slice(0, 4);

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                border: "1px solid #E6E5DE",
                borderRadius: "14px",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                transition: "background 0.15s, border-color 0.15s",
              }}
              className="hover:!bg-[#FAFAF7] hover:!border-[#D8D7CF]"
            >
              {/* 4:3 image */}
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4/3",
                  background: "#F6F5F0",
                  overflow: "hidden",
                }}
              >
                {image ? (
                  <Image
                    src={image}
                    alt={localizedName(product, locale)}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0, background: "#F6F5F0" }} />
                )}
              </div>

              {/* Body */}
              <div style={{ padding: "20px 22px" }}>
                {/* Category eyebrow */}
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: "11.5px",
                    letterSpacing: "0.06em",
                    color: "#B4B4AC",
                  }}
                >
                  {catName}
                </div>

                {/* Title */}
                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    marginTop: "8px",
                    letterSpacing: "-0.01em",
                    color: "#17181C",
                  }}
                >
                  {localizedName(product, locale)}
                </div>

                {/* Format badges */}
                <div style={{ display: "flex", gap: "5px", marginTop: "14px", flexWrap: "wrap" }}>
                  {formats.map((fmt) => (
                    <span
                      key={fmt}
                      className="font-mono"
                      style={{
                        fontSize: "10.5px",
                        letterSpacing: "0.04em",
                        color: "#3A3B40",
                        border: "1px solid #E6E5DE",
                        borderRadius: "3px",
                        padding: "3px 7px",
                      }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <StatsBand />
        <CategoriesSection />
        <FeaturedSection />
      </main>
      <Footer />
    </>
  );
}
