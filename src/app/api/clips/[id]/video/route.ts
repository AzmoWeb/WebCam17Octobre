import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { fetchRecording } from "@/lib/mediamtx";

// Vidéo MP4 d'un clip, extraite des enregistrements MediaMTX.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) return new Response("Not found", { status: 404 });

  const { data: clip } = await admin.from("clips").select("stream_id, title, start_at, duration").eq("id", id.data).maybeSingle();
  if (!clip) return new Response("Not found", { status: 404 });

  const upstream = await fetchRecording(clip.stream_id as string, new Date(clip.start_at as string), clip.duration as number, request.signal);
  if (!upstream) return new Response("Vidéo indisponible.", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const filename = `${String(clip.title).replace(/[^\w-]+/g, "_").slice(0, 60) || "clip"}.mp4`;
  return new Response(upstream.body, {
    headers: {
      "content-type": "video/mp4",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
      ...(download ? { "content-disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}
