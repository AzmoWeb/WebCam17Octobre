import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getStreamSummaries } from "@/lib/streams";
import EventView, { type EventDetail } from "./EventView";
import type { EventComment } from "./EventChat";

type Params = { params: Promise<{ id: string }> };

async function loadEvent(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, description, city, starts_at, owner_id, owner:profiles!owner_id(username)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = await loadEvent((await params).id);
  return { title: event?.title ?? "Événement introuvable" };
}

export default async function EventPage({ params }: Params) {
  const { id } = await params;
  const row = await loadEvent(id);
  if (!row) notFound();

  const supabase = await createClient();
  const [streams, { data: comments }, user] = await Promise.all([
    getStreamSummaries({ eventId: id }),
    supabase
      .from("event_comments")
      .select("id, event_id, user_id, username, content, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    getCurrentUser(),
  ]);

  const event: EventDetail = {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    city: row.city ?? "",
    starts_at: row.starts_at,
    owner_id: row.owner_id,
    owner: (row.owner as unknown as { username: string } | null)?.username ?? "inconnu",
  };

  return (
    <EventView
      event={event}
      streams={streams}
      comments={((comments ?? []) as EventComment[]).reverse()}
      currentUserId={user?.id ?? null}
      isAdmin={!!user?.isAdmin}
    />
  );
}
