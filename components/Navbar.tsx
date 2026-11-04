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
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0c0d0e]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#dc143c]/20 to-[#f97316]/20 text-[#f97316] border border-[#dc143c]/35 transition group-hover:border-[#f97316]/60 shadow-sm shadow-[#dc143c]/10">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-[#f8fafc]">
              Stage<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dc143c] to-[#f97316]">Signal</span>
            </span>
            <span className="hidden md:inline-block ml-3 text-xs text-stone-400 border-l border-white/10 pl-3">
              Hear the Stage. Respond from FOH.
            </span>
          </div>
        </Link>

        {/* Center Room Indicator (if in room) */}
        {currentRoom && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-orange-500/20 bg-[#1e1815] px-3.5 py-1 text-xs">
            <span className="font-semibold text-white">{currentRoom.name}</span>
            <span className="font-mono font-bold tracking-wider text-[#f97316]">
              {currentRoom.code}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/join"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#14100d] px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:bg-white/10 hover:text-white transition"
          >
            <Users size={14} />
            <span>Join</span>
          </Link>
          <Link
            href="/create-room"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#dc143c] to-[#ea580c] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#dc143c]/25 hover:from-[#b80f32] hover:to-[#c2410c] transition active:scale-95"
          >
            <Plus size={14} />
            <span>Create</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

