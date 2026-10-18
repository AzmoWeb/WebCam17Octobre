import { admin, getStreamIdByKey } from "@/lib/supabase/admin";

// Appelé par MediaMTX (runOnReady / runOnNotReady) au début et à la fin d'un direct :
// ouvre / ferme une « diffusion » (statistiques + replays).

const SECRET = process.env.MEDIAMTX_HOOK_SECRET ?? "change-me-hook-secret";

export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("secret") !== SECRET) return new Response(null, { status: 403 });

  const match = /^live\/([A-Za-z0-9]{16,128})$/.exec(params.get("path") ?? "");
  if (!match) return new Response(null, { status: 204 });
  const streamId = await getStreamIdByKey(match[1]);
  if (!streamId) return new Response(null, { status: 204 });

  const now = new Date().toISOString();
  // Ferme toute diffusion restée ouverte (coupure brutale, redémarrage…).
  await admin.from("broadcasts").update({ ended_at: now }).eq("stream_id", streamId).is("ended_at", null);

  if (params.get("event") === "ready") {
    await admin.from("broadcasts").insert({ stream_id: streamId, started_at: now });
  }
  return new Response(null, { status: 204 });
}
