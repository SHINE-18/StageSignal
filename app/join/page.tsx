"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  Music,
  Disc,
  Sliders,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Trash2,
  AlertCircle,
  Flame,
  Loader2,
  Edit2,
  Check,
} from "lucide-react";
import {
  getSavedProfile,
  saveProfile,
  clearProfile,
  getOrCreateRoomParticipantToken,
} from "../../lib/profile";
import { INSTRUMENTS, type InstrumentType } from "../../lib/session";
import { Navbar } from "../../components/Navbar";

function InstrumentIcon({ instrument }: { instrument: string }) {
  switch (instrument) {
    case "Lead Vocal":
    case "Backing Vocal":
      return <Mic size={20} className="text-[#FC3B00]" />;
    case "Drums":
      return <Disc size={20} className="text-[#FF6129]" />;
    case "Keyboard":
      return <Sliders size={20} className="text-[#FF7145]" />;
    case "Bass Guitar":
      return <Music size={20} className="text-[#FC3B00]" />;
    default:
      return <Music size={20} className="text-[#FF6129]" />;
  }
}

function JoinForm() {
  const params = useSearchParams();
  const router = useRouter();

  const codeParam = (params.get("code") || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const [code, setCode] = useState(codeParam);
  const [name, setName] = useState("");
  const [instrument, setInstrument] = useState<InstrumentType>("Lead Vocal");
  const [isRemembered, setIsRemembered] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Live query room by code
  const roomData = useQuery(
    api.rooms.getRoomByCode,
    code && code.length >= 4 ? { code } : "skip"
  );
  const room = roomData?.room;
  const roomState = roomData?.state;

  const requestJoinMutation = useMutation(api.participants.requestJoin);

  // Load remembered profile on mount
  useEffect(() => {
    const saved = getSavedProfile();
    if (saved) {
      if (saved.name) setName(saved.name);
      if (saved.instrument) setInstrument(saved.instrument);
      setIsRemembered(true);
    }
  }, []);

  function handleClearProfile() {
    clearProfile();
    setName("");
    setInstrument("Lead Vocal");
    setIsRemembered(false);
    setIsEditingProfile(false);
  }

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!room) {
      setError("Please verify that your room code is active before joining.");
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your display name.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      // 1. Get or create an isolated participant token strictly for this room
      const participantToken = getOrCreateRoomParticipantToken(room._id);

      // 2. Call backend requestJoin mutation
      const result = await requestJoinMutation({
        code: room.code,
        name: trimmedName,
        instrument,
        participantToken,
      });

      // 3. Save profile preferences for future sessions
      saveProfile({ name: trimmedName, instrument });

      // 4. Navigate to live reactive waiting room
      router.push(`/room/${result.roomId}/waiting?participantId=${result.participantId}`);
    } catch (err) {
      console.error("Join request failed:", err);
      const msg = err instanceof Error ? err.message : "Unable to request join access.";
      setError(msg.replace(/^Error:\s*/, ""));
      setBusy(false);
    }
  }

  const isRoomValid = !!room && roomState === "active";

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col selection:bg-[#FC3B00] selection:text-white bg-arounda-glow">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-8 sm:py-12 flex flex-col justify-center">
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
            <span>Musician Stage Access</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Join Worship Stage
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-400 leading-relaxed">
            Connect your phone to the FOH audio console to send real-time monitor mix requests.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs sm:text-sm font-medium text-red-200">
              <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="mt-6 space-y-5">
            {/* Room Code Input & Live Verification */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                Room Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. GRACE-4821"
                maxLength={14}
                required
                disabled={busy}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 font-mono text-lg font-extrabold tracking-widest text-[#FF7145] placeholder-stone-600 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00] disabled:opacity-50"
              />

              {/* Room Live Verification Feedback */}
              {code.length >= 4 && (
                <div className="mt-2.5">
                  {roomData === undefined ? (
                    <span className="text-xs text-stone-400 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-[#FF6129]" />
                      Checking room code...
                    </span>
                  ) : room && roomState === "active" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-300">
                      <UserCheck size={16} className="text-emerald-400 shrink-0" />
                      <span>
                        Stage room verified: <strong className="text-white">{room.name}</strong>
                      </span>
                    </div>
                  ) : roomState === "ended" ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300">
                      This stage room has ended. Please ask FOH for the active code.
                    </div>
                  ) : roomState === "expired" ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300">
                      This room has expired after 12 hours. Please ask FOH to start a new session.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-300">
                      Room code not found. Please verify with FOH.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Persistence Bar */}
            {isRemembered && (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400" />
                  <span>
                    Remembered profile: <strong className="text-white">{name}</strong> ({instrument})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-xs font-semibold text-[#FF7145] hover:text-white transition flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    <span>{isEditingProfile ? "Done" : "Edit"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearProfile}
                    className="text-xs font-semibold text-stone-400 hover:text-red-400 transition flex items-center gap-1"
                    title="Clear remembered profile"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Display Name Input */}
            {(!isRemembered || isEditingProfile) && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    Your Name
                  </label>
                  <span className="text-[11px] text-stone-500 font-mono">{name.length}/40</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David, Sarah, Mike"
                  maxLength={40}
                  required
                  disabled={busy}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-stone-600 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00] disabled:opacity-50"
                />
              </div>
            )}

            {/* Instrument Selection Grid (Touch Targets >= 56px) */}
            {(!isRemembered || isEditingProfile) && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                  Your Instrument / Role
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {INSTRUMENTS.map((inst) => {
                    const isSelected = instrument === inst;
                    return (
                      <button
                        key={inst}
                        type="button"
                        disabled={busy}
                        onClick={() => setInstrument(inst)}
                        className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                          isSelected
                            ? "border-[#FC3B00] bg-[#FC3B00]/15 text-white font-bold shadow-lg shadow-[#FC3B00]/10 ring-1 ring-[#FC3B00]"
                            : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <InstrumentIcon instrument={inst} />
                        <span className="text-xs sm:text-sm font-semibold leading-tight text-white">
                          {inst}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy || !isRoomValid || !name.trim()}
                className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-6 py-4 font-bold text-white shadow-lg shadow-[#FC3B00]/25 transition hover:from-[#E03500] hover:to-[#F2551D] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Connecting to Stage...</span>
                  </>
                ) : (
                  <>
                    <span>Request to Join Stage</span>
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

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#000000] text-white">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={18} className="animate-spin text-[#FC3B00]" />
            <span>Loading StageSignal...</span>
          </div>
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
