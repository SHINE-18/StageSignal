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
      return <Mic size={18} strokeWidth={1.5} className="text-[#fc3b00]" />;
    case "Drums":
      return <Disc size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />;
    case "Keyboard":
      return <Sliders size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />;
    case "Bass Guitar":
      return <Music size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />;
    default:
      return <Music size={18} strokeWidth={1.5} className="text-[#a1a1a6]" />;
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
    setError("");
    setBusy(true);

    try {
      saveProfile({ name: trimmedName, instrument });
      const participantToken = getOrCreateRoomParticipantToken(room._id);

      const result = await requestJoinMutation({
        code: code.trim(),
        name: trimmedName,
        instrument,
        participantToken,
      });

      if (result.status === "approved") {
        router.push(`/room/${result.roomId}/musician`);
        return;
      }

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
    <div className="min-h-screen bg-[#000000] bg-arounda-glow text-white flex flex-col selection:bg-[#FC3B00] selection:text-white">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-8 sm:py-12 flex flex-col justify-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition w-fit"
        >
          <ArrowLeft size={14} /> Back to overview
        </Link>

        <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200">
            <span className="h-2 w-2 rounded-full bg-[#FC3B00] animate-pulse" />
            <span>Musician stage access</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Join Worship Stage
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400 leading-relaxed">
            Connect your phone to the FOH audio console to send real-time monitor mix cues.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#e5484d]/30 bg-[#2b1718] p-3 text-xs text-[#e5484d]">
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="mt-6 space-y-4">
            {/* Room Code Input */}
            <div>
              <label className="block text-xs font-medium text-[#a1a1a6]">
                Room code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CHORD-2097"
                maxLength={14}
                required
                disabled={busy}
                className="mt-1.5 w-full h-11 rounded-xl border border-white/15 bg-black/60 px-3.5 font-mono text-base font-semibold tracking-wider text-white placeholder-stone-500 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00] disabled:opacity-50"
              />

              {/* Room Live Verification Feedback */}
              {code.length >= 4 && (
                <div className="mt-2">
                  {roomData === undefined ? (
                    <span className="text-xs text-stone-400 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-[#FC3B00]" />
                      Checking code...
                    </span>
                  ) : room && roomState === "active" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
                      <UserCheck size={14} strokeWidth={2} className="text-emerald-400" />
                      <span>
                        Stage room verified: <strong className="text-white font-bold">{room.name}</strong>
                      </span>
                    </div>
                  ) : roomState === "ended" ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
                      This stage room has ended. Please ask FOH for the active code.
                    </div>
                  ) : roomState === "expired" ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
                      This room has expired after 12 hours. Please ask FOH to start a new session.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs text-red-300">
                      Room code not found. Please verify with FOH.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Persistence Bar */}
            {isRemembered && (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <Check size={13} strokeWidth={2} className="text-[#4cc38a]" />
                  <span>
                    Profile: <strong className="text-white font-bold">{name}</strong> ({instrument})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-xs text-[#fc3b00] hover:underline flex items-center gap-1"
                  >
                    <Edit2 size={11} strokeWidth={1.5} />
                    <span>{isEditingProfile ? "Done" : "Edit"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearProfile}
                    className="text-xs text-[#85858b] hover:text-[#e5484d] transition-colors"
                    title="Clear remembered profile"
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )}

            {/* Display Name Input */}
            {(!isRemembered || isEditingProfile) && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#a1a1a6]">
                    Your name
                  </label>
                  <span className="text-[11px] text-[#85858b] font-mono">{name.length}/40</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David, Sarah, Mike"
                  maxLength={40}
                  required
                  disabled={busy}
                  className="mt-1.5 w-full h-11 rounded-lg border border-white/[0.08] bg-[#0f0f10] px-3.5 text-sm text-[#ededed] placeholder-[#85858b]/60 outline-none transition-colors focus:border-[#fc3b00] disabled:opacity-50"
                />
              </div>
            )}

            {/* Instrument Selection Grid */}
            {(!isRemembered || isEditingProfile) && (
              <div>
                <label className="block text-xs font-medium text-[#a1a1a6] mb-1.5">
                  Your instrument or role
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {INSTRUMENTS.map((inst) => {
                    const isSelected = instrument === inst;
                    return (
                      <button
                        key={inst}
                        type="button"
                        disabled={busy}
                        onClick={() => setInstrument(inst)}
                        className={`flex min-h-[50px] items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-[#FC3B00] bg-[#FC3B00]/15 text-white ring-1 ring-[#FC3B00]"
                            : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <InstrumentIcon instrument={inst} />
                        <span className="text-xs font-semibold text-white leading-tight">
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
                className="flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-5 text-sm font-bold text-white shadow-lg shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Connecting to Stage...</span>
                  </>
                ) : (
                  <>
                    <span>Request to Join Stage</span>
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

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={16} className="animate-spin text-[#FC3B00]" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
