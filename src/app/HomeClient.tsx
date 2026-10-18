"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Compass, Eye, Heart, LayoutGrid, Map, Radio, Search, SlidersHorizontal, UserCheck, Video, X } from "lucide-react";
import StreamCard from "@/components/StreamCard";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { CATEGORIES, cn } from "@/lib/utils";

type Tab = "toutes" | "direct" | "avenir" | "abonnements" | "favoris";
type Sort = "live" | "viewers" | "recent" | "favorites";

type Props = { streams: StreamSummary[]; loggedIn: boolean; followedIds: string[] };

const isUpcoming = (s: StreamSummary) => !s.live && !!s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now();

export default function HomeClient({ streams, loggedIn, followedIds }: Props) {
  const followed = useMemo(() => new Set(followedIds), [followedIds]);
  const router = useRouter();
  const params = useSearchParams();
  const viewers = useViewerCounts();

  const [tab, setTabState] = useState<Tab>((params.get("tab") as Tab) || "toutes");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("live");
  const [favs, setFavs] = useState(() => new Set(streams.filter((s) => s.isFavorite).map((s) => s.id)));

  const setTab = (t: Tab) => {
    setTabState(t);
    router.replace(t === "toutes" ? "/" : `/?tab=${t}`, { scroll: false });
  };

  const liveCount = streams.filter((s) => s.live).length;
  const totalViewers = Object.values(viewers).reduce((a, b) => a + b, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = streams.filter((s) => {
      if (tab === "direct" && !s.live) return false;
      if (tab === "favoris" && !favs.has(s.id)) return false;
      if (tab === "abonnements" && !followed.has(s.ownerId)) return false;
      if (tab === "avenir" && !isUpcoming(s)) return false;
      if (category && s.category !== category) return false;
      if (q && ![s.title, s.owner, s.city, s.description].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
    const v = (s: StreamSummary) => viewers[s.id] ?? 0;
    if (tab === "avenir") return list.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    return list.sort((a, b) => {
      switch (sort) {
        case "viewers":
          return v(b) - v(a);
        case "favorites":
          return b.favorites - a.favorites;
        case "recent":
          return b.created_at.localeCompare(a.created_at);
        default:
          return Number(b.live) - Number(a.live) || v(b) - v(a);
      }
    });
  }, [streams, tab, favs, followed, category, query, sort, viewers]);

  const upcomingCount = streams.filter(isUpcoming).length;
  const followedCount = streams.filter((s) => followed.has(s.ownerId)).length;

  const countFor = (c: string) => streams.filter((s) => s.category === c).length;
  const hasFilters = query || category;

  return (
    <div className="stack-lg">
      <section className="hero">
        <span className="hero-eyebrow">
          <span className="live-dot on" /> {liveCount} {liveCount > 1 ? "caméras" : "caméra"} en direct
        </span>
        <h1>
          Le monde en direct, <span className="gradient-text">filmé par vous.</span>
        </h1>
        <p>
          Regardez les caméras de la communauté en temps réel, réagissez et discutez dans le chat. Branchez votre
          caméra ou OBS et diffusez en quelques secondes.
        </p>
        <div className="hero-actions">
          <a href="#explorer" className="btn btn-gradient btn-lg">
            <Compass size={18} /> Explorer les directs
          </a>
          <Link href="/carte" className="btn btn-lg">
            <Map size={18} /> Carte en direct
          </Link>
          <Link href="/mosaique" className="btn btn-lg">
            <LayoutGrid size={18} /> Mosaïque
          </Link>
          <Link href={loggedIn ? "/dashboard" : "/login?mode=signup"} className="btn btn-lg">
            <Video size={18} /> Diffuser ma caméra
          </Link>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <strong>{streams.length}</strong>
            <span>caméras</span>
          </div>
          <div className="hero-stat">
            <strong style={{ color: "var(--live)" }}>{liveCount}</strong>
            <span>en direct</span>
          </div>
          <div className="hero-stat">
            <strong>{totalViewers}</strong>
            <span>spectateurs</span>
          </div>
        </div>
      </section>

      <section id="explorer" className="stack-lg" style={{ scrollMarginTop: 90 }}>
        <div className="toolbar between">
          <div className="tabs">
            <button className={cn("tab", tab === "toutes" && "active")} onClick={() => setTab("toutes")}>
              <Compass size={15} /> Toutes <span className="count">{streams.length}</span>
            </button>
            <button className={cn("tab", tab === "direct" && "active")} onClick={() => setTab("direct")}>
              <Radio size={15} /> En direct <span className="count">{liveCount}</span>
            </button>
            <button className={cn("tab", tab === "avenir" && "active")} onClick={() => setTab("avenir")}>
              <CalendarClock size={15} /> À venir <span className="count">{upcomingCount}</span>
            </button>
            {loggedIn && (
              <>
                <button className={cn("tab", tab === "abonnements" && "active")} onClick={() => setTab("abonnements")}>
                  <UserCheck size={15} /> Abonnements <span className="count">{followedCount}</span>
                </button>
                <button className={cn("tab", tab === "favoris" && "active")} onClick={() => setTab("favoris")}>
                  <Heart size={15} /> Favoris <span className="count">{favs.size}</span>
                </button>
              </>
            )}
          </div>

          <div className="row grow" style={{ justifyContent: "flex-end" }}>
            <div className="input-icon search">
              <Search size={16} />
              <input
                className="input"
                placeholder="Rechercher une caméra, une ville, un pseudo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="btn btn-ghost btn-icon btn-sm input-action" onClick={() => setQuery("")} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="input-icon" style={{ width: 210 }}>
              <SlidersHorizontal size={16} />
              <select className="select input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="live">En direct d&apos;abord</option>
                <option value="viewers">Plus regardées</option>
                <option value="favorites">Plus suivies</option>
                <option value="recent">Plus récentes</option>
              </select>
            </div>
          </div>
        </div>

        <div className="chips">
          <button className={cn("chip", !category && "active")} onClick={() => setCategory(null)}>
            Toutes catégories
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={cn("chip", category === c.value && "active")}
              onClick={() => setCategory(category === c.value ? null : c.value)}
            >
              {c.label} <span className="count">{countFor(c.value)}</span>
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="stream-grid">
            {filtered.map((s) => (
              <StreamCard
                key={s.id}
                stream={{ ...s, isFavorite: favs.has(s.id) }}
                viewers={viewers[s.id] ?? 0}
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
          <div className="empty">
            <div className="empty-icon">{tab === "favoris" ? <Heart size={28} /> : <Eye size={28} />}</div>
            <h3>
              {hasFilters
                ? "Aucun résultat"
                : tab === "direct"
                  ? "Personne n'est en direct"
                  : tab === "favoris"
                    ? "Pas encore de favoris"
                    : tab === "abonnements"
                      ? "Aucun abonnement"
                      : tab === "avenir"
                        ? "Aucun direct programmé"
                        : "Aucune caméra pour l'instant"}
            </h3>
            <p>
              {hasFilters
                ? "Essaie d'autres mots-clés ou retire les filtres."
                : tab === "favoris"
                  ? "Clique sur le cœur d'une caméra pour la retrouver ici."
                  : tab === "abonnements"
                    ? "Abonne-toi à des streamers depuis leur profil pour retrouver leurs caméras ici."
                    : tab === "avenir"
                      ? "Les streamers peuvent programmer un direct depuis le Studio."
                      : "Sois le premier à diffuser une caméra !"}
            </p>
            {hasFilters ? (
              <button
                className="btn"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                }}
              >
                Réinitialiser les filtres
              </button>
            ) : (
              <Link href={loggedIn ? "/dashboard" : "/login?mode=signup"} className="btn btn-primary">
                <Video size={16} /> Diffuser ma caméra
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
