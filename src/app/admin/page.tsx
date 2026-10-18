import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { getLiveStreamIds } from "@/lib/mediamtx";
import AdminView, { type AdminAudit, type AdminComment, type AdminReport, type AdminStream, type AdminUser } from "./AdminView";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

const count = async (table: string) => (await admin.from(table).select("*", { count: "exact", head: true })).count ?? 0;

const searchSchema = z.object({
  q: z.string().max(30).transform((v) => v.replace(/[^A-Za-z0-9_]/g, "")).catch(""),
  tab: z.enum(["reports", "users", "streams", "comments", "audit"]).catch("reports"),
});

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Rôle vérifié côté serveur (relu en base) : la page n'existe pas pour les autres.
  const me = await requireAdmin();
  if (!me) notFound();

  const { q, tab } = searchSchema.parse(await searchParams);

  let usersQuery = admin
    .from("profiles")
    .select("id, username, created_at, role, is_banned")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) usersQuery = usersQuery.ilike("username", `%${q}%`);

  const [users, streams, reports, comments, audit, liveIds, nUsers, nStreams, nReports, nComments, nBanned] = await Promise.all([
    usersQuery,
    admin
      .from("streams")
      .select("id, title, created_at, disabled, owner:profiles!owner_id(username)")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("reports")
      .select("id, comment_id, reported_user_id, reported_username, content, reason, created_at, stream:streams(id, title)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("comments")
      .select("id, username, user_id, content, created_at, stream:streams(id, title)")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("admin_audit").select("id, admin_username, action, target_type, target_id, details, created_at").order("created_at", { ascending: false }).limit(100),
    getLiveStreamIds(),
    count("profiles"),
    count("streams"),
    count("reports"),
    count("comments"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
  ]);

  type StreamRow = { id: string; title: string; created_at: string; disabled: boolean; owner: { username: string } | null };
  const streamList: AdminStream[] = ((streams.data ?? []) as unknown as StreamRow[])
    .map((s) => ({ id: s.id, title: s.title, created_at: s.created_at, disabled: s.disabled, owner: s.owner?.username ?? "inconnu", live: liveIds.has(s.id) }))
    .sort((a, b) => Number(b.live) - Number(a.live));

  return (
    <AdminView
      me={me.id}
      initialTab={tab}
      query={q}
      stats={{ users: nUsers, streams: nStreams, live: liveIds.size, reports: nReports, comments: nComments, banned: nBanned.count ?? 0 }}
      reports={(reports.data ?? []) as unknown as AdminReport[]}
      users={(users.data ?? []) as AdminUser[]}
      streams={streamList}
      comments={(comments.data ?? []) as unknown as AdminComment[]}
      audit={(audit.data ?? []) as AdminAudit[]}
    />
  );
}
