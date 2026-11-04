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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col selection:bg-[#DC143C] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 bg-[linear-gradient(to_right,rgba(220,20,60,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,20,60,0.035)_1px,transparent_1px)] bg-[size:32px_32px]">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-6 sm:pt-16 sm:pb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-bold tracking-wide text-orange-700 shadow-sm">
            <Flame size={14} className="text-[#EA580C] animate-pulse" /> LIVE STAGE TO SOUND BOOTH COMMUNICATION
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-stone-900">
            Zero waving hands.
            <br />
            <span className="bg-gradient-to-r from-[#DC143C] via-[#EA580C] to-[#FFA726] bg-clip-text text-transparent">
              Instant stage adjustments.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-stone-600 leading-relaxed">
            StageSignal connects church worship musicians directly with the Front of House (FOH) sound engineer.
            One-tap monitor mix requests on mobile, acknowledged and resolved in real time on the FOH iPad console.
          </p>

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {/* Quick Launch Cards Grid */}
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2 text-left">
            {/* FOH Card */}
            <div className="relative rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-orange-400/60 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#DC143C] border border-red-200 group-hover:scale-105 transition-transform">
                    <Tablet size={22} />
                  </div>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#DC143C] border border-red-200">
                    FOH Engineer
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-stone-900">Start Sound Room</h2>
                <p className="mt-1 text-sm text-stone-600">
                  For FOH sound engineers operating mixing consoles or iPad apps. Set service name, session type, and capacity.
                </p>

                <div className="mt-5 space-y-2.5 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                    <span>Cryptographic room code &amp; QR invitation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                    <span>Secure on-device 64-char host token</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                    <span>12-hour session lifetime with auto-expiry</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/create-room"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3.5 font-bold text-white shadow-md shadow-[#DC143C]/20 transition hover:from-[#B80F32] hover:to-[#C2410C] active:scale-98"
                >
                  <PlusCircle size={18} />
                  <span>Create Stage Room</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Musician Card */}
            <div className="relative rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-orange-400/60 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] border border-orange-200 group-hover:scale-105 transition-transform">
                    <Smartphone size={22} />
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#EA580C] border border-orange-200">
                    Musicians on Stage
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-stone-900">Join Stage Room</h2>
                <p className="mt-1 text-sm text-stone-600">
                  For vocalists, guitarists, drummers, keys, and bassists. Enter code or scan QR.
                </p>

                <form onSubmit={handleJoin} className="mt-5 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={14}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-base uppercase tracking-[0.2em] text-stone-900 placeholder-stone-400 outline-none transition focus:bg-white focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                      placeholder="GRACE-4821"
                    />
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-600">
                    💡 Scanning the QR code shared by FOH joins instantly without manual typing.
                  </div>

                  <button
                    type="submit"
                    disabled={!joinCode.trim()}
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3.5 font-bold text-white shadow-md shadow-[#DC143C]/20 transition hover:from-[#B80F32] hover:to-[#C2410C] active:scale-98 disabled:opacity-40"
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
        <section className="mx-auto max-w-6xl px-4 py-16 border-t border-stone-200 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#EA580C]">
              Engineered For Live Church Production
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-stone-900">
              Built for speed, clarity, and zero distractions
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:border-orange-300 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#DC143C] border border-red-200">
                <Zap size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-stone-900">Sub-2-Second Requests</h3>
              <p className="mt-2 text-sm text-stone-600">
                Single-tap buttons for Click, Me, Bass, Drums, and Vocals. No scrolling, no texting, no hand waving.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:border-orange-300 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200">
                <ShieldCheck size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-stone-900">Zero Accounts Needed</h3>
              <p className="mt-2 text-sm text-stone-600">
                No passwords, no sign-ups, no friction. Secure SHA-256 session tokens keep stage rooms private and ephemeral.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:border-orange-300 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#D97706] border border-amber-200">
                <Sliders size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-stone-900">iPad Landscape FOH</h3>
              <p className="mt-2 text-sm text-stone-600">
                Designed specifically for iPads propped next to digital consoles like Yamaha DM3, Behringer X32, or Allen &amp; Heath.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:border-orange-300 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#DC143C] border border-red-200">
                <Users size={20} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-stone-900">FOH Approval &amp; Presence</h3>
              <p className="mt-2 text-sm text-stone-600">
                FOH controls who joins the room. Real-time heartbeat presence indicates who is actively online on stage.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8 text-center text-xs text-stone-500 bg-[#FAF8F5]">
        <p>StageSignal · Real-time Church Stage to FOH Communication</p>
        <p className="mt-1">
          Designed for mobile musicians &amp; iPad sound engineers · Powered by Next.js &amp; Convex Cloud
        </p>
      </footer>
    </div>
  );
}
