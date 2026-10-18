"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin, setStreamKeyHash } from "@/lib/supabase/admin";
import { requireAdmin, type CurrentUser } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/audit";
import { generateStreamKey } from "@/lib/keys";
import { kickPublisher } from "@/lib/mediamtx";
import { bigintId, formObject, uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/utils";

// Chaque action : rôle admin relu en base (requireAdmin), entrées validées par Zod,
// écriture avec la clé service_role (serveur uniquement), entrée dans le journal d'audit.

const DENIED: ActionResult<never> = { ok: false, error: "Action non autorisée." };
const INVALID: ActionResult<never> = { ok: false, error: "Données invalides." };
const FAILED: ActionResult<never> = { ok: false, error: "Action impossible." };

async function run<T extends z.ZodType>(
  schema: T,
  formData: FormData,
  fn: (me: CurrentUser, input: z.infer<T>) => Promise<ActionResult>,
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me) return DENIED;
  const input = schema.safeParse(formObject(formData));
  if (!input.success) return INVALID;
  const result = await fn(me, input.data);
  if (result.ok) revalidatePath("/admin");
  return result;
}

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

export async function setBan(formData: FormData) {
  return run(z.object({ userId: uuid, banned: z.enum(["true", "false"]) }), formData, async (me, { userId, banned }) => {
    if (userId === me.id) return { ok: false, error: "Tu ne peux pas te bannir toi-même." };
    const value = banned === "true";
    const { error } = await admin.from("profiles").update({ is_banned: value }).eq("id", userId);
    if (error) return FAILED;
    if (value) {
      await admin.from("comments").delete().eq("user_id", userId);
      // Coupe aussi ses directs en cours.
      const { data: streams } = await admin.from("streams").select("id").eq("owner_id", userId);
      await Promise.all((streams ?? []).map((s) => kickPublisher(s.id as string)));
    }
    await logAdminAction(me, value ? "user.ban" : "user.unban", "user", userId);
    return { ok: true, message: value ? "Utilisateur banni du site" : "Bannissement levé" };
  });
}

export async function setRole(formData: FormData) {
  return run(z.object({ userId: uuid, role: z.enum(["user", "moderator", "admin"]) }), formData, async (me, { userId, role }) => {
    if (userId === me.id) return { ok: false, error: "Tu ne peux pas changer ton propre rôle." };
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return FAILED;
    await logAdminAction(me, "user.role", "user", userId, { role });
    return { ok: true, message: `Rôle changé : ${role}` };
  });
}

export async function deleteUser(formData: FormData) {
  return run(z.object({ userId: uuid }), formData, async (me, { userId }) => {
    if (userId === me.id) return { ok: false, error: "Tu ne peux pas supprimer ton propre compte ici." };
    const { data: profile } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
    const { data: streams } = await admin.from("streams").select("id").eq("owner_id", userId);
    await Promise.all((streams ?? []).map((s) => kickPublisher(s.id as string)));
    // Supprime le compte d'authentification ; le profil et ses données suivent (ON DELETE CASCADE).
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return FAILED;
    await logAdminAction(me, "user.delete", "user", userId, { username: profile?.username });
    return { ok: true, message: "Compte supprimé" };
  });
}

// ---------------------------------------------------------------------------
// Caméras
// ---------------------------------------------------------------------------

/** Coupe le direct et bloque la caméra (elle ne peut plus publier tant qu'elle n'est pas réactivée). */
export async function cutStream(formData: FormData) {
  return run(z.object({ streamId: uuid }), formData, async (me, { streamId }) => {
    const { error } = await admin.from("streams").update({ disabled: true }).eq("id", streamId);
    if (error) return FAILED;
    const kicked = await kickPublisher(streamId);
    await logAdminAction(me, "stream.cut", "stream", streamId, { kicked });
    return { ok: true, message: kicked ? "Direct coupé et caméra bloquée" : "Caméra bloquée (aucun direct en cours)" };
  });
}

export async function enableStream(formData: FormData) {
  return run(z.object({ streamId: uuid }), formData, async (me, { streamId }) => {
    const { error } = await admin.from("streams").update({ disabled: false }).eq("id", streamId);
    if (error) return FAILED;
    await logAdminAction(me, "stream.enable", "stream", streamId);
    return { ok: true, message: "Caméra réactivée" };
  });
}

export async function deleteStreamAdmin(formData: FormData) {
  return run(z.object({ streamId: uuid }), formData, async (me, { streamId }) => {
    const { data: stream } = await admin.from("streams").select("title").eq("id", streamId).maybeSingle();
    await kickPublisher(streamId);
    const { error } = await admin.from("streams").delete().eq("id", streamId);
    if (error) return FAILED;
    await logAdminAction(me, "stream.delete", "stream", streamId, { title: stream?.title });
    return { ok: true, message: "Caméra supprimée" };
  });
}

/** Invalide la clé (fuite, abus) : le propriétaire devra en générer une nouvelle. */
export async function regenerateKeyAdmin(formData: FormData) {
  return run(z.object({ streamId: uuid }), formData, async (me, { streamId }) => {
    const { hash } = generateStreamKey(); // Clé jetée : personne ne la connaît.
    if (!(await setStreamKeyHash(streamId, hash))) return FAILED;
    await kickPublisher(streamId);
    await logAdminAction(me, "stream.key_reset", "key", streamId);
    return { ok: true, message: "Clé invalidée — le propriétaire doit en générer une nouvelle" };
  });
}

// ---------------------------------------------------------------------------
// Signalements et commentaires
// ---------------------------------------------------------------------------

export async function dismissReportAdmin(formData: FormData) {
  return run(z.object({ id: bigintId }), formData, async (me, { id }) => {
    const { error } = await admin.from("reports").delete().eq("id", id);
    if (error) return FAILED;
    await logAdminAction(me, "report.dismiss", "report", id);
    return { ok: true, message: "Signalement ignoré" };
  });
}

export async function deleteCommentAdmin(formData: FormData) {
  return run(
    z.object({ commentId: bigintId, reportId: bigintId.optional().catch(undefined) }),
    formData,
    async (me, { commentId, reportId }) => {
      const { data: comment } = await admin.from("comments").select("username, content").eq("id", commentId).maybeSingle();
      await admin.from("comments").delete().eq("id", commentId);
      if (reportId) await admin.from("reports").delete().eq("id", reportId);
      await logAdminAction(me, "comment.delete", "comment", commentId, {
        author: comment?.username,
        content: comment?.content?.slice(0, 200),
      });
      return { ok: true, message: "Commentaire supprimé" };
    },
  );
}
