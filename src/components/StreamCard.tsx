"use client";

import Link from "next/link";
import { CalendarClock, Eye, Heart, MapPin, Video } from "lucide-react";
import Avatar from "./Avatar";
import FavoriteButton from "./FavoriteButton";
import type { StreamSummary } from "@/lib/streams";
import { categoryLabel, formatDateTime, gradientFor, timeAgo } from "@/lib/utils";

type Props = {
  stream: StreamSummary;
  viewers: number;
  loggedIn: boolean;
  onFavoriteChange?: (fav: boolean) => void;
};

export default function StreamCard({ stream: s, viewers, loggedIn, onFavoriteChange }: Props) {
  return (
    <Link href={`/cam/${s.id}`} className="stream-card">
      <div className="stream-thumb" style={{ background: gradientFor(s.id) }}>
        <Video size={44} className="thumb-icon" />
        <div className="tl">
          {s.live ? (
            <span className="badge badge-live">EN DIRECT</span>
          ) : s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now() ? (
            <span className="badge badge-glass" suppressHydrationWarning>
              <CalendarClock size={12} /> {formatDateTime(s.scheduledAt)}
            </span>
          ) : (
            <span className="badge badge-glass">Hors ligne</span>
          )}
        </div>
        <div className="tr">
          <FavoriteButton
            streamId={s.id}
            initial={s.isFavorite}
            loggedIn={loggedIn}
            variant="overlay"
            onChange={onFavoriteChange}
          />
        </div>
        <div className="bl">
          {s.live && (
            <span className="badge badge-glass">
              <Eye size={12} /> {viewers}
            </span>
          )}
          <span className="badge badge-glass">{categoryLabel(s.category)}</span>
        </div>
      </div>
      <div className="stream-info">
        <Avatar name={s.owner} size={36} />
        <div className="grow">
          <h3 className="truncate">{s.title}</h3>
          <div className="muted small truncate">@{s.owner}</div>
          <div className="stream-meta">
            {s.city && (
              <span>
                <MapPin size={12} /> {s.city}
              </span>
            )}
            <span>
              <Heart size={12} /> {s.favorites}
            </span>
            <span>{timeAgo(s.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
