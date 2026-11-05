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
    <div className="min-h-screen bg-[#141415] text-[#ededed] flex flex-col selection:bg-[#fc3b00] selection:text-white">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 flex flex-col justify-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[#a1a1a6] hover:text-[#ededed] transition w-fit"
        >
          <ArrowLeft size={14} /> Back to overview
        </Link>

        <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-6 sm:p-8">
          {/* Header */}
          <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#232325] px-2.5 py-1 text-xs text-[#a1a1a6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fc3b00]" />
            <span>FOH sound engineer setup</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#ededed]">
            Create stage room
          </h1>
          <p className="mt-1.5 text-xs text-[#a1a1a6] leading-relaxed">
            Launch a real-time communication room for worship musicians and FOH. Room codes are automatically generated with active collision prevention.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs font-medium text-red-200 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="mt-6 space-y-6">
            {/* Room Name */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#ededed]">
                  Room or service name
                </label>
                <span className="text-[11px] text-[#85858b] font-mono tabular-nums">
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
                className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] px-3.5 py-2.5 text-sm text-[#ededed] placeholder-[#85858b] outline-none transition focus:border-[#fc3b00] disabled:opacity-50"
              />
            </div>

            {/* Session Type */}
            <div>
              <label className="block text-xs font-medium text-[#ededed] mb-2">
                Session type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {sessionOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = sessionType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setSessionType(opt.id)}
                      className={`rounded-lg border p-3.5 text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "border-[#fc3b00] bg-[#232325] text-white"
                          : "border-white/[0.08] bg-[#141415] text-[#a1a1a6] hover:border-white/[0.15] hover:bg-[#232325]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <Icon
                          size={16}
                          className={isSelected ? "text-[#fc3b00]" : "text-[#85858b]"}
                        />
                        {isSelected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-[#fc3b00]" />
                        )}
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-[#ededed]">{opt.title}</span>
                        <span className="mt-0.5 block text-[11px] text-[#85858b] leading-snug">
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
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#ededed]">
                  <Users size={14} className="text-[#85858b]" />
                  <span>Max approved musicians</span>
                </label>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#232325] px-2 py-0.5 text-xs font-mono tabular-nums text-[#ededed]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#fc3b00]" />
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
                className="mt-3 w-full accent-[#fc3b00] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#85858b] font-mono tabular-nums mt-1">
                <span>2 min</span>
                <span>8 default</span>
                <span>24 max</span>
              </div>
            </div>

            {/* Host Security Assurance */}
            <div className="rounded-lg border border-white/[0.08] bg-[#141415] p-3 text-xs text-[#a1a1a6] flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-[#fc3b00] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-medium text-[#ededed] block mb-0.5">
                  Secure host token protection
                </span>
                A 64-character cryptographic token will be created on this device. Only its SHA-256 hash is stored on Convex Cloud. Raw tokens never touch server logs or URLs.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy || !roomName.trim()}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-lg bg-[#fc3b00] hover:bg-[#e03500] px-5 py-3 font-semibold text-sm text-white transition active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Launching FOH console...</span>
                  </>
                ) : (
                  <>
                    <span>Create room and open FOH console</span>
                    <ArrowRight size={16} />
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
