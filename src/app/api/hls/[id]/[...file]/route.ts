import { getStreamKey } from "@/lib/supabase/admin";
import { HLS_URL, publishPath, QUALITIES } from "@/lib/mediamtx";

// Proxy HLS : /api/hls/<id caméra>/index.m3u8 -> MediaMTX live/<clé>/index.m3u8.
// Qualité réduite : /api/hls/<id>/q720/index.m3u8 -> live/<clé>_720/index.m3u8.
// Les spectateurs ne voient que l'id public de la caméra, jamais la clé.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/;
const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ id: string; file: string[] }> }) {
  const { id, file } = await params;
  if (!UUID.test(id) || file.some((s) => !SAFE_SEGMENT.test(s) || s.startsWith("."))) return notFound();

  const key = await getStreamKey(id);
  if (!key) return notFound();

  let path = publishPath(key);
  let rest = file;
  const quality = /^q(\d+)$/.exec(file[0] ?? "")?.[1];
  if (quality) {
    if (!(QUALITIES as readonly string[]).includes(quality)) return notFound();
    path = `${path}_${quality}`;
    rest = file.slice(1);
  }
  if (rest.length === 0) return notFound();

  // La query string est conservée : LL-HLS l'utilise (_HLS_msn, _HLS_part).
  const { search } = new URL(request.url);
  let upstream: Response;
  try {
    upstream = await fetch(`${HLS_URL}/${path}/${rest.join("/")}${search}`, {
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return new Response("Flux indisponible", { status: 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "no-cache");

  return new Response(upstream.body, { status: upstream.status, headers });
}
