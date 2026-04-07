/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type Variant = {
  id: string;
  title: string;
  price: string | { amount: string; currencyCode: string };
  imageUrl?: string | null;
  sku?: string | null;
  inventoryQuantity?: number | null;
};

type Product = {
  id: string;
  title: string;
  imageUrl?: string | null;
  variants: Variant[];
  descriptionHtml?: string | null;
};

export default function ProductsPage() {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const domain = localStorage.getItem("shop_domain");
    const token = localStorage.getItem("access_token");
    if (!domain || !token) {
      setError("Missing Shopify credentials. Go back and connect again.");
      return;
    }
    setStoreUrl(domain);

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:3001/api/shopify/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeUrl: domain, accessToken: token }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        const data = (await res.json()) as { products: Product[] };
        setProducts(data.products ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Default select all products when they first load
  useEffect(() => {
    if (products.length && selected.size === 0) {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }, [products]);

  function toggleSelected(id: string, next?: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      const shouldSelect = typeof next === "boolean" ? next : !copy.has(id);
      if (shouldSelect) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  const selectedCount = selected.size;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.title.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Select products for Agent store</h1>
            <p className="text-muted-foreground">
              {storeUrl ? `Connected to ${storeUrl}` : "Not connected"}
            </p>
          </div>
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <p className="text-muted-foreground">Loading products…</p>
        )}
        {error && (
          <p className="text-destructive">{error}</p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => {
              const allPrices = p.variants
                .map((v) =>
                  typeof v.price === "string"
                    ? parseFloat(v.price)
                    : parseFloat(v.price.amount)
                )
                .filter((n) => !Number.isNaN(n));
              const minPrice = allPrices.length
                ? Math.min(...allPrices)
                : undefined;
              const currency = p.variants.find((v) => typeof v.price !== "string")
                ? (p.variants.find((v) => typeof v.price !== "string")!.price as any)
                    .currencyCode
                : undefined;

              return (
                <Card
                  key={p.id}
                  className={cn(
                    "overflow-hidden relative cursor-pointer transition-all border",
                    selected.has(p.id)
                      ? "ring-2 ring-emerald-500/60 border-emerald-500/60 shadow-lg scale-[1.01] bg-emerald-50/40 dark:bg-emerald-950/20"
                      : "hover:shadow-md"
                  )}
                  onClick={() => toggleSelected(p.id)}
                >
                  <div className="absolute left-2 top-2 z-10">
                    <Checkbox
                      className="size-5"
                      checked={selected.has(p.id)}
                      onCheckedChange={(v) => toggleSelected(p.id, Boolean(v))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {selected.has(p.id) && (
                    <div className="absolute right-2 top-2 z-10 text-emerald-600">
                      <CheckCircle2 className="size-6 drop-shadow-sm" />
                    </div>
                  )}
                  {p.imageUrl ? (
                    // Use <img> to avoid next/image remote patterns setup
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="h-48 w-full bg-muted" />
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                    </div>
                    <div className="text-base">
                      {minPrice !== undefined
                        ? `From ${currency ?? ""} $${minPrice.toFixed(2)}`
                        : "Price unavailable"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bottom sticky continue bar */}
        {!loading && !error && products.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 mt-8 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 py-4">
              <div className="text-sm text-muted-foreground">
                {selectedCount} selected
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={selectedCount === 0 || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const domain = localStorage.getItem("shop_domain")!;
                    const token = localStorage.getItem("access_token")!;
                    const existingStoreId = localStorage.getItem("store_id");

                    let storeId: string;
                    let currency = "USD";

                    // If store was already created on register page, use that ID
                    if (existingStoreId) {
                      storeId = existingStoreId;
                      console.log("Using existing store ID from register page:", storeId);
                    } else {
                      // Otherwise create a new store (fallback for direct product page access)
                      const storeName = (() => {
                        try {
                          const host = new URL(domain).hostname.replace(
                            ".myshopify.com",
                            ""
                          );
                          return host
                            .split("-")
                            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                            .join(" ");
                        } catch {
                          return "Shopify Store";
                        }
                      })();

                      // 1) Create store via backend
                      const createRes = await fetch("http://localhost:3001/api/stores", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: storeName,
                          url: domain,
                          adminAccessToken: token,
                          currency: "USD",
                          networks: ["solana-devnet"],
                          asset: "USDC",
                          agentMetadata: {
                            minOrder: "5.00",
                            supportsPhysical: true,
                            supportsDigital: false,
                          },
                        }),
                      });
                      if (!createRes.ok) {
                        const t = await createRes.text();
                        throw new Error(`Create store failed: ${t}`);
                      }
                      const created = (await createRes.json()) as {
                        id: string;
                        currency: string;
                      };
                      storeId = created.id;
                      currency = created.currency || "USD";
                      localStorage.setItem("store_id", storeId);
                    }

                    // 2) Prepare selected variants for upsert
                    const selectedProducts = products.filter((p) =>
                      selected.has(p.id)
                    );
                    const selectedVariants = selectedProducts.flatMap((p) =>
                      p.variants.map((v) => ({
                        id: v.id,
                        name:
                          v.title && v.title !== "Default Title"
                            ? `${p.title} - ${v.title}`
                            : p.title,
                        description: p.descriptionHtml ?? null,
                        image: v.imageUrl || p.imageUrl || null,
                        price:
                          typeof v.price === "string"
                            ? v.price
                            : v.price.amount,
                        currency: currency,
                        inventory: v.inventoryQuantity ?? null,
                        metadata: {
                          sku: v.sku ?? undefined,
                          productId: p.id,
                        },
                      }))
                    );

                    // 3) Save selected products via backend
                    const prodRes = await fetch(
                      `http://localhost:3001/api/stores/${storeId}/products`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          products: selectedVariants,
                        }),
                      }
                    );
                    if (!prodRes.ok) {
                      const t = await prodRes.text();
                      throw new Error(`Save products failed: ${t}`);
                    }

                    // Save selection locally
                    localStorage.setItem(
                      "selected_product_ids",
                      JSON.stringify(Array.from(selected))
                    );

                    // Navigate to dashboard
                    window.location.href = "/dashboard";
                  } catch (e) {
                    console.error(e);
                    // eslint-disable-next-line no-alert
                    alert(
                      e instanceof Error ? e.message : "Failed to save selection"
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
