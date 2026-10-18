import { admin } from "@/lib/supabase/admin";
import { hookSecretValid } from "@/lib/hookSecret";

// Appelé par MediaMTX (runOnReady / runOnNotReady) au début et à la fin d'un direct :
// ouvre / ferme une « diffusion » (statistiques + replays).

export async function POST(request: Request) {
  if (!hookSecretValid(request)) return new Response(null, { status: 403 });

  const params = new URL(request.url).searchParams;
  const match = /^live\/([0-9a-f-]{36})$/.exec(params.get("path") ?? "");
  if (!match) return new Response(null, { status: 204 });
  const streamId = match[1];

  const now = new Date().toISOString();
  // Ferme toute diffusion restée ouverte (coupure brutale, redémarrage…).
  await admin.from("broadcasts").update({ ended_at: now }).eq("stream_id", streamId).is("ended_at", null);

  if (params.get("event") === "ready") {
    const { data: exists } = await admin.from("streams").select("id").eq("id", streamId).maybeSingle();
    if (exists) await admin.from("broadcasts").insert({ stream_id: streamId, started_at: now });
  }
  return new Response(null, { status: 204 });
}
