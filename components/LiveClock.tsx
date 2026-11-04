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
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-mono text-stone-400 shadow-sm">
        <Clock size={12} className="text-[#EA580C] animate-spin" />
        <span>--:--:--</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-mono text-stone-800 shadow-sm">
      <Clock size={12} className="text-[#EA580C]" />
      <span>{time}</span>
    </div>
  );
}
