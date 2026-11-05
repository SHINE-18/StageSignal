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
    <div className="min-h-screen bg-[#141415] text-[#ededed] flex flex-col selection:bg-[#fc3b00] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
          <div className="max-w-3xl">
            {/* Meta indicator */}
            <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#19191b] px-3 py-1 text-xs text-[#a1a1a6] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fc3b00]" />
              <span className="font-medium text-[#ededed]">Stage-to-FOH link</span>
              <span className="text-[#85858b]">•</span>
              <span>Latency &lt; 2s</span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl text-[#ededed] leading-[1.08]">
              Silent stage communication for live worship
            </h1>

            <p className="mt-5 max-w-2xl text-base sm:text-lg text-[#a1a1a6] leading-relaxed">
              Musicians tap one preset button on their phone. Front of house receives and resolves the cue on the iPad console in real time. No waving hands, no shouting across the stage.
            </p>

            {error && (
              <div className="mt-6 max-w-md rounded-lg border border-[#e5484d]/30 bg-[#19191b] p-3 text-xs text-[#e5484d]">
                {error}
              </div>
            )}
          </div>

          {/* Quick Launch Console Cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 text-left">
            {/* FOH Card */}
            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#232325] border border-white/[0.08] text-[#ededed]">
                      <Tablet size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#ededed]">Sound engineer console</h2>
                      <p className="text-xs text-[#85858b]">FOH iPad or laptop mixing station</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#85858b] uppercase">Host</span>
                </div>

                <div className="mt-6 space-y-3 text-xs text-[#a1a1a6]">
                  <div className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-[#85858b]" />
                    <span>Live reactive queue with 1-tap acknowledge and resolve</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-[#85858b]" />
                    <span>Real-time stage musician presence with 75s disconnect notice</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-[#85858b]" />
                    <span>Full-width emergency SOS priority banner with persistent border</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <Link
                  href="/create-room"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#fc3b00] px-4 text-xs font-medium text-white hover:bg-[#e03500] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                >
                  <Plus size={16} strokeWidth={1.5} />
                  <span>Start sound room</span>
                  <ArrowRight size={14} strokeWidth={1.5} className="ml-1 opacity-70" />
                </Link>
              </div>
            </div>

            {/* Musician Card */}
            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#232325] border border-white/[0.08] text-[#ededed]">
                      <Radio size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#ededed]">Musician stage console</h2>
                      <p className="text-xs text-[#85858b]">Mobile phone mounted on mic stand</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#85858b] uppercase">Stage</span>
                </div>

                <form onSubmit={handleJoin} className="mt-6 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a1a1a6] mb-1.5">
                      Enter room code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={14}
                      className="w-full h-11 rounded-lg border border-white/[0.08] bg-[#0f0f10] px-3.5 font-mono text-sm tracking-[0.15em] text-[#ededed] placeholder-[#85858b]/60 outline-none transition-colors focus:border-[#fc3b00]"
                      placeholder="e.g. CHORD-2097"
                    />
                  </div>

                  <p className="text-[11px] text-[#85858b] leading-relaxed">
                    Or scan the QR code displayed on the sound engineer&apos;s console to join instantly without typing.
                  </p>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!joinCode.trim()}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#232325] px-4 text-xs font-medium text-[#ededed] hover:bg-[#2b2b2e] hover:border-white/[0.12] transition-colors disabled:opacity-40"
                    >
                      <LogIn size={15} strokeWidth={1.5} />
                      <span>Join stage session</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Real Product Preview (Unslop Visual: The Product Itself) */}
          <div className="mt-14 rounded-xl border border-white/[0.08] bg-[#0f0f10] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
              <div>
                <span className="text-[11px] font-mono text-[#85858b] uppercase tracking-wider">Live stage cue preview</span>
                <h3 className="text-lg font-semibold text-[#ededed] mt-1">One-tap presets configured for stage mix adjustments</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#4cc38a]/20 bg-[#4cc38a]/10 px-2.5 py-1 text-[11px] font-medium text-[#4cc38a]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4cc38a]" />
                  Channel active
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 size={16} strokeWidth={1.5} className="text-[#fc3b00]" />
                  <span className="text-xs font-medium text-[#ededed]">More Click</span>
                </div>
                <span className="text-[10px] font-mono text-[#85858b]">1-tap</span>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mic size={16} strokeWidth={1.5} className="text-[#fc3b00]" />
                  <span className="text-xs font-medium text-[#ededed]">More Me</span>
                </div>
                <span className="text-[10px] font-mono text-[#85858b]">1-tap</span>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Music size={16} strokeWidth={1.5} className="text-[#fc3b00]" />
                  <span className="text-xs font-medium text-[#ededed]">More Keys</span>
                </div>
                <span className="text-[10px] font-mono text-[#85858b]">1-tap</span>
              </div>
              <div className="rounded-lg border border-[#e5484d]/30 bg-[#19191b] p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#e5484d]" />
                  <span className="text-xs font-medium text-[#ededed]">Urgent SOS</span>
                </div>
                <span className="text-[10px] font-mono text-[#e5484d]">Hold</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Specs */}
        <section className="mx-auto max-w-6xl px-4 py-16 border-t border-white/[0.08] sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-[#ededed] tracking-tight">
              Designed for live production environments
            </h2>
            <p className="mt-2 text-sm text-[#a1a1a6]">
              Every control and interaction is optimized for zero latency, dark venues, and single-handed mobile use.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
              <Clock size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />
              <h3 className="mt-4 font-medium text-sm text-[#ededed]">Sub-2-second delivery</h3>
              <p className="mt-1.5 text-xs text-[#85858b] leading-relaxed">
                Persistent WebSocket connection delivers stage cues directly to FOH without page refreshes or polling lag.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
              <ShieldCheck size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />
              <h3 className="mt-4 font-medium text-sm text-[#ededed]">No user accounts</h3>
              <p className="mt-1.5 text-xs text-[#85858b] leading-relaxed">
                Ephemeral 64-character bearer tokens hashed server-side. No passwords or app store installations required.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
              <Sliders size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />
              <h3 className="mt-4 font-medium text-sm text-[#ededed]">iPad landscape console</h3>
              <p className="mt-1.5 text-xs text-[#85858b] leading-relaxed">
                Fits beside digital consoles (Yamaha, Behringer, Allen &amp; Heath) with Slide Over mini-console support.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
              <CheckCircle2 size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />
              <h3 className="mt-4 font-medium text-sm text-[#ededed]">FOH approval gate</h3>
              <p className="mt-1.5 text-xs text-[#85858b] leading-relaxed">
                Sound engineer approves every stage musician before access is granted. Maximum 8 musicians per service room.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-[#85858b] bg-[#0f0f10]">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#ededed]">StageSignal</span>
            <span>•</span>
            <span>Stage to sound booth communication</span>
          </div>
          <div className="text-[11px] font-mono text-[#85858b]">
            Next.js App Router • Convex Cloud
          </div>
        </div>
      </footer>
    </div>
  );
}
