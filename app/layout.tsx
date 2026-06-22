import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });

export const metadata: Metadata = {
  title: "DoMusMat — B2B Catalogue",
  description: "Industrial lighting BIM catalogue",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${openSans.variable} font-sans text-ink bg-white antialiased`}><Providers>{children}</Providers></body>
    </html>
  );
}
