import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagesView, { type DM } from "../MessagesView";
import { loadConversations } from "../data";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Messages · @${decodeURIComponent((await params).username)}` };
}

export default async function ConversationPage({ params }: Params) {
  const username = decodeURIComponent((await params).username);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: peer } = await supabase.from("profiles").select("id, username").eq("username", username).maybeSingle();
  if (!peer) notFound();
  if (peer.id === user.id) redirect("/messages");

  // Marque la conversation comme lue avant de charger la liste (compteurs à jour).
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("sender_id", peer.id)
    .is("read_at", null);

  const [conversations, { data: thread }] = await Promise.all([
    loadConversations(user.id),
    supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <MessagesView
      me={user.id}
      conversations={conversations}
      peer={{ id: peer.id, username: peer.username }}
      thread={((thread ?? []) as DM[]).reverse()}
    />
  );
}
