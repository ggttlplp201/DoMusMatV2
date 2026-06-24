# Backend Phase 1: Foundation (Supabase Auth + Accounts) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Supabase backend and customer/manager authentication, so B2B users can register (capturing country + company), log in, and view their account — with role-gated `/account` and `/admin` routes.

**Architecture:** Supabase (managed Postgres + Auth + RLS). Next.js 16 App Router talks to Supabase through `@supabase/ssr`: a browser client for client components, a server client (async `cookies()`) for server components/actions, and a session-refresh layer in Next 16's root `proxy.ts` (the renamed `middleware`). A `profiles` table (1:1 with `auth.users`, populated by a signup trigger) holds `country`, `company_name`, and `role`. RLS is the access boundary; route guards in `proxy.ts` use a pure `routeAccess()` helper.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19, TypeScript (strict), Tailwind v4, `@supabase/supabase-js`, `@supabase/ssr`, Vitest + @testing-library/react.

## Global Constraints

- **This is NOT the Next.js you know.** Next 16 has breaking changes. The `middleware` file convention is **deprecated and renamed to `proxy`**: the root file is `proxy.ts`, exporting a function named `proxy` (or default), with an optional `export const config = { matcher }`. (Source: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.)
- **`cookies()` is async** in Next 16 — `const cookieStore = await cookies()`. (Source: `…/04-functions/cookies.md`.)
- **Path alias:** `@/*` → repo root (tsconfig `paths`, vitest `resolve.alias`). Use `@/lib/...`, `@/state/...`.
- **i18n:** three locales `pt | en | zh`, **zh is default**. All user-facing strings go through `translate(locale, key)` / `useT()` and must be added to all three locales in `lib/i18n.ts`. `translate` falls back to `pt` then the key.
- **Default locale constant** lives in `state/locale.tsx` (`DEFAULT_LOCALE = "zh"`).
- **No live pricing/payments.** No price columns. Orders (Phase 2) are quote requests.
- **Secrets:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both public, safe behind RLS). No service-role key in app code.
- **Isolation from the configurator project (hard):** Work only in the `feat/backend-auth-orders` worktree at `…/DoMusMatV2-backend-wt`. **Never** edit `app/configurator*`, `components/configurator/*`, `state/configurator.*`, or configurator docs. Shared-file edits (`app/providers.tsx`, `components/nav/Nav.tsx`, `lib/i18n.ts`, `package.json`) must be **additive**. The `proxy.ts` `matcher` must be scoped to `/account` and `/admin` only, so it can never run on configurator routes.
- **Commit identity:** author "Leon"; **no `Co-Authored-By` trailer** (repo convention).
- **Test baseline:** `npm run test` (vitest). 3 pre-existing model-viewer WebGL failures are unrelated and expected; everything else must pass.

---

## File Structure

**Create:**
- `supabase/migrations/0001_profiles.sql` — `profiles` table, `is_manager()`, signup trigger, RLS policies.
- `.env.example` — documents the two required env vars.
- `lib/supabase/client.ts` — browser Supabase client factory.
- `lib/supabase/server.ts` — server Supabase client factory (async).
- `lib/supabase/proxy.ts` — `updateSession()` used by `proxy.ts`.
- `proxy.ts` (repo root) — session refresh + route guards.
- `lib/auth/roles.ts` — pure `routeAccess()` guard helper + `Role` type.
- `lib/auth/roles.test.ts`
- `lib/countries.ts` — country list + `countryName(code, locale)`.
- `lib/countries.test.ts`
- `state/auth.tsx` — `AuthProvider` + `useAuth()`.
- `components/nav/AccountMenu.tsx` — auth-aware account/login UI for the nav.
- `app/register/page.tsx`
- `app/login/page.tsx`
- `app/account/page.tsx`

**Modify (additive only):**
- `package.json` — add `@supabase/supabase-js`, `@supabase/ssr`.
- `app/providers.tsx` — wrap `AuthProvider` (outermost).
- `lib/i18n.ts` — add `auth.*` / `account.*` keys to pt/en/zh.
- `components/nav/Nav.tsx` — replace the two no-op login buttons with `<AccountMenu>`.

---

### Task 1: Supabase dependencies, env scaffold, and client factories

