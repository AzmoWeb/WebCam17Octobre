"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Compass, Eye, Heart, LayoutGrid, Map, Radio, Search, UserCheck, Video, X } from "lucide-react";
import StreamCard from "@/components/StreamCard";
import { buttonClass, EmptyState, LiveDot, Select } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { CATEGORIES, cn } from "@/lib/utils";

type Tab = "toutes" | "direct" | "avenir" | "abonnements" | "favoris";
type Sort = "live" | "viewers" | "recent" | "favorites";
type Props = { streams: StreamSummary[]; loggedIn: boolean; followedIds: string[] };

const TABS: Tab[] = ["toutes", "direct", "avenir", "abonnements", "favoris"];
const isUpcoming = (s: StreamSummary) => !s.live && !!s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now();

export default function HomeClient({ streams, loggedIn, followedIds }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const viewers = useViewerCounts();
  const followed = useMemo(() => new Set(followedIds), [followedIds]);

  const initialTab = params.get("tab") as Tab;
  const [tab, setTabState] = useState<Tab>(TABS.includes(initialTab) ? initialTab : "toutes");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("live");
  const [favs, setFavs] = useState(() => new Set(streams.filter((s) => s.isFavorite).map((s) => s.id)));

  const setTab = (t: Tab) => {
    setTabState(t);
    router.replace(t === "toutes" ? "/" : `/?tab=${t}`, { scroll: false });
  };

  const live = streams.filter((s) => s.live);
  const totalViewers = Object.values(viewers).reduce((a, b) => a + b, 0);
  const v = (s: StreamSummary) => viewers[s.id] ?? 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = streams.filter((s) => {
      if (tab === "direct" && !s.live) return false;
      if (tab === "favoris" && !favs.has(s.id)) return false;
      if (tab === "abonnements" && !followed.has(s.ownerId)) return false;
      if (tab === "avenir" && !isUpcoming(s)) return false;
      if (category && s.category !== category) return false;
      if (q && ![s.title, s.owner, s.city, s.description].some((x) => x.toLowerCase().includes(q))) return false;
      return true;
    });
    if (tab === "avenir") return list.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    return list.sort((a, b) => {
      if (sort === "viewers") return v(b) - v(a);
      if (sort === "favorites") return b.favorites - a.favorites;
      if (sort === "recent") return b.created_at.localeCompare(a.created_at);
      return Number(b.live) - Number(a.live) || v(b) - v(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, tab, favs, followed, category, query, sort, viewers]);

  const featured = [...live].sort((a, b) => v(b) - v(a))[0];
  const hasFilters = !!query || !!category;

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(145,71,255,0.35),transparent_60%)]" />
        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:p-10">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-live/15 px-3 py-1 text-xs font-bold text-live">
              <LiveDot on={live.length > 0} /> {live.length} {live.length > 1 ? "caméras" : "caméra"} en direct
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Le terrain en direct, <span className="text-brand-hover">filmé par vous.</span>
            </h1>
            <p className="max-w-xl text-[15px] text-ink-muted sm:text-base">
              Regardez les caméras de la communauté, suivez les événements sur la carte et discutez en temps réel.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <a href="#explorer" className={buttonClass({ variant: "primary", size: "lg" })}>
                <Compass className="size-5" /> Explorer
              </a>
              <Link href="/carte" className={buttonClass({ size: "lg" })}>
                <Map className="size-5" /> Carte
              </Link>
              <Link href={loggedIn ? "/dashboard" : "/login?mode=signup"} className={buttonClass({ variant: "outline", size: "lg" })}>
                <Video className="size-5" /> Diffuser
              </Link>
            </div>
            <dl className="mt-2 flex gap-8">
              {[
                { v: streams.length, l: "caméras" },
                { v: live.length, l: "en direct", c: "text-live" },
                { v: totalViewers, l: "spectateurs" },
              ].map((x) => (
                <div key={x.l}>
                  <dt className="sr-only">{x.l}</dt>
                  <dd className={cn("text-2xl font-extrabold tabular-nums", x.c)}>{x.v}</dd>
                  <dd className="text-xs text-ink-dim">{x.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {featured ? (
            <Link
              href={`/cam/${featured.id}`}
              className="group relative hidden aspect-video overflow-hidden rounded-xl ring-1 ring-line transition hover:ring-2 hover:ring-brand lg:block"
            >
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#2a1452,#0e0e10)" }} />
              <div className="absolute inset-0 grid place-items-center text-white/70">
                <Radio className="size-14 transition group-hover:scale-110" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded bg-live px-2 py-0.5 text-xs font-bold text-white uppercase">
                  <span className="size-1.5 animate-pulse-dot rounded-full bg-white" /> À la une
                </span>
                <div className="truncate text-lg font-bold">{featured.title}</div>
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  @{featured.owner} · <Eye className="size-3.5" /> {v(featured)}
                </div>
              </div>
            </Link>
          ) : (
            <div className="hidden aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-ink-dim lg:flex">
              <Radio className="size-10" />
              <span className="text-sm">Aucun direct pour le moment</span>
            </div>
          )}
        </div>
      </section>

      {/* Exploration */}
      <section id="explorer" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "toutes" as Tab, label: "Toutes", icon: <Compass className="size-4" />, count: streams.length },
              { value: "direct" as Tab, label: "En direct", icon: <Radio className="size-4" />, count: live.length },
              { value: "avenir" as Tab, label: "À venir", icon: <CalendarClock className="size-4" />, count: streams.filter(isUpcoming).length },
              ...(loggedIn
                ? [
                    { value: "abonnements" as Tab, label: "Abonnements", icon: <UserCheck className="size-4" />, count: streams.filter((s) => followed.has(s.ownerId)).length },
                    { value: "favoris" as Tab, label: "Favoris", icon: <Heart className="size-4" />, count: favs.size },
                  ]
                : []),
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1 sm:min-w-64 lg:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-dim" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 100))}
                placeholder="Caméra, ville, pseudo…"
                aria-label="Rechercher"
                className="h-10 w-full rounded-lg border border-line bg-panel-2 pr-9 pl-9 text-sm placeholder:text-ink-dim focus:border-brand focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Effacer"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-dim hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier" className="h-10 sm:w-auto">
              <option value="live">En direct d&apos;abord</option>
              <option value="viewers">Plus regardées</option>
              <option value="favorites">Plus suivies</option>
              <option value="recent">Plus récentes</option>
            </Select>
          </div>
        </div>

        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {[{ value: null, label: "Tout" }, ...CATEGORIES].map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.label}
                onClick={() => setCategory(active ? null : c.value)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                  active || (c.value === null && !category) ? "bg-ink text-canvas" : "bg-panel-3 text-ink-muted hover:text-ink",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((s) => (
              <StreamCard
                key={s.id}
                stream={{ ...s, isFavorite: favs.has(s.id) }}
                viewers={v(s)}
                loggedIn={loggedIn}
                onFavoriteChange={(on) =>
                  setFavs((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(s.id);
                    else next.delete(s.id);
                    return next;
                  })
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={tab === "favoris" ? <Heart className="size-6" /> : tab === "avenir" ? <CalendarClock className="size-6" /> : <Eye className="size-6" />}
            title={
              hasFilters
                ? "Aucun résultat"
                : { toutes: "Aucune caméra pour l'instant", direct: "Personne n'est en direct", avenir: "Aucun direct programmé", abonnements: "Aucun abonnement", favoris: "Pas encore de favoris" }[tab]
            }
            action={
              hasFilters ? (
                <button
                  className={buttonClass()}
                  onClick={() => {
                    setQuery("");
                    setCategory(null);
                  }}
                >
                  Réinitialiser les filtres
                </button>
              ) : tab === "direct" && streams.length > 0 ? (
                <Link href="/mosaique" className={buttonClass()}>
                  <LayoutGrid className="size-4" /> Ouvrir la mosaïque
                </Link>
              ) : (
                <Link href={loggedIn ? "/dashboard" : "/login?mode=signup"} className={buttonClass({ variant: "primary" })}>
                  <Video className="size-4" /> Diffuser ma caméra
                </Link>
              )
            }
          >
            {hasFilters
              ? "Essaie d'autres mots-clés ou retire les filtres."
              : {
                  toutes: "Sois le premier à diffuser une caméra !",
                  direct: "Reviens plus tard ou consulte les directs programmés.",
                  avenir: "Les streamers peuvent programmer un direct depuis le Studio.",
                  abonnements: "Abonne-toi à des streamers depuis leur profil pour retrouver leurs caméras ici.",
                  favoris: "Clique sur le cœur d'une caméra pour la retrouver ici.",
                }[tab]}
          </EmptyState>
        )}
      </section>
    </div>
  );
}
