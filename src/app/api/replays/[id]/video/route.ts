import { admin, getAllStreamKeys } from "@/lib/supabase/admin";
import { fetchRecording } from "@/lib/mediamtx";

// Vidéo MP4 d'une diffusion terminée (replay), extraite des enregistrements MediaMTX.
// ?t=<secondes>&d=<secondes> permet de ne récupérer qu'une partie (navigation dans les longs replays).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CHUNK = 30 * 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const { data: b } = await admin.from("broadcasts").select("stream_id, started_at, ended_at").eq("id", id).maybeSingle();
  if (!b?.ended_at) return new Response("Not found", { status: 404 });

  const start = new Date(b.started_at as string);
  const total = (new Date(b.ended_at as string).getTime() - start.getTime()) / 1000;
  const search = new URL(request.url).searchParams;
  const offset = Math.min(Math.max(0, Number(search.get("t")) || 0), total);
  const duration = Math.min(Number(search.get("d")) || MAX_CHUNK, MAX_CHUNK, total - offset);

  const keys = await getAllStreamKeys(b.stream_id as string);
  const upstream = await fetchRecording(keys, new Date(start.getTime() + offset * 1000), duration, request.signal);
  if (!upstream) return new Response("Enregistrement indisponible (expiré ou non enregistré).", { status: 404 });

  return new Response(upstream.body, { headers: { "content-type": "video/mp4", "cache-control": "public, max-age=3600" } });
}
