import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      {/* TODO R2: full Home */}
      <main className="mx-auto max-w-[1440px] px-9 py-20">
        <h1 className="text-[40px] font-semibold tracking-[-0.025em] text-ink">DoMusMat</h1>
      </main>
      <Footer />
    </>
  );
}
