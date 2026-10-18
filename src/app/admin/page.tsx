import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { admin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { getLivePaths, publishPath } from "@/lib/mediamtx";
import AdminView, { type AdminReport, type AdminStream, type AdminUser } from "./AdminView";

export const metadata: Metadata = { title: "Administration" };

const count = async (table: string) => (await admin.from(table).select("*", { count: "exact", head: true })).count ?? 0;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  if (!me) notFound(); // Page invisible pour les non-admins.

  const { q = "" } = await searchParams;
  const search = q.replace(/[^A-Za-z0-9_]/g, "").slice(0, 30);

  let usersQuery = admin.from("profiles").select("id, username, created_at, is_admin, is_banned").order("created_at", { ascending: false }).limit(50);
  if (search) usersQuery = usersQuery.ilike("username", `%${search}%`);

  const [users, streams, reports, keys, livePaths, nUsers, nStreams, nReports, nComments, nBanned] = await Promise.all([
    usersQuery,
    admin
      .from("streams")
      .select("id, title, created_at, owner:profiles!owner_id(username)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("reports")
      .select("id, comment_id, reported_user_id, reported_username, content, reason, created_at, stream:streams(id, title)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("stream_keys").select("stream_id, key"),
    getLivePaths(),
    count("profiles"),
    count("streams"),
    count("reports"),
    count("comments"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
  ]);

  const liveIds = new Set((keys.data ?? []).filter((k) => livePaths.has(publishPath(k.key as string))).map((k) => k.stream_id as string));
  const streamList: AdminStream[] = ((streams.data ?? []) as unknown as { id: string; title: string; created_at: string; owner: { username: string } | null }[]).map(
    (s) => ({ id: s.id, title: s.title, created_at: s.created_at, owner: s.owner?.username ?? "inconnu", live: liveIds.has(s.id) }),
  );

  return (
    <AdminView
      me={me.id}
      query={search}
      stats={{ users: nUsers, streams: nStreams, live: liveIds.size, reports: nReports, comments: nComments, banned: nBanned.count ?? 0 }}
      reports={(reports.data ?? []) as unknown as AdminReport[]}
      users={(users.data ?? []) as AdminUser[]}
      streams={streamList.sort((a, b) => Number(b.live) - Number(a.live))}
    />
  );
}
