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
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#090d18]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-400/25 transition group-hover:border-blue-400/50">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-[#f8fafc]">
              Stage<span className="text-blue-400">Signal</span>
            </span>
            <span className="hidden md:inline-block ml-3 text-xs text-slate-400 border-l border-white/10 pl-3">
              Hear the Stage. Respond from FOH.
            </span>
          </div>
        </Link>

        {/* Center Room Indicator (if in room) */}
        {currentRoom && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-[#151d2d] px-3 py-1 text-xs">
            <span className="font-semibold text-white">{currentRoom.name}</span>
            <span className="font-mono font-bold tracking-wider text-blue-400">
              {currentRoom.code}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/join"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <Users size={14} />
            <span>Join</span>
          </Link>
          <Link
            href="/create-room"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition active:scale-95"
          >
            <Plus size={14} />
            <span>Create</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

