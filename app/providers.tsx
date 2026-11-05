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
      <div className="min-h-screen grid place-items-center bg-[#141415] p-6 text-[#ededed]">
        <div className="max-w-md rounded-xl border border-white/[0.08] bg-[#19191b] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-amber-400 border border-white/[0.08]">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#ededed] tracking-tight">Configuration required</h1>
          <p className="mt-2 text-xs text-[#a1a1a6] leading-relaxed">
            The environment variable <code className="rounded bg-[#232325] px-1.5 py-0.5 font-mono text-[#fc3b00] border border-white/[0.08]">NEXT_PUBLIC_CONVEX_URL</code> is not configured.
          </p>
          <div className="mt-4 rounded-lg bg-[#0f0f10] p-4 text-left font-mono text-[11px] text-[#ededed] border border-white/[0.08] space-y-1.5">
            <p className="text-[#85858b]">{"// Local development (.env.local):"}</p>
            <p className="text-[#fc3b00]">NEXT_PUBLIC_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud</p>
            <p className="text-[#85858b] pt-1">{"// Production (Vercel):"}</p>
            <p className="text-[#4cc38a]">Set NEXT_PUBLIC_CONVEX_URL in Vercel Environment Variables</p>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
