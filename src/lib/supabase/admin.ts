import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hashKey } from "@/lib/keys";

// Client service_role : contourne la RLS. Uniquement dans du code serveur
// (hooks MediaMTX, gestion des clés, statistiques, administration).
export const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Vérifie une clé de stream (comparaison des hash) et l'état de la caméra. */
export async function checkPublishKey(streamId: string, key: string) {
  const { data } = await admin
    .from("streams")
    .select("disabled, owner:profiles!owner_id(is_banned), stream_keys(key_hash)")
    .eq("id", streamId)
    .maybeSingle();
  if (!data) return false;
  const row = data as unknown as {
    disabled: boolean;
    owner: { is_banned: boolean } | null;
    stream_keys: { key_hash: string } | null;
  };
  return !row.disabled && !row.owner?.is_banned && row.stream_keys?.key_hash === hashKey(key);
}

/** Remplace le hash de la clé d'une caméra. */
export async function setStreamKeyHash(streamId: string, hash: string) {
  const { error } = await admin
    .from("stream_keys")
    .upsert({ stream_id: streamId, key_hash: hash, updated_at: new Date().toISOString() });
  return !error;
}
