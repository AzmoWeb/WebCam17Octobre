import "server-only";
import { createClient } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getLivePaths, publishPath } from "@/lib/mediamtx";

export type StreamSummary = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
  ownerId: string;
  owner: string;
  live: boolean;
  favorites: number;
  isFavorite: boolean;
  lat: number | null;
  lng: number | null;
  scheduledAt: string | null;
  eventId: string | null;
};

type Row = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  created_at: string;
  owner_id: string;
  owner: { username: string } | null;
  favorites?: { count: number }[];
  lat?: number | null;
  lng?: number | null;
  scheduled_at?: string | null;
  event_id?: string | null;
};

// `profiles!owner_id` : streams est aussi lié à profiles via favorites et stream_bans,
// il faut préciser la relation sinon PostgREST renvoie une erreur d'ambiguïté.
const FULL_SELECT =
  "id, title, description, category, city, created_at, owner_id, lat, lng, scheduled_at, event_id, owner:profiles!owner_id(username), favorites(count)";
// Repli si les migrations 002/003 ne sont pas encore appliquées.
const BASE_SELECT = "id, title, created_at, owner_id, owner:profiles!owner_id(username)";

type Filter = { ownerId?: string; ownerIds?: string[]; eventId?: string; ids?: string[] };

async function queryStreams(filter: Filter): Promise<Row[]> {
  const supabase = await createClient();
  const build = (select: string) => {
    let q = supabase.from("streams").select(select).order("created_at", { ascending: false });
    if (filter.ownerId) q = q.eq("owner_id", filter.ownerId);
    if (filter.ownerIds) q = q.in("owner_id", filter.ownerIds);
    if (filter.eventId) q = q.eq("event_id", filter.eventId);
    if (filter.ids) q = q.in("id", filter.ids);
    return q;
  };
  const full = await build(FULL_SELECT);
  if (!full.error) return (full.data ?? []) as unknown as Row[];
  console.error("Chargement des caméras (requête complète) :", full.error.message);
  const base = await build(BASE_SELECT);
  if (base.error) console.error("Chargement des caméras impossible :", base.error.message);
  return (base.data ?? []) as unknown as Row[];
}

/** Liste des caméras avec statut en direct, nombre de favoris et favori de l'utilisateur courant. */
export async function getStreamSummaries(filter: Filter = {}): Promise<StreamSummary[]> {
  if (filter.ownerIds?.length === 0 || filter.ids?.length === 0) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rows, { data: keys }, livePaths, { data: myFavs }] = await Promise.all([
    queryStreams(filter),
    admin.from("stream_keys").select("stream_id, key"),
    getLivePaths(),
    user ? supabase.from("favorites").select("stream_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
  ]);

  const liveIds = new Set(
    (keys ?? []).filter((k) => livePaths.has(publishPath(k.key as string))).map((k) => k.stream_id as string),
  );
  const favIds = new Set((myFavs ?? []).map((f) => f.stream_id as string));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    category: r.category ?? "autre",
    city: r.city ?? "",
    created_at: r.created_at,
    ownerId: r.owner_id,
    owner: r.owner?.username ?? "inconnu",
    live: liveIds.has(r.id),
    favorites: r.favorites?.[0]?.count ?? 0,
    isFavorite: favIds.has(r.id),
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    scheduledAt: r.scheduled_at ?? null,
    eventId: r.event_id ?? null,
  }));
}
