import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";
import { toCentsStr } from "../utils/utils";
import { Amounts, CheckoutRequest } from "../types";
import crypto from "crypto";
import { getFacilitatorClient, x402Config } from "../utils/x402-config";

/**
 * x402 Checkout Handler for Stellar Testnet
 * 
 * Flow:
 * 1. First request (no X-Payment header): Create order intent, return 402 with payment requirements
 * 2. Second request (with X-Payment header): Verify payment with facilitator, create Shopify order
 */
export async function handleCheckout(req: Request, res: Response) {
  const requestId = `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  console.log(`\n[${requestId}] 🔵 Checkout request`);

  const facilitatorClient = getFacilitatorClient();

  try {
    const body = req.body as CheckoutRequest;
    const { storeId, items, shippingAddress, email, orderIntentId } = body || {};
    const xPaymentHeader = req.header("X-Payment") || req.header("Payment-Signature");

    // Validate required fields
    if (!storeId || !Array.isArray(items) || items.length === 0 || !shippingAddress || !email) {
      return res.status(400).json({
        error: "Missing required fields: storeId, items[], shippingAddress, email",
      });
    }

    const supabase = getSupabase();

    // Load store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id,currency,url,admin_access_token")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr || !store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // ============================================================
    // PHASE 1: No X-Payment header → Create intent & return 402
    // ============================================================
    if (!xPaymentHeader) {
      console.log(`[${requestId}] 📋 Phase 1: Creating order intent`);

      // If orderIntentId provided, load existing intent
      if (orderIntentId) {
        const { data: intent, error: intentErr } = await supabase
          .from("order_intents")
          .select("*")
          .eq("id", orderIntentId)
          .maybeSingle();

        if (intentErr || !intent) {
          return res.status(404).json({ error: "Order intent not found" });
        }

        // Check expiry
        if (intent.expires_at && new Date(intent.expires_at) < new Date()) {
          return res.status(400).json({ error: "Order intent expired" });
        }

        // Check if already paid
        if (intent.status === "paid") {
          return res.status(400).json({ error: "Order intent already processed" });
        }

        // Return proper PaymentRequired v2 response
        const totalInDollars = (parseInt(intent.total_amount) / 100).toFixed(2);
        const amountInStroops = String(parseInt(intent.total_amount) * 100000);
        
        const paymentRequired = {
          x402Version: 2,
          resource: {
            url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
            description: "Shopify Checkout",
          },
          accepts: [{
            scheme: "exact" as const,
            price: `$${totalInDollars}`,
            amount: amountInStroops,
            asset: x402Config.usdcIssuer,
            network: x402Config.network,
            payTo: x402Config.recipientAddress,
            maxTimeoutSeconds: 900,
            extra: {
              areFeesSponsored: true,
            },
          }],
        };

        const x402Str = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");
        res.setHeader("WWW-Authenticate", `x402 ${x402Str}`);
        res.setHeader("Payment-Required", x402Str);

        return res.status(402).json({
          ...paymentRequired,
          orderIntentId: intent.id, // Keep this for easier tracking
          amounts: {
            subtotal: intent.subtotal_amount,
            shipping: intent.shipping_amount,
            tax: intent.tax_amount,
            total: intent.total_amount,
            currency: intent.currency,
          },
        });
      }

      // Create new order intent
      const variantIds = items.map((i) => i.productId);
      const { data: rows, error: priceErr } = await supabase
        .from("store_products")
        .select("variant_id,price,currency")
        .eq("store_id", storeId)
        .in("variant_id", variantIds);

      if (priceErr || !rows) {
        return res.status(500).json({ error: "Failed to fetch product prices" });
      }

      const priceMap = new Map<string, { price: number; currency: string }>();
      for (const r of rows) {
        const pNum = typeof r.price === "string" ? parseFloat(r.price) : Number(r.price);
        priceMap.set(r.variant_id, {
          price: pNum,
          currency: r.currency || store.currency || "USD",
        });
      }

      // Validate items
      for (const it of items) {
        if (!priceMap.has(it.productId)) {
          return res.status(400).json({ error: `Product not found: ${it.productId}` });
        }
      }

      // Compute totals
      let subtotalNum = 0;
      for (const it of items) {
        const { price } = priceMap.get(it.productId)!;
        subtotalNum += price * Number(it.quantity);
      }

      const shippingNum = 0;
      const taxNum = 0;
      const totalNum = subtotalNum + shippingNum + taxNum;
      const currency = store.currency || "USD";

      const amounts: Amounts = {
        subtotal: toCentsStr(subtotalNum),
        shipping: toCentsStr(shippingNum),
        tax: toCentsStr(taxNum),
        total: toCentsStr(totalNum),
        currency,
      };

      // Create order intent
      const id = `oi_${crypto.randomUUID().slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const { error: insertErr } = await supabase.from("order_intents").insert({
        id,
        store_id: storeId,
        items,
        shipping_address: shippingAddress,
        email,
        subtotal_amount: amounts.subtotal,
        shipping_amount: amounts.shipping,
        tax_amount: amounts.tax,
        total_amount: amounts.total,
        currency,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

      if (insertErr) {
        console.error(`[${requestId}] ❌ Failed to create order intent:`, insertErr.message);
        return res.status(500).json({ error: "Failed to create order intent" });
      }

      console.log(`[${requestId}] ✅ Order intent created: ${id}`);

      // Build proper PaymentRequired v2 response
      const totalInDollars = (parseInt(amounts.total) / 100).toFixed(2);
      const amountInStroops = String(parseInt(amounts.total) * 100000);
      
      const paymentRequired = {
        x402Version: 2,
        resource: {
          url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          description: "Shopify Checkout",
        },
        accepts: [{
          scheme: "exact" as const,
          price: `$${totalInDollars}`,
          amount: amountInStroops,
          asset: x402Config.usdcIssuer,
          network: x402Config.network,
          payTo: x402Config.recipientAddress,
          maxTimeoutSeconds: 900,
          extra: {
            areFeesSponsored: true,
          },
        }],
      };

      console.log(`[${requestId}] 📋 Payment required:`, JSON.stringify(paymentRequired, null, 2));

      // Set headers per x402 spec
      const x402Str = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");
      res.setHeader("WWW-Authenticate", `x402 ${x402Str}`);
      res.setHeader("Payment-Required", x402Str);

      return res.status(402).json({
        ...paymentRequired,
        orderIntentId: id,
        amounts,
      });
    }

    // ============================================================
    // PHASE 2: Has X-Payment header → Verify & Create Order
    // ============================================================
    console.log(`[${requestId}] 💳 Phase 2: Verifying payment`);

    if (!orderIntentId) {
      return res.status(400).json({
        error: "Missing orderIntentId when X-Payment header is present",
      });
    }

    // Load order intent
    const { data: intent, error: intentErr } = await supabase
      .from("order_intents")
      .select("*")
      .eq("id", orderIntentId)
      .maybeSingle();

    if (intentErr || !intent) {
      return res.status(404).json({ error: "Order intent not found" });
    }

    // Check expiry
    if (intent.expires_at && new Date(intent.expires_at) < new Date()) {
      return res.status(400).json({ error: "Order intent expired" });
    }

    // Check if already paid
    if (intent.status === "paid") {
      return res.status(400).json({ error: "Order intent already processed" });
    }

    // Verify payment with facilitator
    try {
      console.log(`[${requestId}] 🔐 Verifying payment with facilitator...`);

      // Decode X-Payment header
      let paymentPayload: any;
      try {
        const decoded = Buffer.from(xPaymentHeader, "base64").toString("utf-8");
        paymentPayload = JSON.parse(decoded);
      } catch {
        paymentPayload = JSON.parse(xPaymentHeader);
      }

      // Build payment requirement for verification (this should match one of the 'accepts' entries)
      const totalInDollars = (parseInt(intent.total_amount) / 100).toFixed(2);
      const amountInStroops = String(parseInt(intent.total_amount) * 100000);
      
      const paymentRequirements = {
        scheme: "exact" as const,
        network: x402Config.network,
        asset: x402Config.usdcIssuer,
        amount: amountInStroops,
        payTo: x402Config.recipientAddress,
        maxTimeoutSeconds: 900,
        extra: {
          areFeesSponsored: true,
        },
      };

      // Verify with facilitator
      const verifyResult = await facilitatorClient.verify(
        paymentPayload,
        paymentRequirements as any
      );

      if (!verifyResult.isValid) {
        console.error(`[${requestId}] ❌ Payment verification failed:`, verifyResult.invalidReason);
        return res.status(402).json({
          error: "Payment verification failed",
          reason: verifyResult.invalidReason,
        });
      }

      console.log(`[${requestId}] ✅ Payment verified, settling...`);

      // Settle payment
      await facilitatorClient.settle(paymentPayload, paymentRequirements as any);

      console.log(`[${requestId}] ✅ Payment settled on-chain`);

      // Extract transaction hash
      const txHash =
        (verifyResult as any).transactionHash ||
        paymentPayload.transactionHash ||
        paymentPayload.txHash ||
        "unknown";

      // Create Shopify order
      console.log(`[${requestId}] 🛍️  Creating Shopify order...`);

      const nameParts = (shippingAddress.name || "").trim().split(/\s+/);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ");

      const shopUrl = (store.url as string).replace(/\/$/, "");
      const apiVersion = "2025-10";
      const endpoint = `${shopUrl}/admin/api/${apiVersion}/orders.json`;

      const lineItems = items.map((it) => {
        const match = String(it.productId).match(/(\d+)$/);
        const variantIdNum = match ? Number(match[1]) : undefined;
        const li: any = { quantity: Number(it.quantity) };
        if (variantIdNum) li.variant_id = variantIdNum;
        return li;
      });

      const orderPayload = {
        order: {
          email,
          financial_status: "paid",
          currency: intent.currency || store.currency || "USD",
          line_items: lineItems,
          shipping_address: {
            first_name: firstName,
            last_name: lastName,
            address1: shippingAddress.address1,
            city: shippingAddress.city,
            province: shippingAddress.state || undefined,
            zip: shippingAddress.postalCode,
            country: shippingAddress.country,
          },
          transactions: [
            {
              kind: "sale",
              status: "success",
              amount: String(intent.total_amount),
              currency: intent.currency || store.currency || "USD",
            },
          ],
          tags: "x402,stellar",
        },
      };

      const shopifyRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": String(store.admin_access_token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!shopifyRes.ok) {
        const errorText = await shopifyRes.text();
        console.error(`[${requestId}] ❌ Shopify error:`, errorText);
        return res.status(502).json({
          error: "Failed to create Shopify order",
          details: errorText,
        });
      }

      const shopifyJson = await shopifyRes.json();
      const shopifyOrderId =
        shopifyJson?.order?.admin_graphql_api_id || String(shopifyJson?.order?.id || "");

      console.log(`[${requestId}] ✓ Shopify order created: ${shopifyOrderId}`);

      // Mark intent as paid
      await supabase
        .from("order_intents")
        .update({
          status: "paid",
          verified_at: new Date().toISOString(),
          verification_status: "verified",
          payment_tx_hash: txHash,
        })
        .eq("id", intent.id);

      // Create local order
      const orderId = `ord_${crypto.randomUUID().slice(0, 8)}`;
      await supabase.from("orders").insert({
        id: orderId,
        store_id: storeId,
        order_intent_id: intent.id,
        email,
        items,
        subtotal_amount: intent.subtotal_amount,
        shipping_amount: intent.shipping_amount,
        tax_amount: intent.tax_amount,
        total_amount: intent.total_amount,
        currency: intent.currency,
        status: "confirmed",
        shopify_order_id: shopifyOrderId,
      });

      console.log(`[${requestId}] 🎉 Order completed: ${orderId}`);

      return res.status(200).json({
        orderId,
        orderIntentId: intent.id,
        storeId,
        status: "confirmed",
        shopifyOrderId: shopifyOrderId || null,
        amounts: {
          subtotal: intent.subtotal_amount,
          shipping: intent.shipping_amount,
          tax: intent.tax_amount,
          total: intent.total_amount,
          currency: intent.currency,
        },
        payment: {
          verified: true,
          txHash,
        },
      });
    } catch (verifyErr: any) {
      console.error(`[${requestId}] ❌ Payment verification error:`, verifyErr.message);
      return res.status(400).json({
        error: "Payment verification failed",
        details: verifyErr.message,
      });
    }
  } catch (e: any) {
    console.error(`[${requestId}] ❌ Unexpected error:`, e.message);
    return res.status(500).json({
      error: e.message || "Unexpected error",
    });
  }
}
