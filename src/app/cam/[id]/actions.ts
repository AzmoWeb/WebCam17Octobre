"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError, type ActionResult } from "@/lib/utils";

// Délai approximatif du direct (HLS) : le spectateur voit l'image avec quelques secondes de retard.
const HLS_DELAY_SECONDS = 4;

export async function createClip(streamId: string, title: string, duration: number): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connecte-toi pour créer un clip." };

  const d = [15, 30, 60].includes(duration) ? duration : 30;
  const start = new Date(Date.now() - (d + HLS_DELAY_SECONDS) * 1000).toISOString();
  const { data, error } = await supabase
    .from("clips")
    .insert({ stream_id: streamId, title: title.trim().slice(0, 100) || "Clip", start_at: start, duration: d })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error.message) };

  revalidatePath(`/cam/${streamId}`);
  return { ok: true, message: "Clip créé !", data: data.id as string };
}

export async function deleteClip(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("clips").delete().eq("id", String(formData.get("id")));
  if (error) return { ok: false, error: "Suppression impossible." };
  revalidatePath("/cam/[id]", "page");
  return { ok: true, message: "Clip supprimé" };
}

export async function deleteReplay(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("broadcasts").delete().eq("id", String(formData.get("id")));
  if (error) return { ok: false, error: "Suppression impossible." };
  revalidatePath("/cam/[id]", "page");
  return { ok: true, message: "Replay supprimé" };
}
