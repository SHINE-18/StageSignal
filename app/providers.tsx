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
      <div className="min-h-screen grid place-items-center bg-[#FAF8F5] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-6 text-stone-900">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#DC143C] border border-red-200">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-stone-900">Missing Configuration</h1>
          <p className="mt-2 text-xs text-stone-600 leading-relaxed">
            The environment variable <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono font-bold text-red-600 border border-stone-200">NEXT_PUBLIC_CONVEX_URL</code> is not configured.
          </p>
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-left font-mono text-[11px] text-stone-600 border border-stone-200 space-y-1">
            <p className="text-stone-400">{"// Local development (.env.local):"}</p>
            <p className="text-[#EA580C]">NEXT_PUBLIC_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud</p>
            <p className="text-stone-400 pt-1">{"// Production (Vercel):"}</p>
            <p className="text-emerald-700">Set NEXT_PUBLIC_CONVEX_URL in Vercel Environment Variables</p>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
