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
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#dc143c]/15 to-[#ea580c]/15 text-[#dc143c] border border-[#dc143c]/25 transition group-hover:border-[#ea580c]/50 shadow-sm">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-stone-900">
              Stage<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dc143c] to-[#ea580c]">Signal</span>
            </span>
            <span className="hidden md:inline-block ml-3 text-xs text-stone-500 border-l border-stone-300 pl-3">
              Hear the Stage. Respond from FOH.
            </span>
          </div>
        </Link>

        {/* Center Room Indicator (if in room) */}
        {currentRoom && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-3.5 py-1 text-xs">
            <span className="font-semibold text-stone-800">{currentRoom.name}</span>
            <span className="font-mono font-bold tracking-wider text-[#ea580c]">
              {currentRoom.code}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/join"
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-sm transition"
          >
            <Users size={14} />
            <span>Join</span>
          </Link>
          <Link
            href="/create-room"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#dc143c] to-[#ea580c] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#dc143c]/20 hover:from-[#b80f32] hover:to-[#c2410c] transition active:scale-95"
          >
            <Plus size={14} />
            <span>Create</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

