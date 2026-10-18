"use client";

import { Video } from "lucide-react";
import StreamCard from "@/components/StreamCard";
import { EmptyState } from "@/components/ui";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";

export default function ProfileStreams({ streams, loggedIn }: { streams: StreamSummary[]; loggedIn: boolean }) {
  const viewers = useViewerCounts();
  if (streams.length === 0) {
    return (
      <EmptyState icon={<Video className="size-6" />} title="Aucune caméra">
        Cet utilisateur ne diffuse pas encore.
      </EmptyState>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...streams]
        .sort((a, b) => Number(b.live) - Number(a.live))
        .map((s) => (
          <StreamCard key={s.id} stream={s} viewers={viewers[s.id] ?? 0} loggedIn={loggedIn} />
        ))}
    </div>
  );
}
