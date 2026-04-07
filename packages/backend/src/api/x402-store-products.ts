import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";
import { Product } from "../types";
import { normalizePriceString } from "../utils/utils";

export async function handleListStoreProducts(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      return res.status(400).json({ error: "Missing storeId" });
    }

    const limitParam = req.query.limit as string | undefined;
    const search = req.query.search as string | undefined;
    const cursorParam = req.query.cursor as string | undefined;

    let limit = Number.parseInt(limitParam || "50", 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    let offset = Number.parseInt(cursorParam || "0", 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const supabase = getSupabase();

    let query = supabase
      .from("store_products")
      .select(
        "variant_id,name,description,image,price,currency,inventory,metadata"
      )
      .eq("store_id", storeId);

    if (search && search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    // Order by name for stable pagination; use offset-based range for simplicity.
    query = query
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({
        error: "Failed to fetch products",
        details: error.message,
      });
    }

    const products: Product[] = (data || []).map((row: any) => {
      const priceStr = normalizePriceString(row.price);

      return {
        id: row.variant_id as string,
        name: row.name as string,
        description: (row.description ?? null) as string | null,
        image: (row.image ?? null) as string | null,
        price: priceStr,
        currency: (row.currency ?? "USD") as string,
        inventory: (row.inventory ?? null) as number | null,
        metadata: row.metadata ?? null,
      };
    });

    const nextCursor =
      products.length === limit ? String(offset + products.length) : null;

    return res.status(200).json({ storeId, products, nextCursor });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Unexpected error",
    });
  }
}