**Files:**
- Modify: `package.json`
- Create: `.env.example`, `lib/supabase/client.ts`, `lib/supabase/server.ts`

**Interfaces:**
- Produces: `createClient()` (browser) from `@/lib/supabase/client`; `createClient()` (async server) from `@/lib/supabase/server`. Both return a typed `SupabaseClient`.

- [ ] **Step 1: Install the Supabase packages (also writes them into `package.json`)**

Run (in the worktree root `…/DoMusMatV2-backend-wt`):
```bash
npm install @supabase/supabase-js @supabase/ssr
```
Expected: both appear under `dependencies` in `package.json`; `node_modules` populated for this worktree.

- [ ] **Step 2: Create `.env.example`**

```bash
# Supabase — copy to .env.local and fill with values from the Supabase project
# (Project Settings → API). Both are PUBLIC and safe to expose (RLS enforces access).
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Write the browser client factory `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Write the server client factory `lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Next 16: cookies() is async.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (read-only cookies). Safe to ignore —
            // proxy.ts refreshes the session cookie on guarded routes.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from the new files. (Env vars are typed as `string` via `!`; that's intentional.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat(backend): add supabase deps and client factories"
```

---

### Task 2: Database schema — `profiles`, RLS, and signup trigger

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`

**Interfaces:**
- Produces: `public.profiles(id, email, full_name, company_name, country, phone, role, created_at)`; SQL function `public.is_manager()`; trigger `on_auth_user_created`. Later tasks rely on `profiles.role ∈ {'customer','manager'}` and on the trigger reading `raw_user_meta_data` keys `full_name`, `company_name`, `country`, `phone`.

- [ ] **Step 1: Write the migration `supabase/migrations/0001_profiles.sql`**

```sql
-- profiles: one row per auth user, 1:1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  country text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'manager')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the current caller a manager? SECURITY DEFINER bypasses RLS,
-- which also avoids recursion inside the profiles SELECT policy below.
create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- A user can read their own profile; managers can read all.
create policy "profiles_select_own_or_manager"
  on public.profiles for select
  using (id = auth.uid() or public.is_manager());

-- A user can update their own profile; managers can update all.
create policy "profiles_update_own_or_manager"
  on public.profiles for update
  using (id = auth.uid() or public.is_manager())
  with check (id = auth.uid() or public.is_manager());

-- Insert happens only via the signup trigger (SECURITY DEFINER) — no client insert policy.

-- Signup trigger: create a profile from auth sign-up metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name, country, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    'customer'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Create the Supabase project and apply the migration**

This is the human-in-the-loop step (the user must be involved for project creation + secrets).
- Create a new Supabase project via the connected Supabase MCP integration (or dashboard).
- Apply `0001_profiles.sql` (Supabase SQL editor, MCP `apply_migration`, or `supabase db push`).
- Copy `Project URL` and `anon` key into a new `.env.local` (gitignored) in the worktree, and add the same two vars to the **Vercel** project (Settings → Environment Variables).
- In **Authentication → Sign In / Providers → Email**, **turn off "Confirm email"** for the demo so newly-registered users can log in immediately (no email round-trip). Note this in the PR description.

Expected: `select * from public.profiles;` runs (empty); `auth.users` has the trigger `on_auth_user_created`.

- [ ] **Step 3: Commit the migration**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat(backend): profiles table, RLS, and signup trigger"
```

---

### Task 3: Pure route-guard helper `routeAccess()`

**Files:**
- Create: `lib/auth/roles.ts`, `lib/auth/roles.test.ts`

**Interfaces:**
- Produces: `type Role = "customer" | "manager"`; `type AccessDecision = "allow" | "login" | "deny"`; `routeAccess(pathname: string, role: Role | null): AccessDecision`. Consumed by `proxy.ts` (Task 5) and conceptually mirrored by the nav admin-link visibility.

- [ ] **Step 1: Write the failing test `lib/auth/roles.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { routeAccess } from "./roles";

