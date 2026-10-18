"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, type ActionResult } from "@/lib/utils";

// La RLS garantit qu'on ne touche qu'à ses propres caméras : ces actions
// utilisent le client de l'utilisateur connecté, pas la clé service_role.

async function userClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

const fail = (error = "Action impossible, réessaie."): ActionResult<never> => ({ ok: false, error });
const done = <T,>(message: string, data?: T): ActionResult<T> => {
  revalidatePath("/dashboard");
  return { ok: true, message, data };
};

function readStreamFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const rawCategory = String(formData.get("category") ?? "autre");
  const category = CATEGORIES.some((c) => c.value === rawCategory) ? rawCategory : "autre";
  return { title, description, city, category };
}

export async function createStream(formData: FormData): Promise<ActionResult<string>> {
  const supabase = await userClient();
  if (!supabase) return fail("Session expirée, reconnecte-toi.");
  const fields = readStreamFields(formData);
  if (!fields.title) return fail("Le titre est obligatoire.");
  const { data, error } = await supabase.from("streams").insert(fields).select("id").single();
  if (error) return fail();
  return done("Caméra créée !", data.id as string);
}

export async function updateStream(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail("Session expirée, reconnecte-toi.");
  const fields = readStreamFields(formData);
  if (!fields.title) return fail("Le titre est obligatoire.");
  const { error } = await supabase.from("streams").update(fields).eq("id", String(formData.get("id")));
  return error ? fail() : done("Caméra mise à jour");
}

export async function deleteStream(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail();
  const { error } = await supabase.from("streams").delete().eq("id", String(formData.get("id")));
  return error ? fail() : done("Caméra supprimée");
}

export async function regenerateKey(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail();
  const { error } = await supabase
    .from("stream_keys")
    .update({ key: randomBytes(24).toString("hex"), updated_at: new Date().toISOString() })
    .eq("stream_id", String(formData.get("id")));
  return error ? fail() : done("Nouvelle clé générée — mets à jour ta caméra / OBS");
}

export async function dismissReport(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail();
  const { error } = await supabase.from("reports").delete().eq("id", Number(formData.get("id")));
  return error ? fail() : done("Signalement ignoré");
}

export async function deleteComment(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail();
  const commentId = Number(formData.get("commentId"));
  if (commentId) await supabase.from("comments").delete().eq("id", commentId);
  const reportId = Number(formData.get("reportId"));
  if (reportId) await supabase.from("reports").delete().eq("id", reportId);
  return done("Message supprimé");
}

export async function banUser(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail();
  const streamId = String(formData.get("streamId"));
  const userId = String(formData.get("userId"));
  const { error } = await supabase.from("stream_bans").upsert({ stream_id: streamId, user_id: userId });
  if (error) return fail();
  await supabase.from("comments").delete().eq("stream_id", streamId).eq("user_id", userId);
  await supabase.from("reports").delete().eq("stream_id", streamId).eq("reported_user_id", userId);
  return done("Utilisateur banni et messages supprimés");
}

export async function unbanUser(formData: FormData): Promise<ActionResult> {
  const supabase = await userClient();
  if (!supabase) return fail();
  const { error } = await supabase
    .from("stream_bans")
    .delete()
    .eq("stream_id", String(formData.get("streamId")))
    .eq("user_id", String(formData.get("userId")));
  return error ? fail() : done("Utilisateur débanni");
}
