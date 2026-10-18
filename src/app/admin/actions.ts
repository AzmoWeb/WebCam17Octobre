"use server";

import { revalidatePath } from "next/cache";
import { admin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/utils";

// Chaque action revérifie en base que l'appelant est administrateur,
// puis agit avec la clé service_role.

const denied: ActionResult = { ok: false, error: "Réservé aux administrateurs." };
const done = (message: string): ActionResult => {
  revalidatePath("/admin");
  return { ok: true, message };
};

export async function setGlobalBan(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me) return denied;
  const userId = String(formData.get("userId"));
  const banned = formData.get("banned") === "true";
  if (userId === me.id) return { ok: false, error: "Tu ne peux pas te bannir toi-même." };
  const { error } = await admin.from("profiles").update({ is_banned: banned }).eq("id", userId);
  if (error) return { ok: false, error: "Action impossible." };
  if (banned) await admin.from("comments").delete().eq("user_id", userId);
  return done(banned ? "Utilisateur banni du site (messages supprimés)" : "Bannissement levé");
}

export async function setAdmin(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me) return denied;
  const userId = String(formData.get("userId"));
  const value = formData.get("value") === "true";
  if (userId === me.id && !value) return { ok: false, error: "Tu ne peux pas retirer tes propres droits." };
  const { error } = await admin.from("profiles").update({ is_admin: value }).eq("id", userId);
  return error ? { ok: false, error: "Action impossible." } : done(value ? "Droits admin accordés" : "Droits admin retirés");
}

export async function adminDeleteStream(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return denied;
  const { error } = await admin.from("streams").delete().eq("id", String(formData.get("id")));
  return error ? { ok: false, error: "Suppression impossible." } : done("Caméra supprimée");
}

export async function adminDeleteComment(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return denied;
  const commentId = Number(formData.get("commentId"));
  if (commentId) await admin.from("comments").delete().eq("id", commentId);
  const reportId = Number(formData.get("reportId"));
  if (reportId) await admin.from("reports").delete().eq("id", reportId);
  return done("Message supprimé");
}

export async function adminDismissReport(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return denied;
  const { error } = await admin.from("reports").delete().eq("id", Number(formData.get("id")));
  return error ? { ok: false, error: "Action impossible." } : done("Signalement ignoré");
}
