import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderPayload } from "./order";

// Calls the atomic create_order RPC; returns the new order id (uuid).
export async function createOrder(supabase: SupabaseClient, payload: OrderPayload): Promise<string> {
  const { data, error } = await supabase.rpc("create_order", {
    p_source: payload.source,
    p_note: payload.note,
    p_locale: payload.locale,
    p_items: payload.items,
  });
  if (error) throw error;
  return data as string;
}
