import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";

export type Order = {
  id: string;
  store_id: string;
  order_intent_id: string;
  email: string;
  items: any[];
  subtotal_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: "confirmed" | "fulfilled" | "cancelled";
  shopify_order_id: string | null;
  created_at: string;
};

export async function handleGetOrders(req: Request, res: Response) {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        error: "Missing storeId parameter",
      });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch orders",
        details: error.message,
      });
    }

    const orders: Order[] = (data || []).map((o: any) => ({
      id: o.id,
      store_id: o.store_id,
      order_intent_id: o.order_intent_id,
      email: o.email,
      items: o.items,
      subtotal_amount: o.subtotal_amount,
      shipping_amount: o.shipping_amount,
      tax_amount: o.tax_amount,
      total_amount: o.total_amount,
      currency: o.currency,
      status: o.status,
      shopify_order_id: o.shopify_order_id,
      created_at: o.created_at,
    }));

    return res.status(200).json(orders);
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Unexpected error",
    });
  }
}
