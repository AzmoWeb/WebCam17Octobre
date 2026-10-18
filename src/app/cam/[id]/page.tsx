import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStreamKey } from "@/lib/supabase/admin";
import { isPathLive, publishPath } from "@/lib/mediamtx";
import CamRoom, { type CamInfo } from "./CamRoom";
import type { Comment } from "./Chat";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

async function loadStream(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  // `profiles!owner_id` : streams est aussi lié à profiles via favorites et stream_bans,
  // il faut préciser la relation sinon PostgREST renvoie une erreur d'ambiguïté.
  const { data, error } = await supabase
    .from("streams")
    .select("id, title, description, category, city, created_at, owner_id, owner:profiles!owner_id(username), favorites(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("Chargement de la caméra impossible :", error.message);
  return data;
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
  const [{ data: comments }, { data: ban }, { data: fav }, live] = await Promise.all([
    supabase.from("comments").select("*").eq("stream_id", id).order("created_at", { ascending: false }).limit(100),
    user
      ? supabase.from("stream_bans").select("user_id").eq("stream_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("favorites").select("stream_id").eq("stream_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    key ? isPathLive(publishPath(key)) : Promise.resolve(false),
  ]);

  const owner = stream.owner as unknown as { username: string } | null;
  const favorites = stream.favorites as unknown as { count: number }[] | null;
  const cam: CamInfo = {
    id: stream.id,
    title: stream.title,
    description: stream.description ?? "",
    category: stream.category ?? "autre",
    city: stream.city ?? "",
    created_at: stream.created_at,
    owner_id: stream.owner_id,
    owner: owner?.username ?? "inconnu",
    favorites: favorites?.[0]?.count ?? 0,
  };

  return (
    <CamRoom
      cam={cam}
      initiallyLive={live}
      comments={((comments ?? []) as Comment[]).reverse()}
      currentUserId={user?.id ?? null}
      isFavorite={!!fav}
      isBanned={!!ban}
    />
  );
}
