-- Phase 2: orders + order_items (submitted quote/order requests).
-- Assumes 0001 (profiles, is_manager()) is already applied.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'cart' check (source in ('cart', 'bom')),
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'quoted', 'fulfilled', 'cancelled')),
  note text,
  locale text not null default 'zh' check (locale in ('pt', 'en', 'zh')),
  total_quantity int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_ref text not null,
  product_id text,
  product_name_snapshot text,
  category text,
  quantity int not null check (quantity > 0)
);
alter table public.order_items enable row level security;

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_user_id_idx on public.orders(user_id);

-- RLS: a user sees/creates their own orders; managers see all and can update status.
create policy "orders_select_own_or_manager" on public.orders for select
  using (user_id = auth.uid() or public.is_manager());
create policy "orders_update_manager" on public.orders for update
  using (public.is_manager()) with check (public.is_manager());

create policy "order_items_select_own_or_manager" on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_manager())
  ));

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $touch$
begin
  new.updated_at = now();
  return new;
end;
$touch$;

drop trigger if exists orders_touch_updated on public.orders;
create trigger orders_touch_updated
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Atomic order creation for the authenticated caller. SECURITY DEFINER but the
-- order's user_id is forced to auth.uid(), so a caller cannot create another user's order.
create or replace function public.create_order(
  p_source text, p_note text, p_locale text, p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $create_order$
declare
  v_order_id uuid;
  v_total int;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to create an order';
  end if;
  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Order must contain at least one item';
  end if;
  select coalesce(sum((it->>'quantity')::int), 0)
    into v_total
    from jsonb_array_elements(p_items) it;
  insert into public.orders (user_id, source, note, locale, total_quantity)
    values (
      auth.uid(),
      coalesce(nullif(p_source, ''), 'cart'),
      nullif(p_note, ''),
      coalesce(nullif(p_locale, ''), 'zh'),
      v_total
    )
    returning id into v_order_id;
  insert into public.order_items (order_id, product_ref, product_id, product_name_snapshot, category, quantity)
    select v_order_id, it->>'product_ref', it->>'product_id', it->>'product_name_snapshot', it->>'category', (it->>'quantity')::int
    from jsonb_array_elements(p_items) it;
  return v_order_id;
end;
$create_order$;

-- Order creation flows EXCLUSIVELY through this RPC (no direct INSERT policies on
-- orders/order_items), so total_quantity is always computed atomically and cannot drift.
grant execute on function public.create_order(text, text, text, jsonb) to authenticated;
