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
    <div className="min-h-screen bg-[#090d18] text-[#f8fafc] flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-blue-300">
            <Zap size={14} className="text-blue-400" /> LIVE STAGE TO SOUND BOOTH COMMUNICATION
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-[#f8fafc]">
            Zero waving hands.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Instant stage adjustments.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-[#94a3b8]">
            StageSignal connects church worship musicians directly with the Front of House (FOH) sound engineer.
            One-tap monitor mix requests on mobile, acknowledged and resolved in real time on the FOH iPad console.
          </p>

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Quick Launch Cards Grid */}
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2 text-left">
            {/* FOH Card */}
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#151d2d] to-[#111827] p-6 sm:p-7 shadow-2xl transition hover:border-blue-500/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/25">
                    <Tablet size={22} />
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300 border border-blue-500/20">
                    FOH Engineer
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white">Start Sound Room</h2>
                <p className="mt-1 text-sm text-[#94a3b8]">
                  For FOH sound engineers operating mixing consoles or iPad apps. Set service name, session type, and capacity.
                </p>

                <div className="mt-5 space-y-2.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span>Cryptographic room code &amp; QR invitation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span>Secure on-device 64-char host token</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span>12-hour session lifetime with auto-expiry</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/create-room"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-98"
                >
                  <PlusCircle size={18} />
                  <span>Create Stage Room</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Musician Card */}
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#151d2d] to-[#111827] p-6 sm:p-7 shadow-2xl transition hover:border-emerald-500/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <Smartphone size={22} />
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 border border-emerald-500/20">
                    Musicians on Stage
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white">Join Stage Room</h2>
                <p className="mt-1 text-sm text-[#94a3b8]">
                  For vocalists, guitarists, drummers, keys, and bassists. Enter code or scan QR.
                </p>

                <form onSubmit={handleJoin} className="mt-5 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={14}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-base uppercase tracking-[0.2em] text-white placeholder-slate-600 outline-none transition focus:border-emerald-400"
                      placeholder="GRACE-4821"
                    />
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs text-[#94a3b8]">
                    💡 Scanning the QR code shared by FOH joins instantly without manual typing.
                  </div>

                  <button
                    type="submit"
                    disabled={!joinCode.trim()}
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-98 disabled:opacity-40"
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
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Engineered For Live Church Production
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white">
              Built for speed, clarity, and zero distractions
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#151d2d] p-6 shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Zap size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Sub-2-Second Requests</h3>
              <p className="mt-2 text-sm text-[#94a3b8]">
                Single-tap buttons for Click, Me, Bass, Drums, and Vocals. No scrolling, no texting, no hand waving.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151d2d] p-6 shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Zero Accounts Needed</h3>
              <p className="mt-2 text-sm text-[#94a3b8]">
                No passwords, no sign-ups, no friction. Secure SHA-256 session tokens keep stage rooms private and ephemeral.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151d2d] p-6 shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Sliders size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">iPad Landscape FOH</h3>
              <p className="mt-2 text-sm text-[#94a3b8]">
                Designed specifically for iPads propped next to digital consoles like Yamaha DM3, Behringer X32, or Allen &amp; Heath.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151d2d] p-6 shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Users size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">FOH Approval &amp; Presence</h3>
              <p className="mt-2 text-sm text-[#94a3b8]">
                FOH controls who joins the room. Real-time heartbeat presence indicates who is actively online on stage.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        <p>StageSignal · Real-time Church Stage to FOH Communication</p>
        <p className="mt-1">
          Designed for mobile musicians &amp; iPad sound engineers · Powered by Next.js &amp; Convex Cloud
        </p>
      </footer>
    </div>
  );
}
