import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStreamKey } from "@/lib/supabase/admin";
import { isPathLive, publishPath } from "@/lib/mediamtx";
import type { ClipItem, ReplayItem } from "@/components/MediaLists";
import CamRoom, { type CamInfo } from "./CamRoom";
import type { Comment } from "./Chat";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

// `profiles!owner_id` : streams est aussi lié à profiles via favorites et stream_bans,
// il faut préciser la relation sinon PostgREST renvoie une erreur d'ambiguïté.
const FULL =
  "id, title, description, category, city, created_at, owner_id, scheduled_at, owner:profiles!owner_id(username), favorites(count), event:events(id, title)";
const BASE = "id, title, created_at, owner_id, owner:profiles!owner_id(username)";

type Row = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  created_at: string;
  owner_id: string;
  scheduled_at?: string | null;
  owner: { username: string } | null;
  favorites?: { count: number }[];
  event?: { id: string; title: string } | null;
};

async function loadStream(id: string): Promise<Row | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const full = await supabase.from("streams").select(FULL).eq("id", id).maybeSingle();
  if (!full.error) return full.data as unknown as Row | null;
  // Migrations 002/003 pas encore appliquées : requête minimale.
  console.error("Chargement de la caméra (requête complète) :", full.error.message);
  const base = await supabase.from("streams").select(BASE).eq("id", id).maybeSingle();
  if (base.error) console.error("Chargement de la caméra impossible :", base.error.message);
  return base.data as unknown as Row | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const stream = await loadStream((await params).id);
  return stream ? { title: stream.title, description: stream.description || undefined } : { title: "Caméra introuvable" };
}

export default async function CamPage({ params }: Params) {
  const { id } = await params;
  const stream = await loadStream(id);
  if (!stream) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const key = await getStreamKey(id);
  const none = Promise.resolve({ data: null });
  const [comments, ban, fav, follow, followers, clips, replays, live] = await Promise.all([
    supabase.from("comments").select("*").eq("stream_id", id).order("created_at", { ascending: false }).limit(100),
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
    key ? isPathLive(publishPath(key)) : Promise.resolve(false),
  ]);

  const cam: CamInfo = {
    id: stream.id,
    title: stream.title,
    description: stream.description ?? "",
    category: stream.category ?? "autre",
    city: stream.city ?? "",
    created_at: stream.created_at,
    owner_id: stream.owner_id,
    owner: stream.owner?.username ?? "inconnu",
    favorites: stream.favorites?.[0]?.count ?? 0,
    scheduledAt: stream.scheduled_at ?? null,
    event: stream.event ?? null,
  };

  const clipItems: ClipItem[] = ((clips.data ?? []) as unknown as (Omit<ClipItem, "creator"> & { creator: { username: string } | null })[]).map(
    (c) => ({ ...c, creator: c.creator?.username ?? "inconnu" }),
  );

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
