"use server";

import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { bigintId, firstError, messageContent, uuid } from "@/lib/validation";
import { friendlyDbError, type ActionResult } from "@/lib/utils";
import type { DM } from "./types";

const LOGIN_REQUIRED: ActionResult<never> = { ok: false, error: "Connecte-toi pour continuer." };

export async function sendMessage(recipientId: string, content: string): Promise<ActionResult<DM>> {
  const input = z.object({ recipientId: uuid, content: messageContent }).safeParse({ recipientId, content });
  if (!input.success) return { ok: false, error: firstError(input.error) };
  const auth = await requireUser();
  if (!auth) return LOGIN_REQUIRED;
  if (input.data.recipientId === auth.user.id) return { ok: false, error: "Impossible de s'écrire à soi-même." };

  const { data, error } = await auth.supabase
    .from("messages")
    .insert({ recipient_id: input.data.recipientId, content: input.data.content })
    .select("id, sender_id, recipient_id, content, created_at, read_at")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return { ok: true, data: data as DM };
}

/** Nouveaux messages d'une conversation depuis `afterId` (relève toutes les quelques secondes). */
export async function pollThread(peerId: string, afterId: number): Promise<DM[]> {
  const input = z.object({ peerId: uuid, afterId: z.union([z.literal(0), bigintId]) }).safeParse({ peerId, afterId });
  if (!input.success) return [];
  const auth = await requireUser();
  if (!auth) return [];
  const me = auth.user.id;
  const peer = input.data.peerId;

  const { data } = await auth.supabase
    .from("messages")
    .select("id, sender_id, recipient_id, content, created_at, read_at")
    .or(`and(sender_id.eq.${me},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${me})`)
    .gt("id", input.data.afterId)
    .order("id")
    .limit(100);

  const fresh = (data ?? []) as DM[];
  if (fresh.some((m) => m.recipient_id === me && !m.read_at)) {
    await auth.supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", me)
      .eq("sender_id", peer)
      .is("read_at", null);
  }
  return fresh;
}
