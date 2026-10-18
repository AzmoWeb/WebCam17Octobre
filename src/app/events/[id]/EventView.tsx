"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, LayoutGrid, MapPin, Pencil, Radio, Trash2, Video } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import Countdown from "@/components/Countdown";
import ShareButton from "@/components/ShareButton";
import StreamCard from "@/components/StreamCard";
import { Badge, Button, buttonClass, Card, EmptyState, LiveBadge, SectionTitle } from "@/components/ui";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { formatDateTime, gradientFor } from "@/lib/utils";
import { deleteEvent } from "../actions";
import EventForm, { type EventFields } from "../EventForm";
import EventChat, { type EventComment } from "./EventChat";

export type EventDetail = EventFields & { id: string; owner_id: string; owner: string };

type Props = { event: EventDetail; streams: StreamSummary[]; comments: EventComment[]; currentUserId: string | null; isAdmin: boolean };

export default function EventView({ event, streams, comments, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const viewers = useViewerCounts();
  const [editing, setEditing] = useState(false);
  const canEdit = currentUserId === event.owner_id || isAdmin;
  const v = (s: StreamSummary) => viewers[s.id] ?? 0;
  const sorted = [...streams].sort((a, b) => Number(b.live) - Number(a.live) || v(b) - v(a));
  const live = sorted.filter((s) => s.live);
  const upcoming = new Date(event.starts_at).getTime() > Date.now();
  const totalViewers = live.reduce((n, s) => n + v(s), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="relative overflow-hidden rounded-2xl p-5 sm:p-8" style={{ background: gradientFor(event.id) }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {live.length > 0 ? <LiveBadge label={`${live.length} caméra${live.length > 1 ? "s" : ""} en direct`} /> : <Badge tone="glass">{upcoming ? "À venir" : "Événement"}</Badge>}
              {totalViewers > 0 && <Badge tone="glass">{totalViewers} spectateurs</Badge>}
            </div>
            <h1 className="text-2xl font-extrabold text-balance text-white sm:text-4xl">{event.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {formatDateTime(event.starts_at)}
              </span>
              {event.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" /> {event.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Video className="size-4" /> {streams.length} caméra{streams.length > 1 ? "s" : ""}
              </span>
              <Link href={`/u/${event.owner}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Avatar name={event.owner} size="xs" /> {event.owner}
              </Link>
            </div>
            {upcoming && <Countdown to={event.starts_at} onDone={() => router.refresh()} />}
            <div className="flex flex-wrap gap-2">
              {live.length > 0 && (
                <Link href={`/mosaique?cams=${live.slice(0, 9).map((s) => s.id).join(",")}`} className={buttonClass({ variant: "primary" })}>
                  <LayoutGrid className="size-4" /> Tout voir en mosaïque
                </Link>
              )}
              <ShareButton title={event.title} />
              {canEdit && (
                <>
                  <Button onClick={() => setEditing(true)}>
                    <Pencil className="size-4" /> Modifier
                  </Button>
                  <ActionButton
                    action={deleteEvent}
                    fields={{ id: event.id }}
                    variant="danger"
                    size="md"
                    icon
                    title="Supprimer l'événement"
                    confirm={{ title: "Supprimer cet événement ?", message: "Les caméras sont conservées ; l'événement et son chat sont supprimés.", confirmLabel: "Supprimer", danger: true }}
                    redirectTo="/events"
                  >
                    <Trash2 className="size-4" />
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        </section>

        {event.description && (
          <Card className="p-4 text-sm whitespace-pre-wrap text-ink-muted sm:p-5">{event.description}</Card>
        )}

        <SectionTitle icon={<Radio className="size-5" />}>Caméras de l&apos;événement</SectionTitle>
        {sorted.length ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((s) => (
              <StreamCard key={s.id} stream={s} viewers={v(s)} loggedIn={!!currentUserId} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Video className="size-6" />}
            title="Aucune caméra pour l'instant"
            action={
              currentUserId && (
                <Link href="/dashboard" className={buttonClass({ variant: "primary" })}>
                  Ouvrir le Studio
                </Link>
              )
            }
          >
            Dans le Studio, modifie ta caméra et choisis cet événement pour l&apos;y rattacher.
          </EmptyState>
        )}
      </div>

      <EventChat
        className="h-[70vh] lg:sticky lg:top-[4.75rem] lg:h-[calc(100dvh-6.5rem)] lg:self-start"
        eventId={event.id}
        initial={comments}
        currentUserId={currentUserId}
        canModerate={canEdit}
      />

      {editing && <EventForm initial={event} onClose={() => setEditing(false)} />}
    </div>
  );
}
