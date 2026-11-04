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
    <div className="min-h-screen bg-[#000000] text-white flex flex-col selection:bg-[#FC3B00] selection:text-white bg-arounda-glow">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 sm:pt-20 sm:pb-20 text-center">
          {/* Arounda Pill Badge */}
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-4 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FC3B00] animate-pulse" />
            <Flame size={14} className="text-[#FC3B00]" />
            <span className="text-stone-200">LIVE STAGE TO SOUND BOOTH COMMUNICATION</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-white">
            Zero waving hands.
            <br />
            <span className="bg-gradient-to-r from-[#FC3B00] via-[#FF6129] to-[#FF7145] bg-clip-text text-transparent">
              Instant stage adjustments.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-stone-300 leading-relaxed font-normal">
            StageSignal connects church worship musicians directly with the Front of House (FOH) sound engineer.
            One-tap monitor mix requests on mobile, acknowledged and resolved in real time on the FOH iPad console.
          </p>

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-md p-3.5 text-sm font-medium text-red-200 shadow-xl">
              {error}
            </div>
          )}

          {/* Quick Launch Cards Grid */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2 text-left">
            {/* FOH Card */}
            <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl hover:border-[#FF6129]/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/20 to-[#FF6129]/10 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/10 group-hover:scale-105 transition-transform">
                    <Tablet size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FC3B00]" />
                    <span>FOH Engineer</span>
                  </div>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white tracking-tight">Start Sound Room</h2>
                <p className="mt-1 text-sm text-stone-400">
                  For FOH sound engineers operating mixing consoles or iPad apps. Set service name, session type, and capacity.
                </p>

                <div className="mt-6 space-y-3 text-xs text-stone-300">
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6129]" />
                    <span>Cryptographic room code &amp; QR invitation</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6129]" />
                    <span>Secure on-device 64-char host token</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6129]" />
                    <span>12-hour session lifetime with auto-expiry</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/create-room"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#FC3B00]/25 transition hover:from-[#E03500] hover:to-[#F2551D] active:scale-98"
                >
                  <PlusCircle size={18} />
                  <span>Create Stage Room</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Musician Card */}
            <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl hover:border-[#FF6129]/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6129]/20 to-[#FF7145]/10 text-[#FF6129] border border-[#FF6129]/30 shadow-lg shadow-[#FF6129]/10 group-hover:scale-105 transition-transform">
                    <Smartphone size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6129]" />
                    <span>Musicians on Stage</span>
                  </div>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white tracking-tight">Join Stage Room</h2>
                <p className="mt-1 text-sm text-stone-400">
                  For vocalists, guitarists, drummers, keys, and bassists. Enter code or scan QR.
                </p>

                <form onSubmit={handleJoin} className="mt-6 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={14}
                      className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 font-mono text-base uppercase tracking-[0.2em] text-white placeholder-stone-600 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00]"
                      placeholder="GRACE-4821"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-stone-400 flex items-center gap-2">
                    <span className="text-[#FF7145]">💡</span>
                    <span>Scanning the QR code shared by FOH joins instantly without manual typing.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!joinCode.trim()}
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#FC3B00]/25 transition hover:from-[#E03500] hover:to-[#F2551D] active:scale-98 disabled:opacity-40"
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
        <section className="mx-auto max-w-6xl px-4 py-16 border-t border-white/10 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FF7145]">
              Engineered For Live Church Production
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
              Built for speed, clarity, and zero distractions
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-xl hover:border-white/20 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/20 to-[#FF6129]/10 text-[#FC3B00] border border-[#FC3B00]/30">
                <Zap size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Sub-2-Second Requests</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                Single-tap buttons for Click, Me, Bass, Drums, and Vocals. No scrolling, no texting, no hand waving.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-xl hover:border-white/20 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6129]/20 to-[#FF7145]/10 text-[#FF6129] border border-[#FF6129]/30">
                <ShieldCheck size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Zero Accounts Needed</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                No passwords, no sign-ups, no friction. Secure SHA-256 session tokens keep stage rooms private and ephemeral.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-xl hover:border-white/20 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7145]/20 to-[#FF6129]/10 text-[#FF7145] border border-[#FF7145]/30">
                <Sliders size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">iPad Landscape FOH</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                Designed specifically for iPads propped next to digital consoles like Yamaha DM3, Behringer X32, or Allen &amp; Heath.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-xl hover:border-white/20 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/20 to-[#FF7145]/10 text-[#FC3B00] border border-[#FC3B00]/30">
                <Users size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">FOH Approval &amp; Presence</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                FOH controls who joins the room. Real-time heartbeat presence indicates who is actively online on stage.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-stone-500 bg-black/60">
        <p>StageSignal · Real-time Church Stage to FOH Communication</p>
        <p className="mt-1">
          Designed for mobile musicians &amp; iPad sound engineers · Powered by Next.js &amp; Convex Cloud
        </p>
      </footer>
    </div>
  );
}
