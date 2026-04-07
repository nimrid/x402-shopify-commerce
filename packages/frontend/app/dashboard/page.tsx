/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, ArrowLeft, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";

type Order = {
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

type OrderIntent = {
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
  verification_status?: string;
  payment_tx_hash?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderIntents, setOrderIntents] = useState<OrderIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const store = localStorage.getItem("store_id");
    const domain = localStorage.getItem("shop_domain");

    if (!store || !domain) {
      setError("Missing store information. Please complete registration.");
      setLoading(false);
      return;
    }

    setStoreId(store);
    setShopUrl(domain);

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch orders
        const ordersRes = await fetch(
          `http://localhost:3001/x402/stores/${store}/orders`
        );
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }

        // Fetch order intents
        const intentsRes = await fetch(
          `http://localhost:3001/x402/stores/${store}/order-intents`
        );
        if (intentsRes.ok) {
          const intentsData = await intentsRes.json();
          setOrderIntents(intentsData);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to fetch data");
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewOnShopify = () => {
    window.open("https://admin.shopify.com/store/60h5mj-ji/orders", "_blank");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "paid":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "fulfilled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleViewOnShopify}
            variant="outline"
            size="sm"
            className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Shopify
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Store Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage orders and payment intents
          </p>
          {storeId && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 font-mono">
              Store ID: <span className="text-slate-700 dark:text-slate-300">{storeId}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading your data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Orders Section */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Orders
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {orders.length} {orders.length === 1 ? "order" : "orders"} processed
                  </p>
                </div>
              </div>
              {orders.length === 0 ? (
                <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      No orders yet
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                      Orders from AI agents will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Order ID
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Email
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Amount
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Status
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Shopify
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="py-4 px-6 font-mono text-xs text-slate-600 dark:text-slate-400">
                              {order.id.substring(0, 8)}...
                            </td>
                            <td className="py-4 px-6 text-slate-700 dark:text-slate-300 text-sm">
                              {order.email}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                              {order.currency} ${parseFloat(order.total_amount).toFixed(2)}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {order.shopify_order_id ? (
                                <a
                                  href={`https://${shopUrl}/admin/orders/${order.shopify_order_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
                                >
                                  <span className="font-mono text-xs">
                                    {order.shopify_order_id.substring(0, 8)}...
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs">
                              {formatDate(order.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>

            {/* Order Intents Section */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Payment Intents
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {orderIntents.length} {orderIntents.length === 1 ? "intent" : "intents"} pending
                  </p>
                </div>
              </div>
              {orderIntents.length === 0 ? (
                <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      No payment intents
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                      Pending payment intents will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Intent ID
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Email
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Amount
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Status
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Verification
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                            Expires
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderIntents.map((intent) => (
                          <tr
                            key={intent.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="py-4 px-6 font-mono text-xs text-slate-600 dark:text-slate-400">
                              {intent.id.substring(0, 8)}...
                            </td>
                            <td className="py-4 px-6 text-slate-700 dark:text-slate-300 text-sm">
                              {intent.email}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                              {intent.currency} ${parseFloat(intent.total_amount).toFixed(2)}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(
                                  intent.status
                                )}`}
                              >
                                {intent.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {intent.verification_status ? (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {intent.verification_status}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs">
                              {formatDate(intent.expires_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
