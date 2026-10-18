"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { setStreamKeyHash } from "@/lib/supabase/admin";
import { generateStreamKey } from "@/lib/keys";
import { rateLimit, RATE_LIMITED } from "@/lib/ratelimit";
import { bigintId, firstError, formObject, streamSchema, uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/utils";

// Actions du Studio. La RLS limite déjà chaque écriture aux caméras de l'utilisateur ;
// la clé de stream, elle, n'est accessible qu'avec la clé service_role, après
// vérification explicite que la caméra appartient bien à l'utilisateur.

const LOGIN_REQUIRED: ActionResult<never> = { ok: false, error: "Session expirée, reconnecte-toi." };
const INVALID: ActionResult<never> = { ok: false, error: "Données invalides." };
const done = <T,>(message: string, data?: T): ActionResult<T> => {
  revalidatePath("/dashboard");
  return { ok: true, message, data };
};

/** La caméra appartient-elle à l'utilisateur ? */
async function ownsStream(auth: NonNullable<Awaited<ReturnType<typeof requireUser>>>, streamId: string) {
  const { data } = await auth.supabase.from("streams").select("id").eq("id", streamId).eq("owner_id", auth.user.id).maybeSingle();
  return !!data;
}

export type NewKey = { streamId: string; key: string };

export async function createStream(formData: FormData): Promise<ActionResult<NewKey>> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const input = streamSchema.safeParse(formObject(formData));
  if (!input.success) return { ok: false, error: firstError(input.error) };
  if (!(await rateLimit(`create-stream:${auth.user.id}`, 10, 3600))) return { ok: false, error: RATE_LIMITED };

  const { data, error } = await auth.supabase.from("streams").insert(input.data).select("id").single();
  if (error) return { ok: false, error: "Création impossible." };

  const { key, hash } = generateStreamKey();
  if (!(await setStreamKeyHash(data.id as string, hash))) return { ok: false, error: "Création de la clé impossible." };
  return done("Caméra créée !", { streamId: data.id as string, key });
}

export async function updateStream(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const id = uuid.safeParse(formData.get("id"));
  const input = streamSchema.safeParse(formObject(formData));
  if (!id.success) return INVALID;
  if (!input.success) return { ok: false, error: firstError(input.error) };

  const { error, count } = await auth.supabase
    .from("streams")
    .update(input.data, { count: "exact" })
    .eq("id", id.data)
    .eq("owner_id", auth.user.id);
  if (error || !count) return { ok: false, error: "Enregistrement impossible." };
  revalidatePath(`/cam/${id.data}`);
  return done("Caméra mise à jour");
}

export async function deleteStream(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return INVALID;
  const { error, count } = await auth.supabase.from("streams").delete({ count: "exact" }).eq("id", id.data).eq("owner_id", auth.user.id);
  if (error || !count) return { ok: false, error: "Suppression impossible." };
  return done("Caméra supprimée");
}

/** Nouvelle clé : l'ancienne cesse de fonctionner. La clé en clair n'est renvoyée qu'ici. */
export async function regenerateKey(formData: FormData): Promise<ActionResult<NewKey>> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return INVALID;
  if (!(await ownsStream(auth, id.data))) return { ok: false, error: "Action impossible." };
  if (!(await rateLimit(`regen-key:${auth.user.id}`, 10, 3600))) return { ok: false, error: RATE_LIMITED };

  const { key, hash } = generateStreamKey();
  if (!(await setStreamKeyHash(id.data, hash))) return { ok: false, error: "Action impossible." };
  return done("Nouvelle clé générée — copie-la maintenant, elle ne sera plus affichée.", { streamId: id.data, key });
}

// ---------------------------------------------------------------------------
// Modération de ses caméras
// ---------------------------------------------------------------------------

export async function dismissReport(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const id = bigintId.safeParse(formData.get("id"));
  if (!id.success) return INVALID;
  const { error } = await auth.supabase.from("reports").delete().eq("id", id.data);
  return error ? { ok: false, error: "Action impossible." } : done("Signalement ignoré");
}

export async function deleteComment(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const input = z
    .object({ commentId: bigintId.optional().catch(undefined), reportId: bigintId.optional().catch(undefined) })
    .parse(formObject(formData));
  if (input.commentId) await auth.supabase.from("comments").delete().eq("id", input.commentId);
  if (input.reportId) await auth.supabase.from("reports").delete().eq("id", input.reportId);
  return done("Message supprimé");
}

export async function banUser(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const input = z.object({ streamId: uuid, userId: uuid }).safeParse(formObject(formData));
  if (!input.success) return INVALID;
  const { streamId, userId } = input.data;
  if (userId === auth.user.id) return { ok: false, error: "Tu ne peux pas te bannir toi-même." };

  const { error } = await auth.supabase.from("stream_bans").upsert({ stream_id: streamId, user_id: userId }, { ignoreDuplicates: true });
  if (error) return { ok: false, error: "Action impossible." };
  await auth.supabase.from("comments").delete().eq("stream_id", streamId).eq("user_id", userId);
  await auth.supabase.from("reports").delete().eq("stream_id", streamId).eq("reported_user_id", userId);
  return done("Utilisateur banni et messages supprimés");
}

export async function unbanUser(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const input = z.object({ streamId: uuid, userId: uuid }).safeParse(formObject(formData));
  if (!input.success) return INVALID;
  const { error } = await auth.supabase
    .from("stream_bans")
    .delete()
    .eq("stream_id", input.data.streamId)
    .eq("user_id", input.data.userId);
  return error ? { ok: false, error: "Action impossible." } : done("Utilisateur débanni");
}
