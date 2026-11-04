"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Radio,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sliders,
  Sparkles,
  Users,
  Loader2,
  AlertCircle,
  Flame,
} from "lucide-react";
import { generateToken, saveHostToken } from "../../lib/session";
import { Navbar } from "../../components/Navbar";

type SessionType = "sunday" | "rehearsal" | "special";

export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);

  const [roomName, setRoomName] = useState("Sunday Morning Worship");
  const [sessionType, setSessionType] = useState<SessionType>("sunday");
  const [capacity, setCapacity] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) {
      setError("Please enter a room or service name.");
      return;
    }
    if (trimmed.length > 60) {
      setError("Room name cannot exceed 60 characters.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      // 1. Generate 64-character raw cryptographic token client-side
      const rawHostToken = generateToken();

      // 2. Send RAW hostToken as bearer token over HTTPS (server computes SHA-256 hash)
      const result = await createRoom({
        name: trimmed,
        sessionType,
        capacity,
        hostToken: rawHostToken,
      });

      // 3. Save raw host token strictly in device's localStorage
      saveHostToken(result.roomId, rawHostToken);

      // 4. Navigate to FOH sound console
      router.push(`/room/${result.roomId}/foh`);
    } catch (err) {
      console.error("Create room error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create stage room. Please check your connection."
      );
      setBusy(false);
    }
  }

  const sessionOptions: {
    id: SessionType;
    title: string;
    description: string;
    icon: typeof Radio;
  }[] = [
    {
      id: "sunday",
      title: "Sunday Service",
      description: "Standard worship service with real-time cues",
      icon: Sparkles,
    },
    {
      id: "rehearsal",
      title: "Rehearsal",
      description: "Midweek sound check and band practice",
      icon: Sliders,
    },
    {
      id: "special",
      title: "Special Event",
      description: "Concert, conference, or guest ministry",
      icon: Calendar,
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col selection:bg-[#FC3B00] selection:text-white bg-arounda-glow">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 flex flex-col justify-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-white transition w-fit"
        >
          <ArrowLeft size={16} /> Back to Overview
        </Link>

        <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200">
            <span className="h-2 w-2 rounded-full bg-[#FC3B00] animate-pulse" />
            <Flame size={14} className="text-[#FC3B00]" />
            <span>FOH Sound Engineer Setup</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Create Live Stage Room
          </h1>
          <p className="mt-1.5 text-sm text-stone-400 leading-relaxed">
            Launch a real-time communication room for worship musicians and FOH. Room codes are automatically generated with active collision prevention.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-sm font-medium text-red-200 flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="mt-6 space-y-6">
            {/* Room Name */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Room / Service Name
                </label>
                <span className="text-[11px] text-stone-500 font-mono">
                  {roomName.length}/60
                </span>
              </div>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={60}
                required
                disabled={busy}
                placeholder="e.g. Sunday Morning Service"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-stone-600 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00] disabled:opacity-50"
              />
            </div>

            {/* Session Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                Session Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sessionOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = sessionType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setSessionType(opt.id)}
                      className={`rounded-xl border p-4 text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "border-[#FC3B00] bg-[#FC3B00]/15 text-white shadow-lg shadow-[#FC3B00]/10 ring-1 ring-[#FC3B00]"
                          : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Icon
                          size={18}
                          className={isSelected ? "text-[#FC3B00]" : "text-stone-400"}
                        />
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-[#FF6129] animate-ping" />
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-white">{opt.title}</span>
                        <span className="mt-1 block text-[11px] text-stone-400 leading-snug">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Capacity Management */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-300">
                  <Users size={14} className="text-stone-400" />
                  <span>Max Approved Musicians</span>
                </label>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-xs font-bold text-[#FF7145] font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF6129]" />
                  <span>{capacity} musicians</span>
                </div>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={capacity}
                disabled={busy}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-3 w-full accent-[#FC3B00] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-stone-500 font-mono mt-1">
                <span>2 min</span>
                <span>8 default</span>
                <span>24 max</span>
              </div>
            </div>

            {/* Host Security Assurance */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-stone-300 flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#FF6129] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-white block mb-0.5">
                  Secure Host Token Protection
                </span>
                A 64-character cryptographic token will be created on this device. Only its SHA-256 hash is stored on Convex Cloud. Raw tokens never touch server logs or URLs.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy || !roomName.trim()}
                className="w-full min-h-[56px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-6 py-4 font-bold text-white shadow-lg shadow-[#FC3B00]/25 transition hover:from-[#E03500] hover:to-[#F2551D] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Launching FOH Console...</span>
                  </>
                ) : (
                  <>
                    <span>Create Room &amp; Open FOH Console</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
