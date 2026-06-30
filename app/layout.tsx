import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Noto_Sans_SC, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { loadCatalogue } from "@/lib/catalogue/loadCatalogue";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

// Manrope drives the configurator chrome (per the nav redesign handoff)
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DoMusMat — B2B 产品目录",
  description: "工业照明 BIM 产品目录",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalogue = await loadCatalogue();
  return (
    <html lang="zh-CN">
      <body
        className={`${archivo.variable} ${ibmPlexMono.variable} ${notoSansSC.variable} ${manrope.variable} font-sans text-ink bg-white antialiased`}
      >
        <Providers catalogue={catalogue}>{children}</Providers>
      </body>
    </html>
  );
}