describe("routeAccess", () => {
  it("allows a manager into /admin and nested admin routes", () => {
    expect(routeAccess("/admin", "manager")).toBe("allow");
    expect(routeAccess("/admin/orders", "manager")).toBe("allow");
  });
  it("denies a customer from /admin", () => {
    expect(routeAccess("/admin", "customer")).toBe("deny");
  });
  it("sends an anonymous visitor on /admin to login", () => {
    expect(routeAccess("/admin", null)).toBe("login");
  });
  it("allows any authenticated user into /account", () => {
    expect(routeAccess("/account", "customer")).toBe("allow");
    expect(routeAccess("/account/orders", "manager")).toBe("allow");
  });
  it("sends an anonymous visitor on /account to login", () => {
    expect(routeAccess("/account", null)).toBe("login");
  });
  it("allows all roles (and anonymous) on unguarded routes", () => {
    expect(routeAccess("/catalogue", null)).toBe("allow");
    expect(routeAccess("/configurator", null)).toBe("allow");
    expect(routeAccess("/", "customer")).toBe("allow");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- lib/auth/roles.test.ts`
Expected: FAIL — cannot resolve `./roles` / `routeAccess` is not defined.

- [ ] **Step 3: Implement `lib/auth/roles.ts`**

```ts
export type Role = "customer" | "manager";
export type AccessDecision = "allow" | "login" | "deny";

export function routeAccess(pathname: string, role: Role | null): AccessDecision {
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");

  if (isAdmin) {
    if (role === "manager") return "allow";
    if (role === "customer") return "deny";
    return "login";
  }
  if (isAccount) {
    return role ? "allow" : "login";
  }
  return "allow";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- lib/auth/roles.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/roles.ts lib/auth/roles.test.ts
git commit -m "feat(backend): pure routeAccess guard helper + tests"
```

---

### Task 4: Localized country list `lib/countries.ts`

**Files:**
- Create: `lib/countries.ts`, `lib/countries.test.ts`

**Interfaces:**
- Produces: `interface Country { code: string; pt: string; en: string; zh: string }`; `const COUNTRIES: Country[]`; `countryName(code: string, locale: Locale): string` (falls back to `pt`, then the raw code). Consumed by the register form (country `<select>`) and the account/admin display.

- [ ] **Step 1: Write the failing test `lib/countries.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { COUNTRIES, countryName } from "./countries";

describe("countries", () => {
  it("localizes a country code per locale", () => {
    expect(countryName("PT", "pt")).toBe("Portugal");
    expect(countryName("PT", "en")).toBe("Portugal");
    expect(countryName("CN", "zh")).toBe("中国");
    expect(countryName("CN", "en")).toBe("China");
  });
  it("falls back to the raw code for an unknown country", () => {
    expect(countryName("ZZ", "en")).toBe("ZZ");
  });
  it("every country has all three localized names and a 2-letter code", () => {
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.pt.trim().length).toBeGreaterThan(0);
      expect(c.en.trim().length).toBeGreaterThan(0);
      expect(c.zh.trim().length).toBeGreaterThan(0);
    }
  });
  it("has unique codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- lib/countries.test.ts`
Expected: FAIL — cannot resolve `./countries`.

- [ ] **Step 3: Implement `lib/countries.ts`**

```ts
import type { Locale } from "./i18n";

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  pt: string;
  en: string;
  zh: string;
}

// Focused B2B list (Portugal home market, EU, China, and common export targets).
// Extend as needed; the register form renders these in the active locale.
export const COUNTRIES: Country[] = [
  { code: "PT", pt: "Portugal", en: "Portugal", zh: "葡萄牙" },
  { code: "ES", pt: "Espanha", en: "Spain", zh: "西班牙" },
  { code: "FR", pt: "França", en: "France", zh: "法国" },
  { code: "DE", pt: "Alemanha", en: "Germany", zh: "德国" },
  { code: "IT", pt: "Itália", en: "Italy", zh: "意大利" },
  { code: "GB", pt: "Reino Unido", en: "United Kingdom", zh: "英国" },
  { code: "NL", pt: "Países Baixos", en: "Netherlands", zh: "荷兰" },
  { code: "BE", pt: "Bélgica", en: "Belgium", zh: "比利时" },
  { code: "CH", pt: "Suíça", en: "Switzerland", zh: "瑞士" },
  { code: "IE", pt: "Irlanda", en: "Ireland", zh: "爱尔兰" },
  { code: "PL", pt: "Polónia", en: "Poland", zh: "波兰" },
  { code: "SE", pt: "Suécia", en: "Sweden", zh: "瑞典" },
  { code: "NO", pt: "Noruega", en: "Norway", zh: "挪威" },
  { code: "DK", pt: "Dinamarca", en: "Denmark", zh: "丹麦" },
  { code: "AT", pt: "Áustria", en: "Austria", zh: "奥地利" },
  { code: "CN", pt: "China", en: "China", zh: "中国" },
  { code: "HK", pt: "Hong Kong", en: "Hong Kong", zh: "香港" },
  { code: "US", pt: "Estados Unidos", en: "United States", zh: "美国" },
  { code: "BR", pt: "Brasil", en: "Brazil", zh: "巴西" },
  { code: "AE", pt: "Emirados Árabes Unidos", en: "United Arab Emirates", zh: "阿联酋" },
  { code: "AO", pt: "Angola", en: "Angola", zh: "安哥拉" },
  { code: "MZ", pt: "Moçambique", en: "Mozambique", zh: "莫桑比克" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryName(code: string, locale: Locale): string {
  const c = BY_CODE.get(code);
  if (!c) return code;
  return c[locale] ?? c.pt;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- lib/countries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/countries.ts lib/countries.test.ts
git commit -m "feat(backend): localized country list + countryName helper"
```

---

### Task 5: Session refresh + route guards in `proxy.ts`

**Files:**
- Create: `lib/supabase/proxy.ts`, `proxy.ts` (repo root)

**Interfaces:**
- Consumes: `createServerClient` from `@supabase/ssr`; `routeAccess` + `Role` from `@/lib/auth/roles` (Task 3).
- Produces: `updateSession(request): Promise<{ response: NextResponse; supabase: SupabaseClient; user: User | null }>` from `@/lib/supabase/proxy`; the root `proxy` function guarding `/account/*` and `/admin/*`.

- [ ] **Step 1: Write `lib/supabase/proxy.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch getUser() so the session cookie is refreshed on the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}
```

- [ ] **Step 2: Write the root `proxy.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { routeAccess, type Role } from "@/lib/auth/roles";

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  let role: Role | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as Role | undefined) ?? "customer";
  }

  const decision = routeAccess(path, role);

  if (decision === "login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (decision === "deny") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

// Scoped to guarded routes ONLY — never runs on configurator/static/other paths.
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (requires `.env.local` from Task 2)**

Run: `npm run dev`, then in a private window visit `http://localhost:3000/account`.
Expected: redirected to `/login?next=/account` (no session yet). Visiting `/catalogue` and `/configurator` behaves exactly as before (proxy does not run there).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/proxy.ts proxy.ts
git commit -m "feat(backend): proxy session refresh + role-based route guards"
```

---

### Task 6: `AuthProvider` and provider wiring

**Files:**
- Create: `state/auth.tsx`
- Modify: `app/providers.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (Task 1); `Role` from `@/lib/auth/roles`.
- Produces: `interface Profile { id; email; full_name; company_name: string | null; country; phone: string | null; role: Role }`; `useAuth(): { user: User | null; profile: Profile | null; role: Role | null; loading: boolean; signOut(): Promise<void> }`. Consumed by `AccountMenu` (Task 8), account page (Task 9), and later admin pages.

- [ ] **Step 1: Write `state/auth.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/auth/roles";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  country: string;
  phone: string | null;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(u: User | null) {
      if (!u) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (active) setProfile((data as Profile) ?? null);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user ?? null;
      setUser(u);
      loadProfile(u).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap `AuthProvider` in `app/providers.tsx` (outermost)**

Replace the file body with (additive — only adds the import and the wrapper):
```tsx
"use client";
import { LocaleProvider } from "@/state/locale";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { ListsProvider } from "@/state/lists";
import { CompareProvider } from "@/state/compare";
import { AnalyticsProvider } from "@/state/analytics";
import { AuthProvider } from "@/state/auth";
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><LocaleProvider><AnalyticsProvider><CartProvider><BomProvider><ListsProvider><CompareProvider>{children}</CompareProvider></ListsProvider></BomProvider></CartProvider></AnalyticsProvider></LocaleProvider></AuthProvider>;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add state/auth.tsx app/providers.tsx
git commit -m "feat(backend): AuthProvider + useAuth, wired into providers"
```

---

### Task 7: i18n keys for auth & account

**Files:**
- Modify: `lib/i18n.ts`

**Interfaces:**
- Produces translation keys consumed by Tasks 8–10. Keys (add to **all three** locales `pt`, `en`, `zh`):
  `auth.login.title`, `auth.login.submit`, `auth.login.email`, `auth.login.password`, `auth.login.noAccount`, `auth.login.registerLink`, `auth.login.error`,
  `auth.register.title`, `auth.register.submit`, `auth.register.fullName`, `auth.register.company`, `auth.register.country`, `auth.register.countryPlaceholder`, `auth.register.haveAccount`, `auth.register.loginLink`, `auth.register.error`,
  `auth.signOut`, `nav.account`, `nav.admin`,
  `account.title`, `account.email`, `account.company`, `account.country`, `account.role`, `account.role.customer`, `account.role.manager`.

- [ ] **Step 1: Add the keys to each locale block in `lib/i18n.ts`**

In the `pt` block, add:
```ts
    "auth.login.title": "Iniciar sessão",
    "auth.login.submit": "Entrar",
    "auth.login.email": "E-mail",
    "auth.login.password": "Palavra-passe",
    "auth.login.noAccount": "Ainda não tem conta?",
    "auth.login.registerLink": "Criar conta",
    "auth.login.error": "E-mail ou palavra-passe inválidos.",
    "auth.register.title": "Criar conta",
    "auth.register.submit": "Criar conta",
    "auth.register.fullName": "Nome completo",
    "auth.register.company": "Empresa",
    "auth.register.country": "País",
    "auth.register.countryPlaceholder": "Selecione o país…",
    "auth.register.haveAccount": "Já tem conta?",
    "auth.register.loginLink": "Iniciar sessão",
    "auth.register.error": "Não foi possível criar a conta.",
    "auth.signOut": "Terminar sessão",
    "nav.account": "Conta",
    "nav.admin": "Gestão",
    "account.title": "A minha conta",
    "account.email": "E-mail",
    "account.company": "Empresa",
    "account.country": "País",
    "account.role": "Tipo de conta",
    "account.role.customer": "Cliente",
    "account.role.manager": "Gestor",
```
In the `en` block, add:
```ts
    "auth.login.title": "Sign in",
    "auth.login.submit": "Sign in",
    "auth.login.email": "Email",
    "auth.login.password": "Password",
    "auth.login.noAccount": "Don’t have an account?",
    "auth.login.registerLink": "Create account",
    "auth.login.error": "Invalid email or password.",
    "auth.register.title": "Create account",
    "auth.register.submit": "Create account",
    "auth.register.fullName": "Full name",
    "auth.register.company": "Company",
    "auth.register.country": "Country",
    "auth.register.countryPlaceholder": "Select a country…",
    "auth.register.haveAccount": "Already have an account?",
    "auth.register.loginLink": "Sign in",
    "auth.register.error": "Could not create the account.",
    "auth.signOut": "Sign out",
    "nav.account": "Account",
    "nav.admin": "Admin",
    "account.title": "My account",
    "account.email": "Email",
    "account.company": "Company",
    "account.country": "Country",
    "account.role": "Account type",
    "account.role.customer": "Customer",
    "account.role.manager": "Manager",
```
In the `zh` block, add:
```ts
    "auth.login.title": "登录",
    "auth.login.submit": "登录",
    "auth.login.email": "电子邮箱",
    "auth.login.password": "密码",
    "auth.login.noAccount": "还没有账户？",
    "auth.login.registerLink": "注册账户",
    "auth.login.error": "邮箱或密码无效。",
    "auth.register.title": "注册账户",
    "auth.register.submit": "注册账户",
    "auth.register.fullName": "姓名",
    "auth.register.company": "公司",
    "auth.register.country": "国家/地区",
    "auth.register.countryPlaceholder": "请选择国家/地区…",
    "auth.register.haveAccount": "已有账户？",
    "auth.register.loginLink": "登录",
    "auth.register.error": "无法创建账户。",
    "auth.signOut": "退出登录",
    "nav.account": "账户",
    "nav.admin": "管理后台",
    "account.title": "我的账户",
    "account.email": "电子邮箱",
    "account.company": "公司",
    "account.country": "国家/地区",
    "account.role": "账户类型",
    "account.role.customer": "客户",
    "account.role.manager": "管理员",
```

- [ ] **Step 2: Verify the suite still loads i18n cleanly**

Run: `npm run test -- lib/i18n` (if an i18n test exists) and `npx tsc --noEmit`.
Expected: PASS / no type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n.ts
git commit -m "feat(backend): trilingual i18n keys for auth & account"
```

---

### Task 8: Register page `/register`

**Files:**
- Create: `app/register/page.tsx`

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/client`), `COUNTRIES` + `countryName` (`@/lib/countries`), `useT`/`useLocale` (`@/state/locale`), `localizedName` not needed. Calls `supabase.auth.signUp({ email, password, options: { data: { full_name, company_name, country } } })`.

- [ ] **Step 1: Write `app/register/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";

export default function RegisterPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: company, country } },
    });
    setBusy(false);
    if (error) {
      setError(t("auth.register.error"));
      return;
    }
    router.push("/account");
  }

  const field = "w-full h-11 border border-hairline bg-wash rounded px-3 text-[15px] text-ink outline-none focus:border-ink";

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-4 sm:px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("auth.register.title")}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-body">{t("auth.register.fullName")}
            <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="text-sm text-body">{t("auth.register.company")}
            <input className={field} value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label className="text-sm text-body">{t("auth.register.country")}
            <select className={field} value={country} onChange={(e) => setCountry(e.target.value)} required>
              <option value="" disabled>{t("auth.register.countryPlaceholder")}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{countryName(c.code, locale)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-body">{t("auth.login.email")}
            <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="text-sm text-body">{t("auth.login.password")}
            <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {error && <p className="text-sm text-brand">{error}</p>}
          <button type="submit" disabled={busy} className="mt-2 rounded bg-brand px-6 py-2 min-h-[44px] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {t("auth.register.submit")}
          </button>
        </form>
        <p className="mt-4 text-sm text-body">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-brand hover:underline">{t("auth.register.loginLink")}</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`, visit `/register`, submit a test account.
Expected: redirected to `/account`; in Supabase, `auth.users` has the new user and `public.profiles` has a row with the chosen `country` and `role = 'customer'`.

- [ ] **Step 3: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat(backend): registration page with country capture"
```

---

### Task 9: Login page `/login`

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient`, `useT`, `useSearchParams` (for `?next=`). Calls `supabase.auth.signInWithPassword`.

- [ ] **Step 1: Write `app/login/page.tsx`** (wrap the `useSearchParams` consumer in `<Suspense>`, per App Router requirements)

```tsx
"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/state/locale";

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(t("auth.login.error"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  const field = "w-full h-11 border border-hairline bg-wash rounded px-3 text-[15px] text-ink outline-none focus:border-ink";

  return (
    <main className="mx-auto max-w-md px-4 sm:px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold text-ink">{t("auth.login.title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-body">{t("auth.login.email")}
          <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="text-sm text-body">{t("auth.login.password")}
          <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-brand">{error}</p>}
        <button type="submit" disabled={busy} className="mt-2 rounded bg-brand px-6 py-2 min-h-[44px] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {t("auth.login.submit")}
        </button>
      </form>
      <p className="mt-4 text-sm text-body">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="text-brand hover:underline">{t("auth.login.registerLink")}</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Visit `/account` while logged out → redirected to `/login?next=/account` → sign in → land on `/account`.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(backend): login page with next-redirect"
```

---

### Task 10: Account page `/account`

**Files:**
- Create: `app/account/page.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/state/auth`), `countryName` (`@/lib/countries`), `useT`/`useLocale`. (Order history is Phase 2.)

