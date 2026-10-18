"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/ratelimit";
import { bigintId, commentContent, eventSchema, firstError, formObject, uuid } from "@/lib/validation";
import { friendlyDbError, type ActionResult } from "@/lib/utils";

const LOGIN_REQUIRED: ActionResult<never> = { ok: false, error: "Connecte-toi pour continuer." };

export async function saveEvent(formData: FormData): Promise<ActionResult<string>> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const input = eventSchema.safeParse(formObject(formData));
  if (!input.success) return { ok: false, error: firstError(input.error) };

  const rawId = formData.get("id");
  const id = rawId ? uuid.safeParse(rawId) : null;
  if (id && !id.success) return { ok: false, error: "Données invalides." };
  if (!id && !(await rateLimit(`create-event:${auth.user.id}`, 10, 3600))) return { ok: false, error: RATE_LIMITED };

  // La RLS n'autorise la modification qu'au créateur (ou à un admin).
  const { data, error } = id
    ? await auth.supabase.from("events").update(input.data).eq("id", id.data).select("id").single()
    : await auth.supabase.from("events").insert(input.data).select("id").single();
  if (error) return { ok: false, error: "Enregistrement impossible." };

  revalidatePath("/events");
  revalidatePath(`/events/${data.id}`);
  return { ok: true, message: id ? "Événement mis à jour" : "Événement créé !", data: data.id as string };
}

export async function deleteEvent(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Données invalides." };
  const { error, count } = await auth.supabase.from("events").delete({ count: "exact" }).eq("id", id.data);
  if (error || !count) return { ok: false, error: "Suppression impossible." };
  revalidatePath("/events");
  return { ok: true, message: "Événement supprimé" };
}

export type EventComment = { id: number; event_id: string; user_id: string; username: string; content: string; created_at: string };

export async function sendEventComment(eventId: string, content: string): Promise<ActionResult<EventComment>> {
  const input = z.object({ eventId: uuid, content: commentContent }).safeParse({ eventId, content });
  if (!input.success) return { ok: false, error: firstError(input.error) };
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const { data, error } = await auth.supabase
    .from("event_comments")
    .insert({ event_id: input.data.eventId, content: input.data.content })
    .select("id, event_id, user_id, username, content, created_at")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return { ok: true, data: data as EventComment };
}

export async function deleteEventComment(commentId: number): Promise<ActionResult> {
  const id = bigintId.safeParse(commentId);
  if (!id.success) return { ok: false, error: "Données invalides." };
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  const { error, count } = await auth.supabase.from("event_comments").delete({ count: "exact" }).eq("id", id.data);
  if (error || !count) return { ok: false, error: "Suppression impossible." };
  return { ok: true };
}
