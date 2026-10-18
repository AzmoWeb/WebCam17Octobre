import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getStreamSummaries } from "@/lib/streams";
import EventsClient, { type EventSummary } from "./EventsClient";

export const metadata: Metadata = { title: "Événements" };

type Row = { id: string; title: string; city: string; starts_at: string; owner: { username: string } | null };

export default async function EventsPage() {
  const supabase = await createClient();
  const [{ data, error }, streams, { data: auth }] = await Promise.all([
    supabase.from("events").select("id, title, city, starts_at, owner:profiles!owner_id(username)").order("starts_at", { ascending: false }).limit(200),
    getStreamSummaries(),
    supabase.auth.getUser(),
  ]);
  if (error) console.error("Chargement des événements :", error.message);

  const events: EventSummary[] = ((data ?? []) as unknown as Row[]).map((e) => {
    const cams = streams.filter((s) => s.eventId === e.id);
    return {
      id: e.id,
      title: e.title,
      city: e.city,
      starts_at: e.starts_at,
      owner: e.owner?.username ?? "inconnu",
      cameras: cams.length,
      live: cams.filter((s) => s.live).length,
    };
  });

  return <EventsClient events={events} loggedIn={!!auth.user} />;
}
