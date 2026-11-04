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
      <div className="min-h-screen grid place-items-center bg-[#090d18] p-6 text-[#f8fafc]">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-[#111827] p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/60 text-red-400 border border-red-500/30">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-white">Missing Configuration</h1>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            The environment variable <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono font-bold text-red-400">NEXT_PUBLIC_CONVEX_URL</code> is not configured.
          </p>
          <div className="mt-4 rounded-xl bg-[#151d2d] p-3 text-left font-mono text-[11px] text-slate-400 border border-white/5 space-y-1">
            <p className="text-slate-500">{"// Local development (.env.local):"}</p>
            <p className="text-blue-400">NEXT_PUBLIC_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud</p>
            <p className="text-slate-500 pt-1">{"// Production (Vercel):"}</p>
            <p className="text-emerald-400">Set NEXT_PUBLIC_CONVEX_URL in Vercel Environment Variables</p>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
