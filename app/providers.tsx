"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState<ConvexReactClient | null>(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url || !url.startsWith("http")) {
      return null;
    }
    try {
      return new ConvexReactClient(url);
    } catch {
      return null;
    }
  });

  if (!client) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#000000] bg-arounda-glow p-6 text-white">
        <div className="max-w-md rounded-3xl border border-white/15 bg-[#0d0c0e] p-8 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-red-950 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/20">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Configuration Required</h1>
          <p className="text-xs text-stone-300 leading-relaxed">
            The environment variable <code className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[#FF7145] border border-white/10">NEXT_PUBLIC_CONVEX_URL</code> is not configured.
          </p>
          <div className="rounded-2xl bg-black/80 p-4 text-left font-mono text-[11px] text-white border border-white/10 space-y-1.5">
            <p className="text-stone-500">{"// Local development (.env.local):"}</p>
            <p className="text-[#FF7145]">NEXT_PUBLIC_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud</p>
            <p className="text-stone-500 pt-1">{"// Production (Vercel):"}</p>
            <p className="text-[#4cc38a]">Set NEXT_PUBLIC_CONVEX_URL in Vercel Environment Variables</p>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
