-- Phase B: catalogue write RPCs. All SECURITY DEFINER and gated by is_manager(), so the
-- products/product_variants tables need NO client write policies (mirrors create_order).
-- Assumes 0005 (catalogue tables) + 0001 (is_manager()) are applied.

-- Upsert a single product (and replace its variant set) from a jsonb payload shaped like
-- lib/productImport.ImportedProduct. Returns the product id.
create or replace function public.upsert_product(p_product jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $upsert_product$
declare
  v_id text;
begin
  if not public.is_manager() then
    raise exception 'Only managers can modify products';
  end if;

  v_id := nullif(p_product->>'id', '');
  if v_id is null then
    raise exception 'Product id (slug) is required';
  end if;
  if nullif(p_product->>'name', '') is null then
    raise exception 'Product name is required';
  end if;
  if not exists (select 1 from public.categories c where c.id = p_product->>'category') then
    raise exception 'Unknown category: %', coalesce(p_product->>'category', '(none)');
  end if;

  insert into public.products (
    id, category, name, name_en, name_zh, ref_prefix,
    description_pt, description_en, description_zh,
    applications, images, shared_specs, model3d, compliance,
    bim_assets, bim_metadata, standardization, supply_chain, status
  ) values (
    v_id,
    p_product->>'category',
    p_product->>'name',
    coalesce(p_product->>'name_en', ''),
    coalesce(p_product->>'name_zh', ''),
    coalesce(p_product->>'ref_prefix', ''),
    coalesce(p_product->>'description_pt', ''),
    coalesce(p_product->>'description_en', ''),
    coalesce(p_product->>'description_zh', ''),
    coalesce((select array_agg(el order by ord)
              from jsonb_array_elements_text(p_product->'applications') with ordinality as a(el, ord)), '{}'),
    coalesce((select array_agg(el order by ord)
              from jsonb_array_elements_text(p_product->'images') with ordinality as i(el, ord)), '{}'),
    coalesce(p_product->'shared_specs', '{}'::jsonb),
    coalesce(nullif(p_product->>'model3d', ''), 'PLACEHOLDER'),
    coalesce(p_product->'compliance', '{}'::jsonb),
    coalesce(p_product->'bim_assets', '[]'::jsonb),
    coalesce(p_product->'bim_metadata', '{}'::jsonb),
    coalesce(p_product->'standardization', '{}'::jsonb),
    coalesce(p_product->'supply_chain', '{}'::jsonb),
    coalesce(nullif(p_product->>'status', ''), 'active')
  )
  on conflict (id) do update set
    category = excluded.category,
    name = excluded.name,
    name_en = excluded.name_en,
    name_zh = excluded.name_zh,
    ref_prefix = excluded.ref_prefix,
    description_pt = excluded.description_pt,
    description_en = excluded.description_en,
    description_zh = excluded.description_zh,
    applications = excluded.applications,
    images = excluded.images,
    shared_specs = excluded.shared_specs,
    model3d = excluded.model3d,
    compliance = excluded.compliance,
    bim_assets = excluded.bim_assets,
    bim_metadata = excluded.bim_metadata,
    standardization = excluded.standardization,
    supply_chain = excluded.supply_chain,
    status = excluded.status;

  -- Replace the variant set wholesale (sort_order from array position).
  delete from public.product_variants where product_id = v_id;
  insert into public.product_variants (product_id, ref, attrs, sort_order)
  select v_id, elem->>'ref', coalesce(elem->'attrs', '{}'::jsonb), (ord - 1)::int
  from jsonb_array_elements(coalesce(p_product->'variants', '[]'::jsonb)) with ordinality as t(elem, ord)
  where nullif(elem->>'ref', '') is not null;

  return v_id;
end;
$upsert_product$;

-- Bulk import: a jsonb array of product payloads, upserted atomically (any failure rolls
-- back the whole batch). Returns { count, ids }.
create or replace function public.import_products(p_products jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $import_products$
declare
  v_elem jsonb;
  v_ids text[] := '{}';
begin
  if not public.is_manager() then
    raise exception 'Only managers can import products';
  end if;
  for v_elem in select value from jsonb_array_elements(coalesce(p_products, '[]'::jsonb))
  loop
    v_ids := array_append(v_ids, public.upsert_product(v_elem));
  end loop;
  return jsonb_build_object('count', cardinality(v_ids), 'ids', to_jsonb(v_ids));
end;
$import_products$;

-- Retire / restore a product (soft delete). Retired products vanish from the public
-- catalogue (RLS) but remain visible to managers in /admin.
create or replace function public.set_product_status(p_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $set_product_status$
begin
  if not public.is_manager() then
    raise exception 'Only managers can change product status';
  end if;
  if p_status not in ('active', 'retired') then
    raise exception 'Invalid status: %', p_status;
  end if;
  update public.products set status = p_status where id = p_id;
  if not found then
    raise exception 'Product not found: %', p_id;
  end if;
end;
$set_product_status$;

grant execute on function public.upsert_product(jsonb) to authenticated;
grant execute on function public.import_products(jsonb) to authenticated;
grant execute on function public.set_product_status(text, text) to authenticated;
