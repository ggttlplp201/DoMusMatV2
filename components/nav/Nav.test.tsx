import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Nav } from "./Nav";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { CompareProvider } from "@/state/compare";
import { ListsProvider } from "@/state/lists";
import { LocaleProvider } from "@/state/locale";
import { AuthProvider } from "@/state/auth";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: () => Promise.resolve({}),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <CartProvider>
          <BomProvider>
            <CompareProvider>
              <ListsProvider>
                {children}
              </ListsProvider>
            </CompareProvider>
          </BomProvider>
        </CartProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}

describe("Nav", () => {
  it("renders without crash", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
  });

  it("renders the DoMusMat logo link", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
    expect(screen.getByText("DoMusMat")).toBeDefined();
  });

  it("renders the cart link with aria-label 报价单", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
    expect(screen.getByLabelText("报价单")).toBeDefined();
  });

  it("renders Login button (general login, ZH default)", async () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
    // ZH default: "登录" — wait for auth loading to resolve (user=null → login link shown)
    await waitFor(() => expect(screen.getAllByText("登录").length).toBeGreaterThan(0));
  });
});
