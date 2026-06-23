import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

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

export const metadata: Metadata = {
  title: "DoMusMat — B2B 产品目录",
  description: "工业照明 BIM 产品目录",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body
        className={`${archivo.variable} ${ibmPlexMono.variable} ${notoSansSC.variable} font-sans text-ink bg-white antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
