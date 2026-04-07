/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: storeName.trim() || undefined,
          url: storeUrl.trim(),
          adminAccessToken: adminToken.trim(),
          description: storeDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create store");
      }

      const storeData = await response.json();

      // Store in localStorage for subsequent requests
      localStorage.setItem("shop_domain", storeUrl.trim());
      localStorage.setItem("access_token", adminToken.trim());
      localStorage.setItem("store_id", storeData.id);

      router.push("/products");
    } catch (err: any) {
      setError(err.message || "Failed to connect store. Please try again.");
      console.error("Store connection error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-emerald-900 dark:via-emerald-950 dark:to-emerald-900 flex flex-col px-4">
      {/* Back button */}
      <div className="pt-6">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-lg border-emerald-200/70 dark:border-emerald-800/60">
          <form onSubmit={handleSubmit} className="contents">
            <CardHeader>
              <CardTitle className="text-2xl">Connect Your Shopify Store</CardTitle>
              <CardDescription>
                Enter your store credentials to get started in 2 minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="store-name">Store Name</Label>
                <Input
                  id="store-name"
                  type="text"
                  placeholder="My Awesome Store"
                  className="bg-white/70 dark:bg-white/5"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-url">Store URL</Label>
                <Input
                  id="store-url"
                  type="url"
                  inputMode="url"
                  required
                  placeholder="https://your-store.myshopify.com"
                  className="bg-white/70 dark:bg-white/5"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-description">Store Description</Label>
                <Textarea
                  id="store-description"
                  placeholder="Brief description of your store and what you sell"
                  className="bg-white/70 dark:bg-white/5 min-h-24"
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-token">Admin API Access Token</Label>
                <Input
                  id="admin-token"
                  type="password"
                  required
                  placeholder="shpat_..."
                  className="bg-white/70 dark:bg-white/5"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Connecting..." : "Connect Shopify"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
