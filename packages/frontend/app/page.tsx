"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Globe, Clock } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-emerald-50 to-white dark:from-slate-950 dark:via-emerald-950/30 dark:to-slate-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-emerald-100/50 dark:border-emerald-900/30">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">X402</div>
        <Button
          onClick={() => router.push("/register")}
          variant="outline"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
        >
          Get Started
        </Button>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm mb-2 animate-in fade-in slide-in-from-top-4 duration-1000">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Built on Stellar Blockchain
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                Make Your Shopify Store{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-300">
                  Agent Ready
                </span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Empower AI agents to discover and place orders in your Shopify store. The future of commerce is here—extend your store&apos;s reach to intelligent agents in just 2 minutes.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Discoverable by AI Agents</h3>
                  <p className="text-slate-600 dark:text-slate-400">Your store becomes visible to LLM agents and AI assistants</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Seamless Order Integration</h3>
                  <p className="text-slate-600 dark:text-slate-400">Orders placed by agents appear directly in your Shopify dashboard</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">2-Minute Setup</h3>
                  <p className="text-slate-600 dark:text-slate-400">Connect your store in just 120 seconds and start accepting agent orders</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => router.push("/register")}
              className="w-full md:w-auto px-8 py-6 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Get Started in 2 Minutes
            </Button>
          </div>

          {/* Right Visual */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Gradient background orbs */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-b from-emerald-300 to-emerald-100 dark:from-emerald-600/40 dark:to-emerald-900/20 rounded-full blur-3xl opacity-30"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-t from-teal-300 to-teal-100 dark:from-teal-600/40 dark:to-teal-900/20 rounded-full blur-3xl opacity-30"></div>

              {/* Card showcase */}
              <div className="relative z-10 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Agent Discovery</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Your products are indexed and searchable by AI agents across the web</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Real-Time Processing</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Agent orders are processed instantly and appear in your dashboard</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Future-Ready</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">As AI becomes the future of web, your store stays ahead of the curve</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border-y border-emerald-100 dark:border-emerald-900/30">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
            Why Store Owners Love X402
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Expand Revenue Streams",
                description: "Reach new customers through AI agents and automated purchasing systems",
                icon: "📈",
              },
              {
                title: "Zero Integration Hassle",
                description: "No code changes needed. We handle all the complexity for you.",
                icon: "⚡",
              },
              {
                title: "Same Shopify Experience",
                description: "Orders show up in your Shopify dashboard exactly as they normally would",
                icon: "🛍️",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-lg p-8 border border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Ready for the Future?</h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          Set up your agent-ready store in just 2 minutes. No credit card required.
        </p>
        <Button
          onClick={() => router.push("/register")}
          className="px-10 py-6 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          Get Started Now
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t border-emerald-100/50 dark:border-emerald-900/30 py-8 text-center text-slate-600 dark:text-slate-400">
        <p>X402 - Making Shopify stores agent-ready for the future of commerce on Stellar</p>
      </footer>
    </div>
  );
}
