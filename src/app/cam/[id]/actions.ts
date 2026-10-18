"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { clientIp, rateLimit, RATE_LIMITED } from "@/lib/ratelimit";
import { bigintId, clipSchema, commentContent, firstError, reportReason, uuid } from "@/lib/validation";
import { friendlyDbError, type ActionResult } from "@/lib/utils";

// Toutes les écritures de la page caméra. Chaque action : utilisateur vérifié,
// entrées validées (Zod), écriture avec le client de l'utilisateur (RLS appliquée).

const LOGIN_REQUIRED: ActionResult<never> = { ok: false, error: "Connecte-toi pour continuer." };
const INVALID: ActionResult<never> = { ok: false, error: "Données invalides." };

export type ChatComment = { id: number; stream_id: string; user_id: string; username: string; content: string; created_at: string };

export async function sendComment(streamId: string, content: string): Promise<ActionResult<ChatComment>> {
  const input = z.object({ streamId: uuid, content: commentContent }).safeParse({ streamId, content });
  if (!input.success) return { ok: false, error: firstError(input.error) };
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;

  const { data, error } = await auth.supabase
    .from("comments")
    .insert({ stream_id: input.data.streamId, content: input.data.content })
    .select("id, stream_id, user_id, username, content, created_at")
    .single();
  if (error) {
    // 42501 = refus RLS (banni du chat ou du site).
    return { ok: false, error: error.code === "42501" ? "banned" : friendlyDbError(error.message) };
  }
  return { ok: true, data: data as ChatComment };
}

export async function deleteComment(commentId: number): Promise<ActionResult> {
  const id = bigintId.safeParse(commentId);
  if (!id.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const { error, count } = await auth.supabase.from("comments").delete({ count: "exact" }).eq("id", id.data);
  if (error || !count) return { ok: false, error: "Suppression impossible." };
  return { ok: true, message: "Message supprimé" };
}

/** Bannit un spectateur du chat d'une caméra (propriétaire uniquement, vérifié par la RLS). */
export async function banFromChat(streamId: string, userId: string): Promise<ActionResult> {
  const input = z.object({ streamId: uuid, userId: uuid }).safeParse({ streamId, userId });
  if (!input.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  if (input.data.userId === auth.user.id) return { ok: false, error: "Tu ne peux pas te bannir toi-même." };

  const { error } = await auth.supabase.from("stream_bans").upsert({ stream_id: input.data.streamId, user_id: input.data.userId }, { ignoreDuplicates: true });
  if (error) return { ok: false, error: "Bannissement impossible." };
  await auth.supabase.from("comments").delete().eq("stream_id", input.data.streamId).eq("user_id", input.data.userId);
  revalidatePath("/dashboard");
  return { ok: true, message: "Utilisateur banni du chat" };
}

export async function reportComment(commentId: number, reason: string): Promise<ActionResult> {
  const input = z.object({ commentId: bigintId, reason: reportReason }).safeParse({ commentId, reason });
  if (!input.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  if (!(await rateLimit(`report:${auth.user.id}`, 10, 600))) return { ok: false, error: RATE_LIMITED };

  const { error } = await auth.supabase.from("reports").insert({ comment_id: input.data.commentId, reason: input.data.reason });
  if (error) return { ok: false, error: error.code === "23505" ? "Tu as déjà signalé ce message." : friendlyDbError(error.message) };
  return { ok: true, message: "Merci ! Le streamer a été prévenu." };
}

export async function toggleFavorite(streamId: string, on: boolean): Promise<ActionResult> {
  const id = uuid.safeParse(streamId);
  if (!id.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const { error } = on
    ? await auth.supabase.from("favorites").upsert({ user_id: auth.user.id, stream_id: id.data }, { ignoreDuplicates: true })
    : await auth.supabase.from("favorites").delete().eq("user_id", auth.user.id).eq("stream_id", id.data);
  if (error) return { ok: false, error: "Action impossible." };
  return { ok: true, message: on ? "Ajoutée à tes favoris" : "Retirée de tes favoris" };
}

export async function toggleFollow(userId: string, on: boolean): Promise<ActionResult> {
  const id = uuid.safeParse(userId);
  if (!id.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  if (id.data === auth.user.id) return { ok: false, error: "Tu ne peux pas te suivre toi-même." };
  const { error } = on
    ? await auth.supabase.from("follows").upsert({ follower_id: auth.user.id, followed_id: id.data }, { ignoreDuplicates: true })
    : await auth.supabase.from("follows").delete().eq("follower_id", auth.user.id).eq("followed_id", id.data);
  if (error) return { ok: false, error: "Action impossible." };
  return { ok: true };
}

// Délai approximatif du direct (HLS) : le spectateur voit l'image avec quelques secondes de retard.
const HLS_DELAY_SECONDS = 4;

export async function createClip(streamId: string, title: string, duration: number): Promise<ActionResult<string>> {
  const input = clipSchema.safeParse({ streamId, title, duration });
  if (!input.success) return { ok: false, error: firstError(input.error) };
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;

  const d = input.data.duration;
  const start = new Date(Date.now() - (d + HLS_DELAY_SECONDS) * 1000).toISOString();
  const { data, error } = await auth.supabase
    .from("clips")
    .insert({ stream_id: input.data.streamId, title: input.data.title || "Clip", start_at: start, duration: d })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error.message) };

  revalidatePath(`/cam/${input.data.streamId}`);
  return { ok: true, message: "Clip créé !", data: data.id as string };
}

export async function deleteClip(formData: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const { error, count } = await auth.supabase.from("clips").delete({ count: "exact" }).eq("id", id.data);
  if (error || !count) return { ok: false, error: "Suppression impossible." };
  return { ok: true, message: "Clip supprimé" };
}

export async function deleteReplay(formData: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return INVALID;
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const { error, count } = await auth.supabase.from("broadcasts").delete({ count: "exact" }).eq("id", id.data);
  if (error || !count) return { ok: false, error: "Suppression impossible." };
  return { ok: true, message: "Replay retiré" };
}

/** Statistiques d'audience : appelée par la page caméra pendant un direct (1 / min / visiteur). */
export async function reportViewers(streamId: string, viewers: number): Promise<void> {
  const input = z.object({ streamId: uuid, viewers: z.number().int().min(0).max(100000) }).safeParse({ streamId, viewers });
  if (!input.success) return;
  if (!(await rateLimit(`viewers:${await clientIp()}:${input.data.streamId}`, 2, 60))) return;
  await admin.rpc("report_viewers", { p_stream: input.data.streamId, p_viewers: input.data.viewers });
}
