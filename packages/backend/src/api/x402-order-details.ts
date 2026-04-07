import { Request, Response } from "express";
import { getSupabase } from "../utils/supabase";

/**
 * Get order details by order ID
 * Returns order with store details and enriched product information
 * Adds fake delivery time field to response
 */
export async function handleGetOrderDetails(req: Request, res: Response) {
  const requestId = `order_details_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    const { orderId } = req.params;

    console.log(`[${requestId}] 📋 Get Order Details Request`);
    console.log(`[${requestId}] Order ID: ${orderId}`);

    if (!orderId) {
      console.error(`[${requestId}] ❌ Missing orderId parameter`);
      return res.status(400).json({
        error: "Missing orderId parameter",
      });
    }

    const supabase = getSupabase();

    // Fetch order from database
    console.log(`[${requestId}] 🔍 Fetching order from database...`);
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id,store_id,order_intent_id,email,items,subtotal_amount,shipping_amount,tax_amount,total_amount,currency,status,shopify_order_id,created_at"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) {
      console.error(`[${requestId}] ❌ Failed to fetch order:`, orderErr.message);
      return res.status(500).json({
        error: "Failed to fetch order",
        details: orderErr.message,
      });
    }

    if (!order) {
      console.error(`[${requestId}] ❌ Order not found: ${orderId}`);
      return res.status(404).json({
        error: "Order not found",
      });
    }

    console.log(`[${requestId}] ✅ Order found:`, {
      id: order.id,
      status: order.status,
      total: order.total_amount,
      currency: order.currency,
    });

    // Fetch store information
    console.log(`[${requestId}] 🏪 Fetching store details for: ${order.store_id}`);
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id,name,description,url,currency")
      .eq("id", order.store_id)
      .maybeSingle();

    if (storeErr) {
      console.error(`[${requestId}] ❌ Failed to fetch store:`, storeErr.message);
      return res.status(500).json({
        error: "Failed to fetch store",
        details: storeErr.message,
      });
    }

    if (!store) {
      console.error(`[${requestId}] ⚠️  Store not found: ${order.store_id}`);
      // Continue without store info
    } else {
      console.log(`[${requestId}] ✅ Store found:`, { id: store.id, name: store.name });
    }

    // Fetch product details for all items in order
    console.log(`[${requestId}] 📦 Fetching product details...`);
    const variantIds = (order.items || []).map((item: any) => item.productId);

    let products: any[] = [];
    if (variantIds.length > 0) {
      const { data: productRows, error: productsErr } = await supabase
        .from("store_products")
        .select("variant_id,name,description,image,price,currency,inventory,metadata")
        .eq("store_id", order.store_id)
        .in("variant_id", variantIds);

      if (productsErr) {
        console.error(`[${requestId}] ❌ Failed to fetch products:`, productsErr.message);
        return res.status(500).json({
          error: "Failed to fetch products",
          details: productsErr.message,
        });
      }

      products = productRows || [];
      console.log(`[${requestId}] ✅ Found ${products.length} products`);
    }

    // Create product map for easy lookup
    const productMap = new Map(products.map((p) => [p.variant_id, p]));

    // Enrich items with product details
    const enrichedItems = (order.items || []).map((item: any) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: product ? {
          name: product.name,
          description: product.description,
          image: product.image,
          price: product.price,
          currency: product.currency,
          inventory: product.inventory,
          metadata: product.metadata,
        } : null,
      };
    });

    // Build response
    const response = {
      orderId: order.id,
      orderIntentId: order.order_intent_id,
      email: order.email,
      status: order.status,
      shopifyOrderId: order.shopify_order_id,
      createdAt: order.created_at,
      store: store ? {
        storeId: store.id,
        name: store.name,
        description: store.description,
        url: store.url,
        currency: store.currency,
      } : null,
      items: enrichedItems,
      amounts: {
        subtotal: order.subtotal_amount,
        shipping: order.shipping_amount,
        tax: order.tax_amount,
        total: order.total_amount,
        currency: order.currency,
      },
      delivery: {
        estimatedTime: "expected in 7 days",
      },
    };

    console.log(`[${requestId}] 📤 Returning enriched order details`);
    return res.status(200).json(response);
  } catch (e: any) {
    console.error(`[${requestId}] ❌ Unexpected error`);
    console.error(`[${requestId}] Error message:`, e?.message);
    console.error(`[${requestId}] Stack trace:`, e?.stack);
    return res.status(500).json({
      error: "Internal server error",
      details: e?.message,
    });
  }
}
