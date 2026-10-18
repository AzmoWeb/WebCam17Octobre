import Link from "next/link";
import { Clock, Film, PlayCircle, Scissors, Users } from "lucide-react";
import { formatDateTime, formatDuration, secondsBetween, timeAgo } from "@/lib/utils";

export type ClipItem = { id: string; title: string; duration: number; created_at: string; creator: string; streamTitle?: string };
export type ReplayItem = { id: string; started_at: string; ended_at: string; peak_viewers: number; streamTitle?: string };

const item = "flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-panel-2 p-3 transition hover:-translate-y-0.5 hover:border-line-strong";
const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

export function ClipList({ clips, empty = "Aucun clip pour l'instant." }: { clips: ClipItem[]; empty?: string }) {
  if (!clips.length) return <p className="text-sm text-ink-dim">{empty}</p>;
  return (
    <div className={grid}>
      {clips.map((c) => (
        <Link key={c.id} href={`/clip/${c.id}`} className={item}>
          <span className="flex items-center gap-2">
            <Scissors className="size-4 shrink-0 text-brand" />
            <strong className="truncate">{c.title}</strong>
          </span>
          {c.streamTitle && <span className="truncate text-xs text-ink-dim">{c.streamTitle}</span>}
          <span className="flex flex-wrap gap-x-3 text-xs text-ink-dim">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {c.duration} s
            </span>
            <span>par {c.creator}</span>
            <span suppressHydrationWarning>{timeAgo(c.created_at)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ReplayList({ replays, empty = "Aucun replay pour l'instant." }: { replays: ReplayItem[]; empty?: string }) {
  if (!replays.length) return <p className="text-sm text-ink-dim">{empty}</p>;
  return (
    <div className={grid}>
      {replays.map((r) => (
        <Link key={r.id} href={`/replay/${r.id}`} className={item}>
          <span className="flex items-center gap-2">
            <PlayCircle className="size-4 shrink-0 text-brand" />
            <strong className="truncate" suppressHydrationWarning>
              {formatDateTime(r.started_at)}
            </strong>
          </span>
          {r.streamTitle && <span className="truncate text-xs text-ink-dim">{r.streamTitle}</span>}
          <span className="flex gap-3 text-xs text-ink-dim">
            <span className="inline-flex items-center gap-1">
              <Film className="size-3" /> {formatDuration(secondsBetween(r.started_at, r.ended_at))}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> pic {r.peak_viewers}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
