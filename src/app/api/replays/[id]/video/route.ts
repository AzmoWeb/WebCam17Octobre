import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { fetchRecording } from "@/lib/mediamtx";

// Vidéo MP4 d'une diffusion terminée (replay), extraite des enregistrements MediaMTX.
// ?t=<secondes>&d=<secondes> : une partie seulement (navigation dans les longs replays).
const MAX_CHUNK = 30 * 60;
const query = z.object({
  t: z.coerce.number().min(0).max(7 * 86400).catch(0),
  d: z.coerce.number().min(1).max(MAX_CHUNK).catch(MAX_CHUNK),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) return new Response("Not found", { status: 404 });

  const { data: b } = await admin.from("broadcasts").select("stream_id, started_at, ended_at").eq("id", id.data).maybeSingle();
  if (!b?.ended_at) return new Response("Not found", { status: 404 });

  const start = new Date(b.started_at as string);
  const total = (new Date(b.ended_at as string).getTime() - start.getTime()) / 1000;
  const { t, d } = query.parse(Object.fromEntries(new URL(request.url).searchParams));
  const offset = Math.min(t, total);
  const duration = Math.min(d, Math.max(1, total - offset));

  const upstream = await fetchRecording(b.stream_id as string, new Date(start.getTime() + offset * 1000), duration, request.signal);
  if (!upstream) return new Response("Vidéo indisponible.", { status: 404 });

  return new Response(upstream.body, {
    headers: { "content-type": "video/mp4", "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
