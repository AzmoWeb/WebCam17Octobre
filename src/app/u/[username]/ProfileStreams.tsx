"use client";

import { Video } from "lucide-react";
import StreamCard from "@/components/StreamCard";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";

export default function ProfileStreams({ streams, loggedIn }: { streams: StreamSummary[]; loggedIn: boolean }) {
  const viewers = useViewerCounts();

  if (streams.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <Video size={28} />
        </div>
        <h3>Aucune caméra</h3>
        <p>Cet utilisateur ne diffuse pas encore.</p>
      </div>
    );
  }

  const sorted = [...streams].sort((a, b) => Number(b.live) - Number(a.live));
  return (
    <div className="stream-grid">
      {sorted.map((s) => (
        <StreamCard key={s.id} stream={s} viewers={viewers[s.id] ?? 0} loggedIn={loggedIn} />
      ))}
    </div>
  );
}
