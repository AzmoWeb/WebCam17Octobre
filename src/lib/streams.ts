import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getLiveStreamIds } from "@/lib/mediamtx";

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
  description: string;
  category: string;
  city: string;
  created_at: string;
  owner_id: string;
  owner: { username: string } | null;
  favorites: { count: number }[];
  lat: number | null;
  lng: number | null;
  scheduled_at: string | null;
  event_id: string | null;
};

// `profiles!owner_id` : streams est aussi lié à profiles via favorites et stream_bans,
// il faut préciser la relation sinon PostgREST renvoie une erreur d'ambiguïté.
const SELECT =
  "id, title, description, category, city, created_at, owner_id, lat, lng, scheduled_at, event_id, owner:profiles!owner_id(username), favorites(count)";

type Filter = { ownerId?: string; eventId?: string };

/** Caméras publiques (non bloquées) avec statut en direct, favoris et favori de l'utilisateur courant. */
export async function getStreamSummaries(filter: Filter = {}): Promise<StreamSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("streams").select(SELECT).eq("disabled", false).order("created_at", { ascending: false }).limit(500);
  if (filter.ownerId) query = query.eq("owner_id", filter.ownerId);
  if (filter.eventId) query = query.eq("event_id", filter.eventId);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data, error }, liveIds, { data: myFavs }] = await Promise.all([
    query,
    getLiveStreamIds(),
    user ? supabase.from("favorites").select("stream_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
  ]);
  if (error) console.error("Chargement des caméras impossible :", error.message);
  const favIds = new Set((myFavs ?? []).map((f) => f.stream_id as string));

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    city: r.city,
    created_at: r.created_at,
    ownerId: r.owner_id,
    owner: r.owner?.username ?? "inconnu",
    live: liveIds.has(r.id),
    favorites: r.favorites?.[0]?.count ?? 0,
    isFavorite: favIds.has(r.id),
    lat: r.lat,
    lng: r.lng,
    scheduledAt: r.scheduled_at,
    eventId: r.event_id,
  }));
}
