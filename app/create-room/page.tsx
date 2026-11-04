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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col selection:bg-[#DC143C] selection:text-white">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 flex flex-col justify-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition w-fit"
        >
          <ArrowLeft size={16} /> Back to Overview
        </Link>

        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA580C]">
            <Flame size={14} className="text-[#DC143C] animate-pulse" />
            <span>FOH Sound Engineer Setup</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Create Live Stage Room
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
            Launch a real-time communication room for worship musicians and FOH. Room codes are automatically generated with active collision prevention.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="mt-6 space-y-6">
            {/* Room Name */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Room / Service Name
                </label>
                <span className="text-[11px] text-stone-400 font-mono">
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
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:bg-white focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] disabled:opacity-50"
              />
            </div>

            {/* Session Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
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
                      className={`rounded-xl border p-3.5 text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "border-[#DC143C] bg-red-50/70 text-stone-900 shadow-sm ring-1 ring-[#DC143C]/40"
                          : "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Icon
                          size={18}
                          className={isSelected ? "text-[#DC143C]" : "text-stone-400"}
                        />
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-[#EA580C] animate-ping" />
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-semibold">{opt.title}</span>
                        <span className="mt-1 block text-[11px] text-stone-500 leading-snug">
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
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700">
                  <Users size={14} className="text-stone-400" />
                  <span>Max Approved Musicians</span>
                </label>
                <span className="rounded-md bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#EA580C] border border-orange-200 font-mono">
                  {capacity} musicians
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={capacity}
                disabled={busy}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-2.5 w-full accent-[#DC143C] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-stone-400 font-mono mt-1">
                <span>2 min</span>
                <span>8 default</span>
                <span>24 max</span>
              </div>
            </div>

            {/* Host Security Assurance */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 text-xs text-stone-700 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-[#EA580C] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-stone-900 block mb-0.5">
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
                className="w-full min-h-[56px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-6 py-4 font-bold text-white shadow-md shadow-[#DC143C]/20 transition hover:from-[#B80F32] hover:to-[#C2410C] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
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
