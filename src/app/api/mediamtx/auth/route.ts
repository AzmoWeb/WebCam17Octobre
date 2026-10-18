import { z } from "zod";
import { checkPublishKey } from "@/lib/supabase/admin";
import { hookSecretValid } from "@/lib/hookSecret";

// Hook d'authentification appelé par MediaMTX (authMethod: http) pour chaque
// publication ou lecture. Réponse 2xx = autorisé, sinon refusé.
// Protégé par un secret partagé (MEDIAMTX_HOOK_SECRET) passé dans l'URL du hook.

const MAX_BODY = 4096;
const deny = () => new Response(null, { status: 401 });
const allow = () => new Response(null, { status: 200 });
const isLoopback = (ip: string) => ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

const bodySchema = z.object({
  action: z.string().max(20),
  path: z.string().max(200),
  ip: z.string().max(64),
  query: z.string().max(1000).optional().default(""),
});

export async function POST(request: Request) {
  if (!hookSecretValid(request)) return deny();
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return deny();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return deny();
  const { action, path, ip, query } = parsed.data;

  if (action === "publish") {
    const match = /^live\/([0-9a-f-]{36})(_(?:720|480))?$/.exec(path);
    if (!match) return deny();
    // Les qualités réduites sont publiées par ffmpeg sur la machine elle-même.
    if (match[2]) return isLoopback(ip) ? allow() : deny();
    const key = new URLSearchParams(query).get("key") ?? "";
    if (!/^[A-Za-z0-9]{16,128}$/.test(key)) return deny();
    return (await checkPublishKey(match[1], key)) ? allow() : deny();
  }

  // Lecture directe et enregistrements réservés au site (proxys locaux).
  if (action === "read" || action === "playback") return isLoopback(ip) ? allow() : deny();

  return deny();
}
