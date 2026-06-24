"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildOrderPayload } from "@/lib/order";
import { createOrder } from "@/lib/createOrder";
import { useAuth } from "@/state/auth";
import { useLocale } from "@/state/locale";
import type { BomItem } from "@/lib/bom";

// Encapsulates: require login (else redirect to /login?next=), build payload, call RPC.
export function useSubmitOrder(source: "cart" | "bom", nextPath: string) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  async function submit(items: BomItem[]): Promise<string | null> {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return null;
    }
    setBusy(true);
    setError(false);
    try {
      const id = await createOrder(supabase, buildOrderPayload(items, { source, locale }));
      setOrderId(id);
      return id;
    } catch {
      setError(true);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, error, orderId };
}
