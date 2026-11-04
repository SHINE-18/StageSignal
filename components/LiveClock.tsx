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
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#151d2d] px-2.5 py-1 text-xs font-mono text-slate-400">
        <Clock size={12} className="text-blue-400 animate-spin" />
        <span>--:--:--</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#151d2d] px-2.5 py-1 text-xs font-mono text-slate-200 shadow-sm">
      <Clock size={12} className="text-blue-400" />
      <span>{time}</span>
    </div>
  );
}
