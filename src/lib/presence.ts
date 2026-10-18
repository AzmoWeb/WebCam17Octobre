"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Compte des spectateurs via Supabase Realtime Presence : chaque page caméra
// ouverte « s'annonce » sur un canal global avec l'id de la caméra regardée.
const CHANNEL = "presence:viewers";

type Meta = { stream_id?: string };

function countByStream(state: Record<string, Meta[]>) {
  const counts: Record<string, number> = {};
  for (const metas of Object.values(state)) {
    const id = metas[0]?.stream_id;
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Nombre de spectateurs par caméra (lecture seule). */
export function useViewerCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL);
    channel.on("presence", { event: "sync" }, () => setCounts(countByStream(channel.presenceState<Meta>()))).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return counts;
}

/** Annonce ce visiteur comme spectateur d'une caméra et renvoie le nombre de spectateurs. */
export function useTrackViewer(streamId: string) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: crypto.randomUUID() } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Math.max(1, countByStream(channel.presenceState<Meta>())[streamId] ?? 0));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ stream_id: streamId });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return count;
}
