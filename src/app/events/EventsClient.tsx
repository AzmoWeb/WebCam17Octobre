"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus, MapPin, Radio, Video } from "lucide-react";
import Avatar from "@/components/Avatar";
import { cn, formatDateTime, gradientFor } from "@/lib/utils";
import EventForm from "./EventForm";

export type EventSummary = {
  id: string;
  title: string;
  description: string;
  city: string;
  starts_at: string;
  owner: string;
  cameras: number;
  live: number;
};

export default function EventsClient({ events, loggedIn }: { events: EventSummary[]; loggedIn: boolean }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [creating, setCreating] = useState(false);
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const upcoming = events
    .filter((e) => new Date(e.starts_at).getTime() >= dayAgo)
    .sort((a, b) => b.live - a.live || a.starts_at.localeCompare(b.starts_at));
  const past = events.filter((e) => new Date(e.starts_at).getTime() < dayAgo);
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="stack-lg">
      <div className="row between">
        <div>
          <h1 className="section-title" style={{ fontSize: 28 }}>
            <CalendarDays size={26} /> Événements
          </h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Toutes les caméras d&apos;une même manifestation ou d&apos;un même événement, réunies sur une page avec un chat
            commun.
          </p>
        </div>
        {loggedIn ? (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <CalendarPlus size={16} /> Créer un événement
          </button>
        ) : (
          <Link href="/login" className="btn">
            Connecte-toi pour créer un événement
          </Link>
        )}
      </div>

      <div className="tabs" style={{ alignSelf: "flex-start" }}>
        <button className={cn("tab", tab === "upcoming" && "active")} onClick={() => setTab("upcoming")}>
          En cours et à venir <span className="count">{upcoming.length}</span>
        </button>
        <button className={cn("tab", tab === "past" && "active")} onClick={() => setTab("past")}>
          Passés <span className="count">{past.length}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <CalendarDays size={28} />
          </div>
          <h3>{tab === "upcoming" ? "Aucun événement à venir" : "Aucun événement passé"}</h3>
          <p>Crée un événement pour regrouper plusieurs caméras.</p>
        </div>
      ) : (
        <div className="stream-grid">
          {list.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="stream-card">
              <div className="stream-thumb" style={{ background: gradientFor(e.id), aspectRatio: "21 / 9" }}>
                <CalendarDays size={40} className="thumb-icon" />
                <div className="tl">
                  {e.live > 0 ? (
                    <span className="badge badge-live">{e.live} EN DIRECT</span>
                  ) : (
                    <span className="badge badge-glass">{formatDateTime(e.starts_at)}</span>
                  )}
                </div>
              </div>
              <div className="stream-info">
                <Avatar name={e.owner} size={36} />
                <div className="grow">
                  <h3 className="truncate">{e.title}</h3>
                  <div className="stream-meta">
                    <span>
                      <CalendarDays size={12} /> {formatDateTime(e.starts_at)}
                    </span>
                    {e.city && (
                      <span>
                        <MapPin size={12} /> {e.city}
                      </span>
                    )}
                    <span>
                      <Video size={12} /> {e.cameras}
                    </span>
                    {e.live > 0 && (
                      <span style={{ color: "var(--live)" }}>
                        <Radio size={12} /> {e.live}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <EventForm onClose={() => setCreating(false)} />}
    </div>
  );
}
