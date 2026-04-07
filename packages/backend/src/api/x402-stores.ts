import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";
import { Store } from "../types";

export async function handleListStores(_req: Request, res: Response) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("stores")
      .select("id,name,description,currency,networks,asset,agent_metadata")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch stores",
        details: error.message,
      });
    }

    const stores: Store[] = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? undefined,
      currency: s.currency ?? "USD",
      networks:
        Array.isArray(s.networks) && s.networks.length
          ? s.networks
          : ["stellar:testnet"],
      asset: s.asset ?? "USDC",
      agentMetadata: s.agent_metadata ?? {
        minOrder: "5.00",
        supportsPhysical: true,
        supportsDigital: false,
      },
    }));

    return res.status(200).json(stores);
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Unexpected error",
    });
  }
}
