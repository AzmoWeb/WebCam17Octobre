"use client";

import { useEffect, useState } from "react";

/** Compte à rebours jours / heures / minutes / secondes jusqu'à une date. */
export default function Countdown({ to, onDone }: { to: string; onDone?: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  useEffect(() => {
    if (left === 0) onDone?.();
  }, [left, onDone]);

  const parts = [
    { v: Math.floor(left / 86400), l: "jours" },
    { v: Math.floor((left % 86400) / 3600), l: "heures" },
    { v: Math.floor((left % 3600) / 60), l: "min" },
    { v: left % 60, l: "sec" },
  ];

  return (
    <div className="countdown" suppressHydrationWarning>
      {parts.map((p) => (
        <div key={p.l}>
          <strong>{String(p.v).padStart(2, "0")}</strong>
          <span>{p.l}</span>
        </div>
      ))}
    </div>
  );
}
