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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/40 transition group-hover:border-[#FF6129] shadow-lg shadow-[#FC3B00]/15">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Stage<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FC3B00] via-[#FF6129] to-[#FF7145]">Signal</span>
            </span>
            <span className="hidden md:inline-block ml-3 text-xs text-stone-400 border-l border-white/15 pl-3">
              Hear the Stage. Respond from FOH.
            </span>
          </div>
        </Link>

        {/* Center Room Indicator (if in room) */}
        {currentRoom && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-4 py-1.5 text-xs text-white shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FF6129] animate-pulse" />
            <span className="font-semibold text-stone-200">{currentRoom.name}</span>
            <span className="font-mono font-bold tracking-wider text-[#FF6129]">
              {currentRoom.code}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/join"
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-stone-200 hover:bg-white/[0.12] hover:text-white transition shadow-sm"
          >
            <Users size={14} />
            <span>Join</span>
          </Link>
          <Link
            href="/create-room"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition active:scale-95"
          >
            <Plus size={14} />
            <span>Create</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
