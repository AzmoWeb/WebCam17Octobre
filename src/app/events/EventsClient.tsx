"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus, MapPin, Video } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Badge, Button, buttonClass, EmptyState, LiveBadge, PageTitle } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { formatDateTime, gradientFor } from "@/lib/utils";
import EventForm from "./EventForm";

export type EventSummary = { id: string; title: string; city: string; starts_at: string; owner: string; cameras: number; live: number };

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
    <div className="flex flex-col gap-6">
      <PageTitle
        icon={<CalendarDays className="size-7" />}
        title="Événements"
        subtitle="Toutes les caméras d'une manifestation ou d'un événement, réunies sur une page avec un chat commun."
        actions={
          loggedIn ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <CalendarPlus className="size-4" /> Créer un événement
            </Button>
          ) : (
            <Link href="/login" className={buttonClass()}>
              Connecte-toi pour créer
            </Link>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        className="self-start"
        items={[
          { value: "upcoming", label: "En cours et à venir", count: upcoming.length },
          { value: "past", label: "Passés", count: past.length },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title={tab === "upcoming" ? "Aucun événement à venir" : "Aucun événement passé"}>
          Crée un événement pour regrouper plusieurs caméras.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="group overflow-hidden rounded-xl border border-line bg-panel transition hover:-translate-y-0.5 hover:border-brand">
              <div className="relative grid aspect-[21/9] place-items-center text-white/80" style={{ background: gradientFor(e.id) }}>
                <CalendarDays className="size-9 transition group-hover:scale-110" />
                <div className="absolute top-2.5 left-2.5">
                  {e.live > 0 ? <LiveBadge label={`${e.live} en direct`} /> : <Badge tone="glass">{formatDateTime(e.starts_at)}</Badge>}
                </div>
              </div>
              <div className="flex gap-3 p-4">
                <Avatar name={e.owner} size="sm" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{e.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-dim">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" /> {formatDateTime(e.starts_at)}
                    </span>
                    {e.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {e.city}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Video className="size-3" /> {e.cameras}
                    </span>
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
