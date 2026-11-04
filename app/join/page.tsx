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
      return <Mic size={20} className="text-[#DC143C]" />;
    case "Drums":
      return <Disc size={20} className="text-[#EA580C]" />;
    case "Keyboard":
      return <Sliders size={20} className="text-[#D97706]" />;
    case "Bass Guitar":
      return <Music size={20} className="text-[#DC143C]" />;
    default:
      return <Music size={20} className="text-emerald-600" />;
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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col selection:bg-[#DC143C] selection:text-white">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-8 sm:py-12 flex flex-col justify-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition w-fit"
        >
          <ArrowLeft size={16} /> Back to Overview
        </Link>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA580C]">
            <Flame size={14} className="text-[#DC143C] animate-pulse" />
            <span>Musician Stage Access</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Join Worship Stage
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Connect your phone to the FOH audio console to send real-time monitor mix requests.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm font-medium text-red-700">
              <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="mt-6 space-y-5">
            {/* Room Code Input & Live Verification */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
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
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 font-mono text-lg font-extrabold tracking-widest text-[#EA580C] placeholder-stone-600 outline-none transition focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] disabled:opacity-50"
              />

              {/* Room Live Verification Feedback */}
              {code.length >= 4 && (
                <div className="mt-2">
                  {roomData === undefined ? (
                    <span className="text-xs text-stone-500 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-[#EA580C]" />
                      Checking room code...
                    </span>
                  ) : room && roomState === "active" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      <UserCheck size={16} className="text-emerald-400 shrink-0" />
                      <span>
                        Stage room verified: <strong className="text-stone-900">{room.name}</strong>
                      </span>
                    </div>
                  ) : roomState === "ended" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      This stage room has ended. Please ask FOH for the active code.
                    </div>
                  ) : roomState === "expired" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      This room has expired after 12 hours. Please ask FOH to start a new session.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      Room code not found. Please verify with FOH.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Persistence Bar */}
            {isRemembered && (
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400" />
                  <span>
                    Remembered profile: <strong className="text-stone-900">{name}</strong> ({instrument})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-xs font-semibold text-[#EA580C] hover:text-[#EA580C] transition flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    <span>{isEditingProfile ? "Done" : "Edit"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearProfile}
                    className="text-xs font-semibold text-stone-500 hover:text-red-400 transition flex items-center gap-1"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
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
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-500 outline-none transition focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] disabled:opacity-50"
                />
              </div>
            )}

            {/* Instrument Selection Grid (Touch Targets >= 56px) */}
            {(!isRemembered || isEditingProfile) && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
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
                            ? "border-[#DC143C] bg-[#DC143C]/15 text-stone-900 font-bold shadow-sm ring-1 ring-[#DC143C]/50"
                            : "border-stone-200 bg-stone-50/60 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <InstrumentIcon instrument={inst} />
                        <span className="text-xs sm:text-sm font-semibold leading-tight">
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
                className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-6 py-4 font-bold text-white shadow-md shadow-[#DC143C]/20 transition hover:from-[#B80F32] hover:to-[#C2410C] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="grid min-h-screen place-items-center bg-[#FAF8F5] text-stone-900">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 size={18} className="animate-spin text-[#EA580C]" />
            <span>Loading StageSignal...</span>
          </div>
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
