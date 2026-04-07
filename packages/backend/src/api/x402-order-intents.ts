import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";

export type OrderIntent = {
  id: string;
  store_id: string;
  items: any[];
  shipping_address: any;
  email: string;
  subtotal_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: "pending" | "paid" | "expired";
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  x402_requirements?: any;
  verification_status?: string;
  payment_tx_hash?: string;
  payment_amount_atomic?: string;
  verified_at?: string;
  payment_header_b64?: string;
};

export async function handleGetOrderIntents(req: Request, res: Response) {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        error: "Missing storeId parameter",
      });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("order_intents")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch order intents",
        details: error.message,
      });
    }

    const orderIntents: OrderIntent[] = (data || []).map((oi: any) => ({
      id: oi.id,
      store_id: oi.store_id,
      items: oi.items,
      shipping_address: oi.shipping_address,
      email: oi.email,
      subtotal_amount: oi.subtotal_amount,
      shipping_amount: oi.shipping_amount,
      tax_amount: oi.tax_amount,
      total_amount: oi.total_amount,
      currency: oi.currency,
      status: oi.status,
      expires_at: oi.expires_at,
      paid_at: oi.paid_at,
      created_at: oi.created_at,
      x402_requirements: oi.x402_requirements,
      verification_status: oi.verification_status,
      payment_tx_hash: oi.payment_tx_hash,
      payment_amount_atomic: oi.payment_amount_atomic,
      verified_at: oi.verified_at,
      payment_header_b64: oi.payment_header_b64,
    }));

    return res.status(200).json(orderIntents);
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Unexpected error",
    });
  }
}
