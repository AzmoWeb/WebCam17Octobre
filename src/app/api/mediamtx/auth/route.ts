import { admin } from "@/lib/supabase/admin";

// Hook d'authentification appelé par MediaMTX (authMethod: http) pour chaque
// publication ou lecture. Réponse 2xx = autorisé, sinon refusé.
// https://github.com/bluenviron/mediamtx#authentication

type AuthRequest = {
  action: "publish" | "read" | "playback" | "api" | "metrics" | "pprof";
  path: string;
  ip: string;
  protocol: string;
};

const allow = () => new Response(null, { status: 200 });
const deny = () => new Response(null, { status: 401 });
const isLoopback = (ip: string) => ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AuthRequest | null;
  if (!body) return deny();

  if (body.action === "publish") {
    const match = /^live\/([A-Za-z0-9]{16,128})(_(?:720|480))?$/.exec(body.path);
    if (!match) return deny();
    // Les qualités réduites sont publiées par ffmpeg sur la machine elle-même.
    if (match[2] && !isLoopback(body.ip)) return deny();

    let { data, error } = await admin
      .from("stream_keys")
      .select("stream_id, streams(owner:profiles!owner_id(is_banned))")
      .eq("key", match[1])
      .maybeSingle();
    // Migration 003 pas encore appliquée (pas de colonne is_banned) : simple vérification de la clé.
    if (error) ({ data } = await admin.from("stream_keys").select("stream_id").eq("key", match[1]).maybeSingle());
    if (!data) return deny();
    const owner = (data.streams as unknown as { owner: { is_banned: boolean } | null } | null)?.owner;
    return owner?.is_banned ? deny() : allow();
  }

  // Lecture directe et enregistrements réservés au site (proxy local) : le public passe par /api/...
  if (body.action === "read" || body.action === "playback") return isLoopback(body.ip) ? allow() : deny();

  return deny();
}
