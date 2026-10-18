import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagesView from "./MessagesView";
import { loadConversations } from "./data";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <MessagesView me={user.id} conversations={await loadConversations(user.id)} peer={null} thread={[]} />;
}