- [ ] **Step 1: Write `app/account/page.tsx`**

```tsx
"use client";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/state/auth";
import { countryName } from "@/lib/countries";
import { useT, useLocale } from "@/state/locale";

export default function AccountPage() {
  const { profile, loading, signOut } = useAuth();
  const t = useT();
  const { locale } = useLocale();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("account.title")}</h1>
        {loading && <p className="text-body">…</p>}
        {!loading && profile && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted">{profile.full_name}</dt><dd />
            <dt className="text-muted">{t("account.email")}</dt><dd className="text-ink">{profile.email}</dd>
            <dt className="text-muted">{t("account.company")}</dt><dd className="text-ink">{profile.company_name || "—"}</dd>
            <dt className="text-muted">{t("account.country")}</dt><dd className="text-ink">{profile.country ? countryName(profile.country, locale) : "—"}</dd>
            <dt className="text-muted">{t("account.role")}</dt><dd className="text-ink">{t(`account.role.${profile.role}`)}</dd>
          </dl>
        )}
        {!loading && profile && (
          <button
            type="button"
            onClick={() => { void signOut(); }}
            className="mt-8 rounded border border-aluminium px-4 py-2 min-h-[44px] text-sm text-aluminium-dark hover:bg-neutral-fill"
          >
            {t("auth.signOut")}
          </button>
        )}
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Manual verification**

Logged in, visit `/account`: see name, email, company, localized country, role. Click sign out → session cleared; visiting `/account` again redirects to `/login`.

- [ ] **Step 3: Commit**

```bash
git add app/account/page.tsx
git commit -m "feat(backend): account page (profile view + sign out)"
```

---

### Task 11: Nav integration — `AccountMenu` (login / account / admin)

**Files:**
- Create: `components/nav/AccountMenu.tsx`
- Modify: `components/nav/Nav.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/state/auth`), `useT`. Renders: logged-out → a `/login` link styled like the existing login button; logged-in → a `/account` link plus a `/admin` link when `role === "manager"` and a sign-out button.

- [ ] **Step 1: Write `components/nav/AccountMenu.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useAuth } from "@/state/auth";
import { useT } from "@/state/locale";

