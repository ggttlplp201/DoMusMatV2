-- Phase A: catalogue tables (categories, products, product_variants).
-- The static data/product_data.json is migrated into these via scripts/seed_catalogue.mjs.
-- Assumes 0001 (is_manager(), touch_updated_at via 0003) is already applied.
-- Writes (insert/update/delete) arrive in Phase B as manager-gated RPCs; there are
-- intentionally NO write policies here. Seeding uses the service-role key (bypasses RLS).

create table if not exists public.categories (
  id text primary key,
  name text not null,
  name_en text not null,
  name_zh text not null,
  sort_order int not null default 0
);
alter table public.categories enable row level security;

create table if not exists public.products (
  id text primary key,
  category text not null references public.categories(id),
  name text not null,
  name_en text not null default '',
  name_zh text not null default '',
  ref_prefix text not null default '',
  description_pt text not null default '',
  description_en text not null default '',
  description_zh text not null default '',
  applications text[] not null default '{}',
  images text[] not null default '{}',
  shared_specs jsonb not null default '{}',
  model3d text not null default 'PLACEHOLDER',
  compliance jsonb not null default '{}',
  bim_assets jsonb not null default '[]',
  bim_metadata jsonb not null default '{}',
  standardization jsonb not null default '{}',
  supply_chain jsonb not null default '{}',
  status text not null default 'active' check (status in ('active', 'retired')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;

create table if not exists public.product_variants (
  ref text primary key,
  product_id text not null references public.products(id) on delete cascade,
  attrs jsonb not null default '{}',
  sort_order int not null default 0
);
alter table public.product_variants enable row level security;

create index if not exists products_category_idx on public.products(category);
create index if not exists products_status_idx on public.products(status);
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

-- RLS: the catalogue is public. Anonymous + authenticated users read active products;
-- managers additionally see retired ones (for the /admin product list). Categories and
-- variants are world-readable (variants are useless without their product, and
-- loadCatalogue only surfaces variants of active products it fetched).
create policy "categories_select_all" on public.categories for select using (true);
create policy "product_variants_select_all" on public.product_variants for select using (true);
create policy "products_select_active_or_manager" on public.products for select
  using (status = 'active' or public.is_manager());

-- keep updated_at fresh (touch_updated_at() is defined in 0003; re-declared idempotently
-- so this migration is safe to apply standalone)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $touch$
begin
  new.updated_at = now();
  return new;
end;
$touch$;

drop trigger if exists products_touch_updated on public.products;
create trigger products_touch_updated
  before update on public.products
  for each row execute function public.touch_updated_at();
