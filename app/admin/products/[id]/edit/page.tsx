"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminGate } from "@/components/admin/AdminGate";
import { ProductForm } from "@/components/admin/ProductForm";
import { useT } from "@/state/locale";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const t = useT();
  const params = useParams();
  const id = String(params.id);
  const [supabase] = useState(() => createClient());
  const [product, setProduct] = useState<Product | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("products")
      .select("*, product_variants(ref,attrs,sort_order)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) {
          setLoaded(true);
          return;
        }
        const variants = ((data.product_variants ?? []) as { ref: string; attrs: Record<string, number | string>; sort_order: number }[])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({ ref: v.ref, attrs: v.attrs }));
        setProduct({ ...data, variants } as unknown as Product);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, id]);

  return (
    <AdminGate title={t("admin.prod.editTitle")}>
      {!loaded ? (
        <p className="text-aluminium-dark">{t("admin.prod.loading")}</p>
      ) : product ? (
        <ProductForm initial={product} />
      ) : (
        <p className="text-aluminium-dark">{t("admin.prod.empty")}</p>
      )}
    </AdminGate>
  );
}
