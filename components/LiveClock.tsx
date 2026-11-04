"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-stone-400 shadow-sm">
        <Clock size={12} className="text-[#FF6129] animate-spin" />
        <span>--:--:--</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-mono text-white shadow-sm">
      <Clock size={12} className="text-[#FF6129]" />
      <span>{time}</span>
    </div>
  );
}
