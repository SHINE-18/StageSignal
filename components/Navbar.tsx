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
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0f0f10]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#19191b] border border-white/[0.08] text-[#fc3b00]">
            <Radio size={16} strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-[#ededed]">
              StageSignal
            </span>
            <span className="hidden md:inline-block ml-3 text-xs text-[#85858b] border-l border-white/[0.08] pl-3">
              Stage cueing for front of house
            </span>
          </div>
        </Link>

        {/* Center Room Indicator (if in room) */}
        {currentRoom && (
          <div className="hidden sm:flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#19191b] px-3 py-1 text-xs text-[#a1a1a6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fc3b00]" />
            <span className="font-medium text-[#ededed]">{currentRoom.name}</span>
            <span className="font-mono text-[11px] text-[#a1a1a6]">
              {currentRoom.code}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/join"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#19191b] px-3 text-xs font-medium text-[#ededed] hover:bg-[#232325] transition-colors"
          >
            <Users size={14} strokeWidth={1.5} className="text-[#a1a1a6]" />
            <span>Join stage</span>
          </Link>
          <Link
            href="/create-room"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#fc3b00] px-3 text-xs font-medium text-white hover:bg-[#e03500] transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>Create room</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
