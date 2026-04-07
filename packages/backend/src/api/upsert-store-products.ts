import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";
import { ProductInput } from "../types";

export async function handleUpsertStoreProducts(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    const body = req.body as {
      products: ProductInput[];
    };

    if (!storeId || !body?.products?.length) {
      return res.status(400).json({
        error: "Missing storeId or products",
      });
    }

    const rows = body.products.map((p) => ({
      store_id: storeId,
      variant_id: p.id,
      name: p.name,
      description: p.description ?? null,
      image: p.image ?? null,
      price: p.price,
      currency: p.currency,
      inventory: p.inventory ?? null,
      metadata: p.metadata ?? null,
    }));

    const supabase = getSupabase();
    const { error } = await supabase
      .from("store_products")
      .upsert(rows, { onConflict: "store_id,variant_id" });
    if (error) {
      return res.status(500).json({
        error: "Failed to upsert products",
        details: error.message,
      });
    }

    return res.status(200).json({ ok: true, count: rows.length });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Unexpected error",
    });
  }
}
