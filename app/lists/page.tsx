"use client";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { SavedLists } from "@/components/lists/SavedLists";
import { useT } from "@/state/locale";

export default function ListsPage() {
  const t = useT();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("lists.title")}</h1>
        <SavedLists />
      </main>
      <Footer />
    </>
  );
}
