import { admin, getAllStreamKeys } from "@/lib/supabase/admin";
import { fetchRecording } from "@/lib/mediamtx";

// Vidéo MP4 d'un clip, extraite des enregistrements MediaMTX.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const { data: clip } = await admin.from("clips").select("stream_id, title, start_at, duration").eq("id", id).maybeSingle();
  if (!clip) return new Response("Not found", { status: 404 });

  const keys = await getAllStreamKeys(clip.stream_id as string);
  const upstream = await fetchRecording(keys, new Date(clip.start_at as string), clip.duration as number, request.signal);
  if (!upstream) return new Response("Enregistrement indisponible (expiré ou non enregistré).", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const filename = `${String(clip.title).replace(/[^\w-]+/g, "_").slice(0, 60) || "clip"}.mp4`;
  return new Response(upstream.body, {
    headers: {
      "content-type": "video/mp4",
      "cache-control": "public, max-age=3600",
      ...(download ? { "content-disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}
