# DoMusMat Backend: Auth, Orders & Admin — Design

**Date:** 2026-06-24
**Status:** Approved design (pending spec review)
**Branch:** `feat/backend-auth-orders` (worktree off `main`, isolated from `feat/virtual-showroom-configurator`)

## Problem

The DoMusMat B2B catalogue is currently frontend-only: cart/quote, material list (BOM),
saved lists, comparison, and analytics all live in browser `localStorage`. There is no
server, no database, and no concept of a user account.

The company needs an actual backend that:

1. Lets B2B customers register and log in, capturing **who they are and what country
   they're from**.
2. Persists **what materials they ordered** (submitted quote/order requests) against
   their account.
3. Gives the internal managing team a place to **view and manage** all customers, their
   countries, and their orders — plus useful aggregate data (orders by country, top
   ordered materials).

## Non-Goals

- **No live pricing / payments.** The catalogue is placeholder-priced by design; orders
  are *quote requests*, not invoices. No price columns, no checkout/payment.
- **No multi-user company team accounts** (multiple buyers under one company with
  invites/seats). One account = one buyer. Revisit later if needed.
- **No social login / MFA** in this scope (email + password only).
- **No changes to the virtual-showroom-configurator project.** That work proceeds
  independently on its own branch; this design must not modify configurator files.

## Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Platform | **Supabase** (managed Postgres + Auth + Row-Level Security) |
| Supabase project | **Create a new project** via the connected Supabase integration |
| Who authenticates | **B2B customers + internal managers** (two roles) |
| Sign-in method | **Email + password** |
| What persists | **Submitted quote/order requests** (in-progress cart stays in `localStorage`) |
| Admin interface | **Custom in-app `/admin` dashboard** (manager-gated) |
| Identity provider | **Supabase Auth** (not Clerk) — native RLS via `auth.uid()`, single vendor |

## Architecture

```
Browser (Next.js 16 App Router)
  ├─ @supabase/ssr browser client  ──► Supabase Auth (email+password)
  │     cookie session
  ├─ Server Components / Route Handlers / Server Actions
  │     └─ @supabase/ssr server client (reads cookie session)  ──► Supabase Postgres
  └─ middleware.ts  (refreshes session, guards /account/* and /admin/*)

Supabase Postgres
  ├─ auth.users           (managed by Supabase Auth)
  ├─ public.profiles      (1:1 with auth.users, role + country + company)
  ├─ public.orders        (submitted quote/order requests)
  └─ public.order_items   (line items, snapshotted)
  └─ Row-Level Security enforces: customer sees only own rows; manager sees all
```

The **anon key** is shipped to the browser (safe — RLS is the access boundary). No
service-role key in client code. All privileged reads (admin) happen through the logged-in
manager's own session; RLS grants managers full read/update.

## Data Model

### `profiles`
One row per auth user, created automatically by a trigger on `auth.users` insert.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users.id`, `on delete cascade` |
| `email` | `text` | mirrored from auth for convenient admin display |
| `full_name` | `text` | |
| `company_name` | `text` | nullable |
| `country` | `text` | ISO-3166 alpha-2 code (e.g. `PT`, `CN`); rendered to localized name in UI |
| `phone` | `text` | nullable |
| `role` | `text` | `'customer'` \| `'manager'`, default `'customer'`, CHECK-constrained |
| `created_at` | `timestamptz` | default `now()` |

`full_name`, `company_name`, `country` are passed at sign-up via auth `options.data`
(user metadata) and copied into `profiles` by the trigger.

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `profiles.id`, `on delete cascade` |
| `source` | `text` | `'cart'` \| `'bom'` (which surface it was submitted from) |
| `status` | `text` | `'submitted'` \| `'in_review'` \| `'quoted'` \| `'fulfilled'` \| `'cancelled'`, default `'submitted'` |
| `note` | `text` | optional customer message |
| `locale` | `text` | `'zh'` \| `'en'` \| `'pt'` — language used when ordering |
| `total_quantity` | `int` | denormalized sum of item quantities |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, bumped by trigger on update |

### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` | FK → `orders.id`, `on delete cascade` |
| `product_ref` | `text` | variant SKU/ref (matches `BomItem.ref`) |
| `product_id` | `text` | catalogue product id |
| `product_name_snapshot` | `text` | product name at order time (survives catalogue edits) |
| `category` | `text` | category id at order time |
| `quantity` | `int` | |

### Row-Level Security

RLS enabled on all three public tables. A helper `is_manager()` SQL function reads the
caller's role from `profiles`.

- **profiles:** user may `select`/`update` their own row (`id = auth.uid()`). Managers may
  `select` all and `update` all (e.g. role changes later). Insert is performed by the
  signup trigger (security definer), not by clients.
- **orders / order_items:** user may `insert` and `select` rows where the order's
  `user_id = auth.uid()`. Managers may `select` all and `update` all (status changes).
  Item visibility derives from parent order ownership.

### Schema management

All schema lives as ordered SQL migration files under `supabase/migrations/`:

1. `0001_profiles.sql` — table, `is_manager()`, signup trigger, RLS policies.
2. `0002_orders.sql` — `orders` + `order_items`, `updated_at` trigger, RLS policies.
3. `0003_seed_admin.sql` — documented step to promote the first manager (run manually with
   the real admin email; not committed with a real address).

Applied via the Supabase MCP integration (or `supabase db push`).

