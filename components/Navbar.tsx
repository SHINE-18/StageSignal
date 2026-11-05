"use client";

import Link from "next/link";
import { Radio, Users, Plus } from "lucide-react";

interface NavbarProps {
  currentRoom?: {
    code: string;
    name: string;
    sessionType?: string;
  };
}

export function Navbar({ currentRoom }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-md shadow-[#FC3B00]/10">
            <Radio size={16} strokeWidth={2} />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">
              StageSignal
            </span>
            <span className="hidden md:inline-block ml-3 text-xs text-stone-400 border-l border-white/15 pl-3">
              Silent stage cueing for worship &amp; FOH
            </span>
          </div>
        </Link>

        {/* Center Room Indicator (if in room) */}
        {currentRoom && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs text-stone-300">
            <span className="h-2 w-2 rounded-full bg-[#FC3B00] animate-pulse" />
            <span className="font-semibold text-white">{currentRoom.name}</span>
            <span className="font-mono text-[11px] text-[#FF7145] font-bold">
              {currentRoom.code}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/join"
            className="flex h-8 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
          >
            <Users size={14} className="text-[#FF7145]" />
            <span>Join Stage</span>
          </Link>
          <Link
            href="/create-room"
            className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-3.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition"
          >
            <Plus size={14} />
            <span>Create Room</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