export function AccountMenu({ variant }: { variant: "desktop" | "mobile" }) {
  const { user, role, loading, signOut } = useAuth();
  const t = useT();

  const loginClass =
    variant === "desktop"
      ? "hidden md:inline-flex items-center ml-2 h-10 px-5 border border-ink rounded text-[14px] font-medium text-ink bg-white hover:bg-ink hover:text-white transition-colors"
      : "flex items-center rounded border border-ink px-3 min-h-[44px] text-sm text-left hover:bg-ink hover:text-white transition-colors";

  if (loading) {
    return variant === "desktop" ? <span className="hidden md:inline-flex ml-2 h-10 w-24" aria-hidden /> : null;
  }

  if (!user) {
    return (
      <Link href="/login" className={loginClass}>
        {t("nav.login")}
      </Link>
    );
  }

  if (variant === "desktop") {
    return (
      <div className="hidden md:flex items-center gap-1 ml-2">
        {role === "manager" && (
          <Link href="/admin" className="inline-flex items-center h-10 px-3 rounded text-[14px] font-medium text-brand hover:bg-wash transition-colors">
            {t("nav.admin")}
          </Link>
        )}
        <Link href="/account" className="inline-flex items-center h-10 px-4 border border-ink rounded text-[14px] font-medium text-ink bg-white hover:bg-ink hover:text-white transition-colors">
          {t("nav.account")}
        </Link>
        <button type="button" onClick={() => { void signOut(); }} className="inline-flex items-center h-10 px-3 rounded text-[14px] text-muted hover:text-ink hover:bg-wash transition-colors">
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {role === "manager" && (
        <Link href="/admin" className="flex items-center min-h-[44px] text-sm font-medium text-brand">{t("nav.admin")}</Link>
      )}
      <Link href="/account" className="flex items-center min-h-[44px] text-sm text-ink">{t("nav.account")}</Link>
      <button type="button" onClick={() => { void signOut(); }} className="flex items-center min-h-[44px] text-sm text-left text-muted hover:text-ink">{t("auth.signOut")}</button>
    </div>
  );
}
```

- [ ] **Step 2: Use `AccountMenu` in `components/nav/Nav.tsx`**

Add the import after the existing imports (line 13 area):
```tsx
import { AccountMenu } from "@/components/nav/AccountMenu";
```
In the desktop right-cluster, replace the desktop login `<button>` (the `hidden md:inline-flex … {t("nav.login")} </button>`, currently lines 372–379) with:
```tsx
            {/* Account / Login — desktop */}
            <AccountMenu variant="desktop" />
```
In `MobileMenu`, replace the mobile login `<button>` (the `aria-label={t("nav.login")} … {t("nav.login")} </button>`, currently lines 228–234) with:
```tsx
        <AccountMenu variant="mobile" />
```
(Then add `import { AccountMenu } from "@/components/nav/AccountMenu";` is already added in Step 2; `MobileMenu` is in the same file so no extra import needed.)

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit && npm run test`
Expected: no type errors; suite green except the 3 known model-viewer WebGL failures.

- [ ] **Step 4: Manual verification across locales**

- Logged out: nav shows a localized "Login/登录/Iniciar sessão" link → `/login`.
- Logged in as customer: nav shows Account + Sign out, **no** Admin link.
- Promote your test user to manager (`update public.profiles set role='manager' where email='…';`), reload: Admin link appears and `/admin`… (Phase 3 builds the admin pages; for now `/admin` 404s, which is fine — guard already allows managers).

- [ ] **Step 5: Commit**

```bash
git add components/nav/AccountMenu.tsx components/nav/Nav.tsx
git commit -m "feat(backend): auth-aware nav (login / account / admin link)"
```

---

## Self-Review (performed against the spec)

- **Spec coverage (Phase 1 scope):** Supabase platform ✓ (Tasks 1–2); email+password auth ✓ (8, 9); `profiles` with country/company/role + signup trigger + RLS ✓ (2); two roles + `is_manager()` ✓ (2); `/register`, `/login`, `/account` ✓ (8–10); route guards via `proxy.ts` + pure helper ✓ (3, 5); `AuthProvider` + nav integration with manager-only Admin link ✓ (6, 11); trilingual i18n ✓ (7); localized country capture ✓ (4, 8); env wiring + Vercel ✓ (1, 2); isolation from configurator ✓ (matcher scoped, additive edits only). Order submission, order history, and the `/admin` dashboard are **Phase 2/3** (see below) — intentionally out of this plan.
- **Placeholder scan:** every code step contains full code; no "TBD"/"add error handling"/"similar to" placeholders.
- **Type consistency:** `Role` ("customer" | "manager") defined in Task 3, reused in Tasks 5, 6, 11. `Profile` defined in Task 6, consumed in 10/11. `createClient` names match across client/server (distinct modules). `routeAccess` signature consistent between definition (3) and use (5). i18n keys declared in Task 7 are exactly those consumed in 8–11 (`auth.*`, `nav.account`, `nav.admin`, `account.*`).

---

## Follow-on Plans (to be written via writing-plans, one each)

These build directly on Phase 1 and are **not** part of this plan's tasks. Each will be expanded into its own bite-sized plan.

**Phase 2 — Orders (`2026-…-backend-phase2-orders.md`)**
- `0002_orders.sql`: `orders` + `order_items` tables, `updated_at` trigger, RLS (own-rows insert/select; managers select/update all).
- `lib/order.ts#buildOrderPayload(items: BomItem[], ctx: { userId; source: "cart"|"bom"; locale })` (pure; TDD) — resolves each `BomItem` via `repo.findByRef`, snapshots `product_name`/`category`, sums `total_quantity`.
- A Server Action that inserts the order + items under the user's session (RLS-enforced).
- "Submit order/quote request" buttons replacing the demo submit on `/cart` and in the BOM (`/materiais` / `BomBuilder`), with logged-out → `/login?next=…`.
- Order history list on `/account`. New i18n keys for order statuses/labels.

**Phase 3 — Admin dashboard (`2026-…-backend-phase3-admin.md`)**
- `app/admin/layout.tsx` (manager shell), `/admin` KPIs (total customers, total orders, orders-by-country, top materials — aggregated from `order_items`).
- `/admin/orders` (list + filter by status/country + detail + status-change Server Action).
- `/admin/customers` (list with country/company + drill-into-orders).
- Admin i18n keys.