## Application Surface

### Supabase client wiring (`lib/supabase/`)
- `client.ts` — browser client (`createBrowserClient` from `@supabase/ssr`).
- `server.ts` — server client factory (`createServerClient`, cookie adapter) for Server
  Components, Route Handlers, and Server Actions.
- `middleware.ts` helper — session refresh used by root `middleware.ts`.

### Auth state for the UI (`state/auth.tsx`)
A client `AuthProvider` exposing `{ user, profile, role, loading, signOut }`, hydrated from
the server-resolved session and kept in sync via Supabase's `onAuthStateChange`. Added to
`app/providers.tsx` (outermost, additive — existing providers unchanged). Lets the nav show
**Login** vs an account menu, and reveal the **Admin** link only when `role === 'manager'`.

### Routes — customer-facing
- `/register` — email, password, `full_name`, `company_name`, `country` selector
  (localized country list). Calls `supabase.auth.signUp` with metadata.
- `/login` — email + password; redirects back to intended page.
- `/account` — profile view/edit + **order history** (the user's submitted orders with
  status and line items).
- **Submit flow:** `/cart` and `/materiais` (BOM) each get a **"Submit order/quote
  request"** action. If logged out → redirect to `/login?next=…` (or inline prompt). If
  logged in → a **Server Action** inserts an `orders` row + `order_items` from the current
  `BomItem[]`, snapshotting product name/category from the repository. On success: confirm,
  clear that surface's localStorage list, link to `/account`.

### Routes — admin (`/admin/*`, manager-only via middleware)
- `/admin` — KPI dashboard: total customers, total orders, **orders by country**, **top
  ordered materials** (aggregated from `order_items`).
- `/admin/orders` — all orders; filter by status & country; detail view; **change status**.
- `/admin/customers` — all customers with country/company; drill into a customer's orders.

Admin reads are Server Components querying Supabase under the manager's session (RLS
permits all). Mutations (status change) via Server Actions.

### Route protection
Root `middleware.ts`:
- Refreshes the Supabase session cookie on every request.
- `/admin/*` → require `role === 'manager'`, else redirect to `/login` (or 404 to avoid
  advertising the route).
- `/account/*` → require any authenticated user.
- Must use a `matcher` that **excludes** configurator routes and static assets, so it
  cannot affect the parallel configurator work.

### i18n
New strings (auth, account, order statuses, admin labels, country names) added to the
existing trilingual `messages` dict in `lib/i18n.ts` (pt/en/zh, **zh default**),
consistent with the rest of the site. Order `status` and `source` enums get localized
label maps. Country codes render via a localized country-name lookup.

## Integration With Existing State

- `CartProvider` / `BomProvider` (localStorage) are **unchanged**. The in-progress cart
  is not synced to the server (per decision); only *submitted* orders persist. This keeps
  the change additive and avoids localStorage↔DB conflict logic.
- A pure helper `lib/order.ts#buildOrderPayload(items, ctx)` converts `BomItem[]` + repo
  lookups + locale into the `orders` / `order_items` insert payload. This is the unit-test
  seam.

## Secrets & Config

- `.env.local` (already gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Same two vars added to the Vercel project (so the deployed site talks to Supabase).
- `.env.example` committed documenting the required vars (no secrets).

## Testing

**Unit (Vitest), the pure/logic seams:**
- `buildOrderPayload` — correct line items, totals, snapshots, locale, source.
- Role/route-guard helper — given role + path, returns allow/deny/redirect correctly.
- Country-name localization lookup (pt/en/zh).
- Order status/source localized-label maps cover every enum value.

**Manual verification checklist (auth/RLS are integration-level):**
- Register → `profiles` row appears with correct country/role=customer.
- Customer A cannot read Customer B's orders (RLS).
- Submitting cart/BOM creates order + items with correct snapshots.
- Manager sees all orders/customers; can change order status; non-manager hitting
  `/admin` is redirected.
- Logged-out submit attempt routes to login then back.

The 3 pre-existing model-viewer WebGL test-pool failures are unrelated and remain expected.

## Isolation From the Configurator Project (hard constraint)

- All work on branch **`feat/backend-auth-orders`** in a **separate git worktree** off
  `main`. The configurator branch and its working tree are never modified.
- **No edits** to `app/configurator*`, `app/configurator-prototype*`,
  `state/configurator.*`, `components/configurator/*`, or configurator specs/plans.
- Edits to shared files are strictly additive and minimal: `app/providers.tsx` (wrap
  `AuthProvider`), the nav (account menu + admin link), `app/cart` & `app/materiais`
  (submit button), `lib/i18n.ts` (new keys), `package.json` (add `@supabase/*` deps).
- `middleware.ts` matcher explicitly excludes configurator paths.

## Build Order (phases)

1. **Foundation** — create Supabase project; `0001`/`0002` migrations + RLS + signup
   trigger; Supabase client wiring; `AuthProvider`; `/register`, `/login`, `/account`
   (profile only); middleware guards; nav integration; env wiring (local + Vercel).
2. **Orders** — `buildOrderPayload` + tests; submit Server Action; submit buttons on
   cart/BOM; order history in `/account`.
3. **Admin** — `/admin` dashboard (KPIs, by-country, top materials); `/admin/orders`
   (list/filter/detail/status); `/admin/customers` (list/drill-in); admin i18n.

Each phase is independently shippable and testable.
