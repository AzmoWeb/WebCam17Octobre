import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, DM } from "./MessagesView";

type Row = DM & { sender: { username: string } | null; recipient: { username: string } | null };

/** Conversations de l'utilisateur (dernier message + non lus), à partir de ses 500 derniers messages. */
export async function loadConversations(me: string): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles!sender_id(username), recipient:profiles!recipient_id(username)")
    .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) console.error("Chargement des messages impossible :", error.message);

  const convos = new Map<string, Conversation>();
  for (const m of (data ?? []) as Row[]) {
    const mine = m.sender_id === me;
    const userId = mine ? m.recipient_id : m.sender_id;
    const username = (mine ? m.recipient?.username : m.sender?.username) ?? "inconnu";
    const c = convos.get(userId) ?? { userId, username, last: m, unread: 0 };
    if (!mine && !m.read_at) c.unread++;
    convos.set(userId, c);
  }
  return [...convos.values()];
}
