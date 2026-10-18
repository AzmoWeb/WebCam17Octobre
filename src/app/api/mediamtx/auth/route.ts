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
    const match = /^live\/([A-Za-z0-9]{16,128})$/.exec(body.path);
    if (!match) return deny();
    const { data } = await admin.from("stream_keys").select("stream_id").eq("key", match[1]).maybeSingle();
    return data ? allow() : deny();
  }

  // La lecture directe est réservée au proxy HLS local : le public passe par /api/hls.
  if (body.action === "read") return isLoopback(body.ip) ? allow() : deny();

  return deny();
}
