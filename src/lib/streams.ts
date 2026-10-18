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
  owner: string;
  live: boolean;
  favorites: number;
  isFavorite: boolean;
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
};

/** Liste des caméras avec statut en direct, nombre de favoris et favori de l'utilisateur courant. */
export async function getStreamSummaries(options: { ownerId?: string } = {}): Promise<StreamSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("streams")
    .select("id, title, description, category, city, created_at, owner_id, owner:profiles!owner_id(username), favorites(count)")
    .order("created_at", { ascending: false });
  if (options.ownerId) query = query.eq("owner_id", options.ownerId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data, error }, { data: keys }, livePaths, { data: myFavs }] = await Promise.all([
    query,
    admin.from("stream_keys").select("stream_id, key"),
    getLivePaths(),
    user ? supabase.from("favorites").select("stream_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
  ]);
  if (error) console.error("Chargement des caméras impossible :", error.message);

  const liveIds = new Set(
    (keys ?? []).filter((k) => livePaths.has(publishPath(k.key as string))).map((k) => k.stream_id as string),
  );
  const favIds = new Set((myFavs ?? []).map((f) => f.stream_id as string));

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    category: r.category ?? "autre",
    city: r.city ?? "",
    created_at: r.created_at,
    owner: r.owner?.username ?? "inconnu",
    live: liveIds.has(r.id),
    favorites: r.favorites?.[0]?.count ?? 0,
    isFavorite: favIds.has(r.id),
  }));
}
