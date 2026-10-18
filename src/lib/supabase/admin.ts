import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client service_role : contourne la RLS. Uniquement pour le code serveur
// qui a besoin des clés de stream (hook MediaMTX, proxy HLS, statut en direct).
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const keyCache = new Map<string, { key: string | null; expires: number }>();

/** Clé de stream d'une caméra, mise en cache 30 s (le proxy HLS l'appelle à chaque segment). */
export async function getStreamKey(streamId: string): Promise<string | null> {
  const cached = keyCache.get(streamId);
  if (cached && cached.expires > Date.now()) return cached.key;

  const { data } = await admin.from("stream_keys").select("key").eq("stream_id", streamId).maybeSingle();
  const key = (data?.key as string | undefined) ?? null;
  keyCache.set(streamId, { key, expires: Date.now() + 30_000 });
  return key;
}
