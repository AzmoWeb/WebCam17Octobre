"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, LayoutGrid, MapPin, Pencil, Radio, Share2, Trash2, Video } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import Countdown from "@/components/Countdown";
import StreamCard from "@/components/StreamCard";
import { useUI } from "@/components/UIProvider";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { formatDateTime, gradientFor } from "@/lib/utils";
import { deleteEvent } from "../actions";
import EventForm, { type EventFields } from "../EventForm";
import EventChat, { type EventComment } from "./EventChat";

export type EventDetail = EventFields & { id: string; owner_id: string; owner: string };

type Props = {
  event: EventDetail;
  streams: StreamSummary[];
  comments: EventComment[];
  currentUserId: string | null;
  isAdmin: boolean;
};

export default function EventView({ event, streams, comments, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const viewers = useViewerCounts();
  const [editing, setEditing] = useState(false);
  const isOwner = currentUserId === event.owner_id;
  const sorted = [...streams].sort((a, b) => Number(b.live) - Number(a.live) || (viewers[b.id] ?? 0) - (viewers[a.id] ?? 0));
  const live = sorted.filter((s) => s.live);
  const upcoming = new Date(event.starts_at).getTime() > Date.now();
  const totalViewers = live.reduce((n, s) => n + (viewers[s.id] ?? 0), 0);

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast("Lien de l'événement copié");
  }

  return (
    <div className="cam-layout">
      <div className="stack-lg" style={{ minWidth: 0 }}>
        <section className="hero" style={{ background: `${gradientFor(event.id)}`, padding: "40px 32px" }}>
          <div className="row">
            {live.length > 0 ? (
              <span className="badge badge-live">{live.length} CAMÉRA{live.length > 1 ? "S" : ""} EN DIRECT</span>
            ) : (
              <span className="badge badge-glass">{upcoming ? "À venir" : "Événement"}</span>
            )}
            {totalViewers > 0 && <span className="badge badge-glass">{totalViewers} spectateurs</span>}
          </div>
          <h1 style={{ color: "#fff", fontSize: "clamp(28px, 4vw, 42px)" }}>{event.title}</h1>
          <div className="row" style={{ marginTop: 14, color: "rgba(255,255,255,0.85)", gap: 16 }}>
            <span className="row" style={{ gap: 6 }}>
              <CalendarDays size={16} /> {formatDateTime(event.starts_at)}
            </span>
            {event.city && (
              <span className="row" style={{ gap: 6 }}>
                <MapPin size={16} /> {event.city}
              </span>
            )}
            <span className="row" style={{ gap: 6 }}>
              <Video size={16} /> {streams.length} caméra{streams.length > 1 ? "s" : ""}
            </span>
            <Link href={`/u/${event.owner}`} className="row" style={{ gap: 6 }}>
              <Avatar name={event.owner} size={22} /> @{event.owner}
            </Link>
          </div>
          {upcoming && (
            <div style={{ marginTop: 22, color: "rgba(255,255,255,0.75)" }}>
              <Countdown to={event.starts_at} onDone={() => router.refresh()} />
            </div>
          )}
          <div className="hero-actions">
            {live.length > 0 && (
              <Link href={`/mosaique?cams=${live.slice(0, 9).map((s) => s.id).join(",")}`} className="btn btn-lg">
                <LayoutGrid size={18} /> Tout voir en mosaïque
              </Link>
            )}
            <button className="btn btn-lg" onClick={share}>
              <Share2 size={18} /> Partager
            </button>
            {(isOwner || isAdmin) && (
              <>
                <button className="btn btn-lg" onClick={() => setEditing(true)}>
                  <Pencil size={18} /> Modifier
                </button>
                <ActionButton
                  action={deleteEvent}
                  fields={{ id: event.id }}
                  className="btn btn-lg btn-danger"
                  confirm={{
                    title: "Supprimer cet événement ?",
                    message: "Les caméras rattachées sont conservées, seul l'événement et son chat sont supprimés.",
                    confirmLabel: "Supprimer",
                    danger: true,
                  }}
                  onDone={() => router.push("/events")}
                >
                  <Trash2 size={18} />
                </ActionButton>
              </>
            )}
          </div>
        </section>

        {event.description && <p className="card card-body description">{event.description}</p>}

        <h2 className="section-title">
          <Radio size={20} /> Caméras de l&apos;événement
        </h2>
        {sorted.length ? (
          <div className="stream-grid">
            {sorted.map((s) => (
              <StreamCard key={s.id} stream={s} viewers={viewers[s.id] ?? 0} loggedIn={!!currentUserId} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">
              <Video size={28} />
            </div>
            <h3>Aucune caméra pour l&apos;instant</h3>
            <p>Dans le Studio, modifie ta caméra et choisis cet événement pour l&apos;y rattacher.</p>
            {currentUserId && (
              <Link href="/dashboard" className="btn btn-primary">
                Ouvrir le Studio
              </Link>
            )}
          </div>
        )}
      </div>

      <EventChat eventId={event.id} initial={comments} currentUserId={currentUserId} canModerate={isOwner || isAdmin} />

      {editing && <EventForm initial={event} onClose={() => setEditing(false)} />}
    </div>
  );
}
