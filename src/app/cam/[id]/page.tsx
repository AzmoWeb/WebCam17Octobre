import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isStreamLive } from "@/lib/mediamtx";
import type { ClipItem, ReplayItem } from "@/components/MediaLists";
import CamRoom, { type CamInfo } from "./CamRoom";
import type { Comment } from "./Chat";

type Params = { params: Promise<{ id: string }> };

// `profiles!owner_id` : streams est aussi lié à profiles via favorites et stream_bans.
const SELECT =
  "id, title, description, category, city, created_at, owner_id, scheduled_at, disabled, owner:profiles!owner_id(username), favorites(count), event:events(id, title)";

type Row = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
  owner_id: string;
  scheduled_at: string | null;
  disabled: boolean;
  owner: { username: string } | null;
  favorites: { count: number }[];
  event: { id: string; title: string } | null;
};

async function loadStream(id: string): Promise<Row | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("streams").select(SELECT).eq("id", id).maybeSingle();
  if (error) console.error("Chargement de la caméra :", error.message);
  return data as unknown as Row | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const stream = await loadStream((await params).id);
  return stream && !stream.disabled
    ? { title: stream.title, description: stream.description || undefined }
    : { title: "Caméra introuvable" };
}

export default async function CamPage({ params }: Params) {
  const { id } = await params;
  const stream = await loadStream(id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Caméra bloquée par un admin : invisible sauf pour son propriétaire.
  if (!stream || (stream.disabled && user?.id !== stream.owner_id)) notFound();

  const none = Promise.resolve({ data: null });
  const [comments, ban, fav, follow, followers, clips, replays, live] = await Promise.all([
    supabase
      .from("comments")
      .select("id, stream_id, user_id, username, content, created_at")
      .eq("stream_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    user ? supabase.from("stream_bans").select("user_id").eq("stream_id", id).eq("user_id", user.id).maybeSingle() : none,
    user ? supabase.from("favorites").select("stream_id").eq("stream_id", id).eq("user_id", user.id).maybeSingle() : none,
    user
      ? supabase.from("follows").select("followed_id").eq("follower_id", user.id).eq("followed_id", stream.owner_id).maybeSingle()
      : none,
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", stream.owner_id),
    supabase
      .from("clips")
      .select("id, title, duration, created_at, creator:profiles!creator_id(username)")
      .eq("stream_id", id)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("broadcasts")
      .select("id, started_at, ended_at, peak_viewers")
      .eq("stream_id", id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(24),
    stream.disabled ? Promise.resolve(false) : isStreamLive(id),
  ]);

  const cam: CamInfo = {
    id: stream.id,
    title: stream.title,
    description: stream.description,
    category: stream.category,
    city: stream.city,
    created_at: stream.created_at,
    owner_id: stream.owner_id,
    owner: stream.owner?.username ?? "inconnu",
    favorites: stream.favorites?.[0]?.count ?? 0,
    scheduledAt: stream.scheduled_at,
    event: stream.event,
  };

  type ClipRow = Omit<ClipItem, "creator"> & { creator: { username: string } | null };
  const clipItems: ClipItem[] = ((clips.data ?? []) as unknown as ClipRow[]).map((c) => ({ ...c, creator: c.creator?.username ?? "inconnu" }));

  return (
    <CamRoom
      cam={cam}
      initiallyLive={live}
      comments={((comments.data ?? []) as Comment[]).reverse()}
      currentUserId={user?.id ?? null}
      isFavorite={!!fav.data}
      isBanned={!!ban.data}
      isFollowing={!!follow.data}
      followers={followers.count ?? 0}
      clips={clipItems}
      replays={(replays.data ?? []) as ReplayItem[]}
    />
  );
}
