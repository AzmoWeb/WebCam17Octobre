import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLivePaths, publishPath } from "@/lib/mediamtx";
import DashboardView, {
  type DashBan,
  type DashBroadcast,
  type DashComment,
  type DashReport,
  type DashStream,
} from "./DashboardView";
import type { EventOption } from "./StreamForm";

export const metadata: Metadata = { title: "Studio" };

type Row = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
  scheduled_at?: string | null;
  event_id?: string | null;
  stream_keys: { key: string } | null;
  favorites?: { count: number }[];
};

const FULL =
  "id, title, description, category, city, created_at, lat, lng, scheduled_at, event_id, stream_keys(key), favorites(count)";
const BASE = "id, title, created_at, stream_keys(key)";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ cam?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = (select: string) => supabase.from("streams").select(select).eq("owner_id", user.id).order("created_at");
  const [full, livePaths, { data: eventRows }] = await Promise.all([
    query(FULL),
    getLivePaths(),
    supabase
      .from("events")
      .select("id, title, starts_at")
      .gte("starts_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .order("starts_at")
      .limit(100),
  ]);
  // Migrations 002/003 pas encore appliquées : requête minimale.
  const rows = full.error ? (await query(BASE)).data : full.data;

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
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    scheduled_at: r.scheduled_at ?? null,
    event_id: r.event_id ?? null,
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
    const ids = streams.map((s) => s.id);
    const [r, b, c, count, allReports, bc] = await Promise.all([
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
      supabase
        .from("broadcasts")
        .select("id, started_at, ended_at, peak_viewers")
        .eq("stream_id", selected.id)
        .order("started_at", { ascending: false })
        .limit(50),
    ]);
    reports = (r.data ?? []) as DashReport[];
    bans = ((b.data ?? []) as unknown as { user_id: string; created_at: string; profiles: { username: string } | null }[]).map(
      (x) => ({ user_id: x.user_id, created_at: x.created_at, username: x.profiles?.username ?? "inconnu" }),
    );
    comments = (c.data ?? []) as DashComment[];
    commentCount = count.count ?? 0;
    broadcasts = (bc.data ?? []) as DashBroadcast[];
    for (const row of allReports.data ?? []) {
      const id = row.stream_id as string;
      pendingReports[id] = (pendingReports[id] ?? 0) + 1;
    }
    // Courbe d'audience de la diffusion la plus récente.
    if (broadcasts[0]) {
      const { data } = await supabase
        .from("viewer_samples")
        .select("at, viewers")
        .eq("broadcast_id", broadcasts[0].id)
        .order("at")
        .limit(1000);
      samples = (data ?? []) as { at: string; viewers: number }[];
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
