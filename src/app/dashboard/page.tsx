import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLivePaths, publishPath } from "@/lib/mediamtx";
import DashboardView, { type DashBan, type DashComment, type DashReport, type DashStream } from "./DashboardView";

export const metadata: Metadata = { title: "Studio" };

type Row = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
  stream_keys: { key: string } | null;
  favorites: { count: number }[];
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ cam?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, livePaths] = await Promise.all([
    supabase
      .from("streams")
      .select("id, title, description, category, city, created_at, stream_keys(key), favorites(count)")
      .eq("owner_id", user.id)
      .order("created_at"),
    getLivePaths(),
  ]);

  const streams: DashStream[] = ((rows ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    category: r.category ?? "autre",
    city: r.city ?? "",
    created_at: r.created_at,
    key: r.stream_keys?.key ?? "",
    favorites: r.favorites?.[0]?.count ?? 0,
    live: !!r.stream_keys && livePaths.has(publishPath(r.stream_keys.key)),
  }));

  const { cam } = await searchParams;
  const selected = streams.find((s) => s.id === cam) ?? streams[0] ?? null;

  let reports: DashReport[] = [];
  let bans: DashBan[] = [];
  let comments: DashComment[] = [];
  let commentCount = 0;
  let pendingReports: Record<string, number> = {};

  if (selected) {
    const ids = streams.map((s) => s.id);
    const [r, b, c, count, allReports] = await Promise.all([
      supabase.from("reports").select("*").eq("stream_id", selected.id).order("created_at", { ascending: false }),
      supabase.from("stream_bans").select("user_id, created_at, profiles(username)").eq("stream_id", selected.id),
      supabase
        .from("comments")
        .select("id, user_id, username, content, created_at")
        .eq("stream_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("stream_id", selected.id),
      supabase.from("reports").select("stream_id").in("stream_id", ids),
    ]);
    reports = (r.data ?? []) as DashReport[];
    bans = ((b.data ?? []) as unknown as { user_id: string; created_at: string; profiles: { username: string } | null }[]).map(
      (x) => ({ user_id: x.user_id, created_at: x.created_at, username: x.profiles?.username ?? "inconnu" }),
    );
    comments = (c.data ?? []) as DashComment[];
    commentCount = count.count ?? 0;
    pendingReports = {};
    for (const row of allReports.data ?? []) {
      const id = row.stream_id as string;
      pendingReports[id] = (pendingReports[id] ?? 0) + 1;
    }
  }

  return (
    <DashboardView
      streams={streams}
      selected={selected}
      reports={reports}
      bans={bans}
      comments={comments}
      commentCount={commentCount}
      pendingReports={pendingReports}
      rtmpUrl={process.env.NEXT_PUBLIC_RTMP_URL ?? "rtmp://localhost/live"}
    />
  );
}
