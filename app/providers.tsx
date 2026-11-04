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
        <div className="max-w-md rounded-3xl border border-white/15 bg-black/60 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-red-950 text-[#FC3B00] border border-[#FC3B00]/30">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Missing Configuration</h1>
          <p className="mt-2 text-xs text-stone-300 leading-relaxed">
            The environment variable <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono font-bold text-[#FF7145] border border-white/15">NEXT_PUBLIC_CONVEX_URL</code> is not configured.
          </p>
          <div className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-left font-mono text-[11px] text-stone-300 border border-white/10 space-y-1.5">
            <p className="text-stone-500">{"// Local development (.env.local):"}</p>
            <p className="text-[#FF6129]">NEXT_PUBLIC_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud</p>
            <p className="text-stone-500 pt-1">{"// Production (Vercel):"}</p>
            <p className="text-emerald-400">Set NEXT_PUBLIC_CONVEX_URL in Vercel Environment Variables</p>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
