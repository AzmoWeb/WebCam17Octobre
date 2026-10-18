import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { HLS_URL, QUALITIES, streamPath } from "@/lib/mediamtx";

// Proxy HLS : /api/hls/<id caméra>/index.m3u8 -> MediaMTX live/<id>/index.m3u8 (127.0.0.1).
// Qualité réduite : /api/hls/<id>/q720/index.m3u8 -> live/<id>_720/index.m3u8.
// MediaMTX n'est jamais exposé ; la clé de la caméra n'intervient pas dans la lecture.

const params = z.object({
  id: z.string().uuid(),
  file: z.array(z.string().regex(/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,100}$/)).min(1).max(3),
});
const notFound = () => new Response("Not found", { status: 404 });

// Caméras existantes et non coupées (cache 30 s : appelé à chaque segment).
const allowed = new Map<string, { ok: boolean; expires: number }>();
async function streamPlayable(id: string) {
  const cached = allowed.get(id);
  if (cached && cached.expires > Date.now()) return cached.ok;
  const { data } = await admin.from("streams").select("disabled").eq("id", id).maybeSingle();
  const ok = !!data && !data.disabled;
  allowed.set(id, { ok, expires: Date.now() + 30_000 });
  return ok;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string; file: string[] }> }) {
  const parsed = params.safeParse(await ctx.params);
  if (!parsed.success) return notFound();
  const { id, file } = parsed.data;
  if (!(await streamPlayable(id))) return notFound();

  let path = streamPath(id);
  let rest = file;
  const quality = /^q(\d+)$/.exec(file[0])?.[1];
  if (quality) {
    if (!(QUALITIES as readonly string[]).includes(quality)) return notFound();
    path = `${path}_${quality}`;
    rest = file.slice(1);
  }
  if (rest.length === 0) return notFound();

  // Seuls les paramètres LL-HLS sont transmis (_HLS_msn, _HLS_part, _HLS_skip).
  const search = new URLSearchParams();
  for (const [k, v] of new URL(request.url).searchParams) {
    if (/^_HLS_(msn|part|skip)$/.test(k) && /^[A-Za-z0-9]{1,20}$/.test(v)) search.set(k, v);
  }
  const qs = search.size ? `?${search}` : "";

  let upstream: Response;
  try {
    upstream = await fetch(`${HLS_URL}/${path}/${rest.join("/")}${qs}`, { cache: "no-store", signal: request.signal });
  } catch {
    return new Response("Flux indisponible", { status: 502 });
  }

  const headers = new Headers({ "cache-control": "no-cache", "x-content-type-options": "nosniff" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return new Response(upstream.ok ? upstream.body : null, { status: upstream.ok ? 200 : 404, headers });
}
