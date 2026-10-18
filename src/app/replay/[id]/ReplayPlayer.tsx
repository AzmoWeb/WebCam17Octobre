"use client";

import { useState } from "react";
import RecordedVideo from "@/components/RecordedVideo";
import { cn, formatDuration } from "@/lib/utils";

const CHUNK = 30 * 60;

/** Les longs replays sont découpés en parties de 30 min (le serveur renvoie un MP4 par partie). */
export default function ReplayPlayer({ id, duration }: { id: string; duration: number }) {
  const parts = Math.max(1, Math.ceil(duration / CHUNK));
  const [part, setPart] = useState(0);
  const src = parts > 1 ? `/api/replays/${id}/video?t=${part * CHUNK}&d=${CHUNK}` : `/api/replays/${id}/video`;

  return (
    <div className="stack">
      <RecordedVideo src={src} />
      {parts > 1 && (
        <div className="tabs" style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
          {Array.from({ length: parts }, (_, i) => (
            <button key={i} className={cn("tab", part === i && "active")} onClick={() => setPart(i)}>
              {formatDuration(i * CHUNK)} – {formatDuration(Math.min((i + 1) * CHUNK, duration))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
