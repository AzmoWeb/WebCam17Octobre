import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLiveStreamIds } from "@/lib/mediamtx";
import DashboardView, { type DashBan, type DashBroadcast, type DashComment, type DashReport, type DashStream } from "./DashboardView";
import type { EventOption } from "./StreamForm";

export const metadata: Metadata = { title: "Studio" };

type Row = Omit<DashStream, "favorites" | "live"> & { favorites: { count: number }[] };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ cam?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, liveIds, { data: eventRows }] = await Promise.all([
    supabase
      .from("streams")
      .select("id, title, description, category, city, created_at, lat, lng, scheduled_at, event_id, disabled, favorites(count)")
      .eq("owner_id", user.id)
      .order("created_at"),
    getLiveStreamIds(),
    supabase
      .from("events")
      .select("id, title, starts_at")
      .gte("starts_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .order("starts_at")
      .limit(100),
  ]);

  const streams: DashStream[] = ((rows ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    favorites: r.favorites?.[0]?.count ?? 0,
    live: liveIds.has(r.id),
  }));

  const { cam } = await searchParams;
  const selected = streams.find((s) => s.id === cam) ?? streams[0] ?? null;

  let reports: DashReport[] = [];
  let bans: DashBan[] = [];
  let comments: DashComment[] = [];
  let broadcasts: DashBroadcast[] = [];
  let samples: { at: string; viewers: number }[] = [];
  let commentCount = 0;
  const pendingReports: Record<string, number> = {};

  if (selected) {
    const [r, b, c, count, allReports, bc] = await Promise.all([
      supabase
        .from("reports")
        .select("id, comment_id, reported_user_id, reported_username, content, reason, created_at")
        .eq("stream_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("stream_bans").select("user_id, created_at, profiles(username)").eq("stream_id", selected.id),
      supabase
        .from("comments")
        .select("id, user_id, username, content, created_at")
        .eq("stream_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("stream_id", selected.id),
      supabase.from("reports").select("stream_id").in("stream_id", streams.map((s) => s.id)),
      supabase
        .from("broadcasts")
        .select("id, started_at, ended_at, peak_viewers")
        .eq("stream_id", selected.id)
        .order("started_at", { ascending: false })
        .limit(50),
    ]);
    reports = (r.data ?? []) as DashReport[];
    bans = ((b.data ?? []) as unknown as { user_id: string; created_at: string; profiles: { username: string } | null }[]).map((x) => ({
      user_id: x.user_id,
      created_at: x.created_at,
      username: x.profiles?.username ?? "inconnu",
    }));
    comments = (c.data ?? []) as DashComment[];
    commentCount = count.count ?? 0;
    broadcasts = (bc.data ?? []) as DashBroadcast[];
    for (const row of allReports.data ?? []) {
      const id = row.stream_id as string;
      pendingReports[id] = (pendingReports[id] ?? 0) + 1;
    }
    if (broadcasts[0]) {
      const { data } = await supabase.from("viewer_samples").select("at, viewers").eq("broadcast_id", broadcasts[0].id).order("at").limit(1000);
      samples = (data ?? []) as typeof samples;
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
      broadcasts={broadcasts}
      samples={samples}
      events={(eventRows ?? []) as EventOption[]}
      rtmpUrl={process.env.NEXT_PUBLIC_RTMP_URL ?? "rtmp://localhost/live"}
    />
  );
}
