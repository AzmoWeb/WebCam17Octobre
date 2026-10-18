"use client";

import { useEffect, useState } from "react";

/** Compte à rebours jours / heures / minutes / secondes jusqu'à une date. */
export default function Countdown({ to, onDone }: { to: string; onDone?: () => void }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = now === null ? null : Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  useEffect(() => {
    if (left === 0) onDone?.();
  }, [left, onDone]);

  const parts = [
    { v: left === null ? 0 : Math.floor(left / 86400), l: "jours" },
    { v: left === null ? 0 : Math.floor((left % 86400) / 3600), l: "heures" },
    { v: left === null ? 0 : Math.floor((left % 3600) / 60), l: "min" },
    { v: left === null ? 0 : left % 60, l: "sec" },
  ];

  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="min-w-14 rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-center">
          <div className="text-2xl font-extrabold text-white tabular-nums">{left === null ? "--" : String(p.v).padStart(2, "0")}</div>
          <div className="text-[10px] tracking-wider text-white/70 uppercase">{p.l}</div>
        </div>
      ))}
    </div>
  );
}
