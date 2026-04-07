import { Request, Response } from "express";
import crypto from "crypto";
import { getSupabase } from "../utils/supabase";
import { deriveNameFromUrl } from "../utils/utils";
import { StoreInput } from "../types";

export async function handleCreateStore(req: Request, res: Response) {
  try {
    const body = req.body as StoreInput;

    const { url, adminAccessToken } = body;
    if (!url || !adminAccessToken) {
      return res.status(400).json({
        error: "Missing required fields: url, adminAccessToken",
      });
    }

    const name = body.name?.trim() || deriveNameFromUrl(url);
    const description = body.description?.trim() || null;
    const currency = body.currency || "USD";
    const networks = body.networks || ["stellar:testnet"];
    const asset = body.asset || "USDC";
    const agentMetadata =
      body.agentMetadata || {
        minOrder: "5.00",
        supportsPhysical: true,
        supportsDigital: false,
      };

    const supabase = getSupabase();

    const id = `store_${crypto.randomUUID().slice(0, 8)}`;
    console.log(id);
    const shopDomain = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    })();

    const { error } = await supabase.from("stores").insert({
      id,
      name,
      url,
      shop_domain: shopDomain,
      admin_access_token: adminAccessToken,
      description,
      currency,
      networks,
      asset,
      agent_metadata: agentMetadata,
    });
    if (error) {
      return res.status(500).json({
        error: "Failed to insert store",
        details: error.message,
      });
    }

    console.log({ id, name, description, currency, networks, asset, agentMetadata });
    return res.status(200).json({
      id,
      name,
      description,
      currency,
      networks,
      asset,
      agentMetadata,
    });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Unexpected error",
    });
  }
}
