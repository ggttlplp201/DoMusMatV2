"use client";

import { AdminGate } from "@/components/admin/AdminGate";
import { ProductForm } from "@/components/admin/ProductForm";
import { useT } from "@/state/locale";

export default function NewProductPage() {
  const t = useT();
  return (
    <AdminGate title={t("admin.prod.newTitle")}>
      <ProductForm />
    </AdminGate>
  );
}
