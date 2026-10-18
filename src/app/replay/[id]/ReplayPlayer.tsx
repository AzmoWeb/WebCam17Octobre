"use client";

import { useState } from "react";
import RecordedVideo from "@/components/RecordedVideo";
import Tabs from "@/components/ui/Tabs";
import { formatDuration } from "@/lib/utils";

const CHUNK = 30 * 60;

/** Les longs replays sont découpés en parties de 30 min (le serveur renvoie un MP4 par partie). */
export default function ReplayPlayer({ id, duration }: { id: string; duration: number }) {
  const parts = Math.max(1, Math.ceil(duration / CHUNK));
  const [part, setPart] = useState("0");
  const i = Number(part);
  const src = parts > 1 ? `/api/replays/${id}/video?t=${i * CHUNK}&d=${CHUNK}` : `/api/replays/${id}/video`;

  return (
    <div className="flex flex-col gap-3">
      <RecordedVideo src={src} />
      {parts > 1 && (
        <Tabs
          value={part}
          onChange={setPart}
          className="mx-3 self-start sm:mx-0"
          items={Array.from({ length: parts }, (_, n) => ({
            value: String(n),
            label: `${formatDuration(n * CHUNK)} – ${formatDuration(Math.min((n + 1) * CHUNK, duration))}`,
          }))}
        />
      )}
    </div>
  );
}
