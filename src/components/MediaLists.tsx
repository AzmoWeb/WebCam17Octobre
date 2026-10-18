"use client";

import Link from "next/link";
import { Clock, Film, PlayCircle, Scissors, Users } from "lucide-react";
import { formatDateTime, formatDuration, secondsBetween, timeAgo } from "@/lib/utils";

export type ClipItem = { id: string; title: string; duration: number; created_at: string; creator: string; streamTitle?: string };
export type ReplayItem = { id: string; started_at: string; ended_at: string; peak_viewers: number; streamTitle?: string };

export function ClipList({ clips, empty = "Aucun clip pour l'instant." }: { clips: ClipItem[]; empty?: string }) {
  if (!clips.length) return <p className="muted small">{empty}</p>;
  return (
    <div className="media-list">
      {clips.map((c) => (
        <Link key={c.id} href={`/clip/${c.id}`} className="media-item">
          <span className="row" style={{ gap: 8, color: "var(--accent)" }}>
            <Scissors size={16} />
            <strong className="truncate" style={{ color: "var(--text)" }}>
              {c.title}
            </strong>
          </span>
          {c.streamTitle && <span className="tiny muted truncate">{c.streamTitle}</span>}
          <span className="tiny muted row" style={{ gap: 8 }}>
            <span className="row" style={{ gap: 4 }}>
              <Clock size={11} /> {c.duration} s
            </span>
            <span>par @{c.creator}</span>
            <span>{timeAgo(c.created_at)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ReplayList({ replays, empty = "Aucun replay pour l'instant." }: { replays: ReplayItem[]; empty?: string }) {
  if (!replays.length) return <p className="muted small">{empty}</p>;
  return (
    <div className="media-list">
      {replays.map((r) => (
        <Link key={r.id} href={`/replay/${r.id}`} className="media-item">
          <span className="row" style={{ gap: 8, color: "var(--accent)" }}>
            <PlayCircle size={16} />
            <strong style={{ color: "var(--text)" }}>{formatDateTime(r.started_at)}</strong>
          </span>
          {r.streamTitle && <span className="tiny muted truncate">{r.streamTitle}</span>}
          <span className="tiny muted row" style={{ gap: 8 }}>
            <span className="row" style={{ gap: 4 }}>
              <Film size={11} /> {formatDuration(secondsBetween(r.started_at, r.ended_at))}
            </span>
            <span className="row" style={{ gap: 4 }}>
              <Users size={11} /> pic {r.peak_viewers}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
