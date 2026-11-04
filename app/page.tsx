"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ArrowRight,
  LogIn,
  Sliders,
  Zap,
  ShieldCheck,
  Smartphone,
  Tablet,
  PlusCircle,
  Flame,
} from "lucide-react";
import { Navbar } from "../components/Navbar";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (cleanCode.length < 4) {
      setError("Please enter a valid room code (e.g. GRACE-4821).");
      return;
    }
    router.push(`/join?code=${encodeURIComponent(cleanCode)}`);
  }

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#F8FAFC] flex flex-col selection:bg-[#DC143C] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DC143C]/30 bg-[#DC143C]/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#FF6B81] shadow-sm shadow-[#DC143C]/10">
            <Flame size={14} className="text-[#F97316] animate-pulse" /> LIVE STAGE TO SOUND BOOTH COMMUNICATION
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-[#F8FAFC]">
            Zero waving hands.
            <br />
            <span className="bg-gradient-to-r from-[#DC143C] via-[#F97316] to-[#FFA726] bg-clip-text text-transparent">
              Instant stage adjustments.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-stone-300 leading-relaxed">
            StageSignal connects church worship musicians directly with the Front of House (FOH) sound engineer.
            One-tap monitor mix requests on mobile, acknowledged and resolved in real time on the FOH iPad console.
          </p>

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-red-500/30 bg-red-950/60 p-3.5 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Quick Launch Cards Grid */}
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2 text-left">
            {/* FOH Card */}
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E1815] to-[#14100D] p-6 sm:p-7 shadow-2xl transition hover:border-[#DC143C]/50 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DC143C]/15 text-[#F97316] border border-[#DC143C]/30 group-hover:scale-105 transition-transform">
                    <Tablet size={22} />
                  </div>
                  <span className="rounded-full bg-[#DC143C]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FF6B81] border border-[#DC143C]/25">
                    FOH Engineer
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white">Start Sound Room</h2>
                <p className="mt-1 text-sm text-stone-300">
                  For FOH sound engineers operating mixing consoles or iPad apps. Set service name, session type, and capacity.
                </p>

                <div className="mt-5 space-y-2.5 text-xs text-stone-400">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                    <span>Cryptographic room code &amp; QR invitation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                    <span>Secure on-device 64-char host token</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                    <span>12-hour session lifetime with auto-expiry</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/create-room"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#DC143C]/25 transition hover:from-[#B80F32] hover:to-[#C2410C] active:scale-98"
                >
                  <PlusCircle size={18} />
                  <span>Create Stage Room</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Musician Card */}
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E1815] to-[#14100D] p-6 sm:p-7 shadow-2xl transition hover:border-[#F97316]/50 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F97316]/15 text-[#FFA726] border border-[#F97316]/30 group-hover:scale-105 transition-transform">
                    <Smartphone size={22} />
                  </div>
                  <span className="rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FFA726] border border-[#F97316]/25">
                    Musicians on Stage
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white">Join Stage Room</h2>
                <p className="mt-1 text-sm text-stone-300">
                  For vocalists, guitarists, drummers, keys, and bassists. Enter code or scan QR.
                </p>

                <form onSubmit={handleJoin} className="mt-5 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={14}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-base uppercase tracking-[0.2em] text-white placeholder-stone-600 outline-none transition focus:border-[#F97316]"
                      placeholder="GRACE-4821"
                    />
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs text-stone-400">
                    💡 Scanning the QR code shared by FOH joins instantly without manual typing.
                  </div>

                  <button
                    type="submit"
                    disabled={!joinCode.trim()}
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#FFA726] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#EA580C]/25 transition hover:from-[#C2410C] hover:to-[#F57C00] active:scale-98 disabled:opacity-40"
                  >
                    <span>Join Stage Room</span>
                    <LogIn size={18} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Pillars */}
        <section className="mx-auto max-w-6xl px-4 py-16 border-t border-white/5 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
              Engineered For Live Church Production
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white">
              Built for speed, clarity, and zero distractions
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#1E1815] p-6 shadow-md hover:border-[#DC143C]/40 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DC143C]/15 text-[#FF6B81] border border-[#DC143C]/25">
                <Zap size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Sub-2-Second Requests</h3>
              <p className="mt-2 text-sm text-stone-300">
                Single-tap buttons for Click, Me, Bass, Drums, and Vocals. No scrolling, no texting, no hand waving.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1E1815] p-6 shadow-md hover:border-[#F97316]/40 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F97316]/15 text-[#FFA726] border border-[#F97316]/25">
                <ShieldCheck size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Zero Accounts Needed</h3>
              <p className="mt-2 text-sm text-stone-300">
                No passwords, no sign-ups, no friction. Secure SHA-256 session tokens keep stage rooms private and ephemeral.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1E1815] p-6 shadow-md hover:border-[#FFA726]/40 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                <Sliders size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">iPad Landscape FOH</h3>
              <p className="mt-2 text-sm text-stone-300">
                Designed specifically for iPads propped next to digital consoles like Yamaha DM3, Behringer X32, or Allen &amp; Heath.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1E1815] p-6 shadow-md hover:border-[#DC143C]/40 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DC143C]/15 text-[#FF6B81] border border-[#DC143C]/25">
                <Users size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">FOH Approval &amp; Presence</h3>
              <p className="mt-2 text-sm text-stone-300">
                FOH controls who joins the room. Real-time heartbeat presence indicates who is actively online on stage.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-stone-500 bg-[#0C0D0E]">
        <p>StageSignal · Real-time Church Stage to FOH Communication</p>
        <p className="mt-1">
          Designed for mobile musicians &amp; iPad sound engineers · Powered by Next.js &amp; Convex Cloud
        </p>
      </footer>
    </div>
  );
}
