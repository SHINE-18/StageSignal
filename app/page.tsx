"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LogIn,
  Sliders,
  Radio,
  Clock,
  ShieldCheck,
  Tablet,
  Plus,
  Volume2,
  Mic,
  Music,
  CheckCircle2,
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
      setError("Please enter a valid room code (e.g. GRACE-4821)");
      return;
    }
    router.push(`/join?code=${encodeURIComponent(cleanCode)}`);
  }

  return (
    <div className="min-h-screen bg-[#000000] bg-arounda-glow text-white flex flex-col selection:bg-[#FC3B00] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
          <div className="max-w-3xl">
            {/* Meta indicator */}
            <div className="arounda-pill mb-6">
              <span className="h-2 w-2 rounded-full bg-[#FC3B00] animate-pulse" />
              <span className="font-semibold text-white">Stage-to-FOH Link</span>
              <span className="text-stone-500">•</span>
              <span className="text-[#FF7145] font-mono">Latency &lt; 2s</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-white leading-[1.08]">
              Silent stage communication for live worship
            </h1>

            <p className="mt-5 max-w-2xl text-base sm:text-lg text-stone-300 leading-relaxed">
              Musicians tap one preset button on their phone. Front of house receives and resolves the cue on the iPad console in real time. No waving hands, no shouting across the stage.
            </p>

            {error && (
              <div className="mt-6 max-w-md rounded-2xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Quick Launch Console Cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 text-left">
            {/* FOH Card */}
            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-md shadow-[#FC3B00]/10">
                      <Tablet size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">Sound Engineer Console</h2>
                      <p className="text-xs text-stone-400">FOH iPad or laptop mixing station</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#FF7145] font-bold uppercase px-2.5 py-0.5 rounded-full border border-[#FC3B00]/30 bg-[#FC3B00]/10">Host</span>
                </div>

                <div className="mt-6 space-y-3 text-xs text-stone-300">
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FC3B00]" />
                    <span>Live reactive queue with 1-tap acknowledge and resolve</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FC3B00]" />
                    <span>Real-time stage musician presence with 75s disconnect notice</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FC3B00]" />
                    <span>Full-width emergency SOS priority banner with persistent border</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <Link
                  href="/create-room"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-4 text-xs font-bold text-white shadow-lg shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition"
                >
                  <Plus size={16} strokeWidth={2} />
                  <span>Start Sound Room</span>
                  <ArrowRight size={14} strokeWidth={2} className="ml-1 opacity-80" />
                </Link>
              </div>
            </div>

            {/* Musician Card */}
            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
                      <Radio size={20} strokeWidth={1.5} className="text-[#FF7145]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">Musician Stage Console</h2>
                      <p className="text-xs text-stone-400">Mobile phone mounted on mic stand</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400 font-bold uppercase px-2.5 py-0.5 rounded-full border border-white/15 bg-white/5">Stage</span>
                </div>

                <form onSubmit={handleJoin} className="mt-6 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Enter Room Code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={14}
                      className="w-full h-11 rounded-xl border border-white/15 bg-black/60 px-3.5 font-mono text-sm tracking-[0.15em] text-white placeholder-stone-500 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00]"
                      placeholder="e.g. CHORD-2097"
                    />
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Or scan the QR code displayed on the sound engineer&apos;s console to join instantly without typing.
                  </p>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!joinCode.trim()}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
                    >
                      <LogIn size={15} strokeWidth={1.5} />
                      <span>Join Stage Session</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Real Product Preview (Unslop Visual: The Product Itself) */}
          <div className="mt-14 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <span className="text-[11px] font-mono text-[#FF7145] font-bold uppercase tracking-wider">Live stage cue preview</span>
                <h3 className="text-lg font-bold text-white mt-1 tracking-tight">One-tap presets configured for stage mix adjustments</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Channel Active
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <Volume2 size={16} strokeWidth={1.5} className="text-[#FF7145]" />
                  <span className="text-xs font-bold text-white">More Click</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">1-tap</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <Mic size={16} strokeWidth={1.5} className="text-[#FF7145]" />
                  <span className="text-xs font-bold text-white">More Me</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">1-tap</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <Music size={16} strokeWidth={1.5} className="text-[#FF7145]" />
                  <span className="text-xs font-bold text-white">More Keys</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">1-tap</span>
              </div>
              <div className="rounded-xl border border-[#FC3B00]/40 bg-red-950/40 p-3.5 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#FC3B00] animate-pulse" />
                  <span className="text-xs font-bold text-white">Urgent SOS</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#FC3B00]">Hold</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Specs */}
        <section className="mx-auto max-w-6xl px-4 py-16 border-t border-white/10 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Designed for live production environments
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              Every control and interaction is optimized for zero latency, dark venues, and single-handed mobile use.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 shadow-lg">
              <Clock size={20} strokeWidth={1.5} className="text-[#FF7145]" />
              <h3 className="mt-4 font-bold text-sm text-white tracking-tight">Sub-2-second delivery</h3>
              <p className="mt-1.5 text-xs text-stone-400 leading-relaxed">
                Persistent WebSocket connection delivers stage cues directly to FOH without page refreshes or polling lag.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 shadow-lg">
              <ShieldCheck size={20} strokeWidth={1.5} className="text-[#FF7145]" />
              <h3 className="mt-4 font-bold text-sm text-white tracking-tight">No user accounts</h3>
              <p className="mt-1.5 text-xs text-stone-400 leading-relaxed">
                Ephemeral 64-character bearer tokens hashed server-side. No passwords or app store installations required.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 shadow-lg">
              <Sliders size={20} strokeWidth={1.5} className="text-[#FF7145]" />
              <h3 className="mt-4 font-bold text-sm text-white tracking-tight">iPad landscape console</h3>
              <p className="mt-1.5 text-xs text-stone-400 leading-relaxed">
                Fits beside digital consoles (Yamaha, Behringer, Allen &amp; Heath) with Slide Over mini-console support.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 shadow-lg">
              <CheckCircle2 size={20} strokeWidth={1.5} className="text-[#4cc38a]" />
              <h3 className="mt-4 font-bold text-sm text-white tracking-tight">FOH approval gate</h3>
              <p className="mt-1.5 text-xs text-stone-400 leading-relaxed">
                Sound engineer approves every stage musician before access is granted. Maximum 8 musicians per service room.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-stone-400 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">StageSignal</span>
            <span className="text-stone-600">•</span>
            <span>Stage to sound booth communication</span>
          </div>
          <div className="text-[11px] font-mono text-stone-400">
            Next.js App Router • Convex Cloud
          </div>
        </div>
      </footer>
    </div>
  );
}
