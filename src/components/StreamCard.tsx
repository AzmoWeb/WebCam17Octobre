"use client";

import Link from "next/link";
import { CalendarClock, Eye, Heart, MapPin, Video } from "lucide-react";
import Avatar from "./Avatar";
import FavoriteButton from "./FavoriteButton";
import { Badge, LiveBadge } from "@/components/ui";
import type { StreamSummary } from "@/lib/streams";
import { categoryLabel, formatDateTime, gradientFor } from "@/lib/utils";

type Props = {
  stream: StreamSummary;
  viewers: number;
  loggedIn: boolean;
  onFavoriteChange?: (fav: boolean) => void;
};

export default function StreamCard({ stream: s, viewers, loggedIn, onFavoriteChange }: Props) {
  const scheduled = !s.live && s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now();

  return (
    <article className="group flex min-w-0 flex-col gap-2.5">
      <Link
        href={`/cam/${s.id}`}
        className="relative block aspect-video overflow-hidden rounded-xl ring-brand transition-all group-hover:-translate-y-0.5 group-hover:ring-2"
        style={{ background: gradientFor(s.id) }}
        aria-label={`Regarder ${s.title}`}
      >
        <div className="absolute inset-0 grid place-items-center text-white/80">
          <Video className="size-10 transition-transform duration-300 group-hover:scale-110" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {s.live ? (
            <LiveBadge />
          ) : scheduled ? (
            <Badge tone="glass">
              <CalendarClock className="size-3" />
              <span suppressHydrationWarning>{formatDateTime(s.scheduledAt!)}</span>
            </Badge>
          ) : (
            <Badge tone="glass">Hors ligne</Badge>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <FavoriteButton streamId={s.id} initial={s.isFavorite} loggedIn={loggedIn} variant="overlay" onChange={onFavoriteChange} />
        </div>
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          {s.live && (
            <Badge tone="glass">
              <Eye className="size-3" /> {viewers}
            </Badge>
          )}
          <Badge tone="glass">{categoryLabel(s.category)}</Badge>
        </div>
      </Link>

      <div className="flex gap-3">
        <Link href={`/u/${s.owner}`} aria-label={`Profil de ${s.owner}`}>
          <Avatar name={s.owner} size="sm" className="mt-0.5" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/cam/${s.id}`} className="block truncate text-[15px] font-semibold hover:text-brand-hover">
            {s.title}
          </Link>
          <Link href={`/u/${s.owner}`} className="block truncate text-[13px] text-ink-muted hover:text-ink">
            {s.owner}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-dim">
            {s.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {s.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" /> {s.favorites}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
