"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryLabel, cn } from "@/lib/utils";

export type MapStream = {
  id: string;
  title: string;
  owner: string;
  category: string;
  city: string;
  lat: number;
  lng: number;
  live: boolean;
  viewers: number;
};

export type LiveMapHandle = { focus: (id: string) => void };

const FRANCE: [number, number] = [46.6, 2.4];

// Icône « caméra » (tracé Lucide « video »), constante : aucune donnée utilisateur dans ce HTML.
const CAMERA_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>';

/** Carte Leaflet / OpenStreetMap (sans clé d'API) : un marqueur caméra par stream à sa position. */
const LiveMap = forwardRef<LiveMapHandle, { streams: MapStream[]; className?: string }>(function LiveMap({ streams, className }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const fittedRef = useRef(false);
  const streamsRef = useRef(streams);
  streamsRef.current = streams;

  useImperativeHandle(ref, () => ({
    focus(id) {
      const marker = markersRef.current.get(id);
      if (!marker || !mapRef.current) return;
      mapRef.current.flyTo(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 14), { duration: 0.8 });
      marker.openPopup();
    },
  }));

  // Création de la carte (Leaflet ne fonctionne que dans le navigateur).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, worldCopyJump: true }).setView(FRANCE, 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      sync();
    })();
    const markers = markersRef.current;
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => sync(), [streams]);

  function sync() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const list = streamsRef.current;
    const markers = markersRef.current;
    const ids = new Set(list.map((s) => s.id));

    for (const [id, m] of markers) {
      if (!ids.has(id)) {
        m.remove();
        markers.delete(id);
      }
    }

    for (const s of list) {
      const icon = L.divIcon({
        className: "",
        html: `<span class="cam-marker ${s.live ? "is-live" : "is-offline"}">${CAMERA_SVG}</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });
      const popup = buildPopup(s);
      const existing = markers.get(s.id);
      if (existing) {
        existing.setLatLng([s.lat, s.lng]).setIcon(icon).setPopupContent(popup).setZIndexOffset(s.live ? 1000 : 0);
      } else {
        const marker = L.marker([s.lat, s.lng], { icon, zIndexOffset: s.live ? 1000 : 0, title: s.title, alt: s.title }).bindPopup(popup);
        markers.set(s.id, marker.addTo(map));
      }
    }

    if (!fittedRef.current && list.length > 0) {
      fittedRef.current = true;
      map.fitBounds(L.latLngBounds(list.map((s) => [s.lat, s.lng] as [number, number])).pad(0.3), { maxZoom: 13 });
    }
  }

  // `isolate` : les calques Leaflet (z-index 400+) restent sous l'en-tête et les menus.
  return <div ref={containerRef} className={cn("isolate", className)} role="region" aria-label="Carte des caméras" />;
});

// Aperçu construit en DOM avec textContent : les titres et pseudos ne sont jamais interprétés comme du HTML.
function buildPopup(s: MapStream) {
  const el = (tag: string, cls: string, text?: string) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = el("div", "flex w-56 flex-col gap-2");
  const preview = el("div", "relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-dark to-canvas text-white/80");
  preview.append(el("span", "text-xs font-semibold", s.live ? "Aperçu en direct" : "Hors ligne"));
  const badge = el(
    "span",
    `absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${s.live ? "bg-live text-white" : "bg-black/60 text-white"}`,
    s.live ? `● Live · ${s.viewers} spectateur${s.viewers > 1 ? "s" : ""}` : "Hors ligne",
  );
  preview.append(badge);
  const title = el("strong", "text-sm leading-snug text-ink", s.title);
  const meta = el("span", "text-xs text-ink-dim", `${s.owner} · ${categoryLabel(s.category)}${s.city ? ` · ${s.city}` : ""}`);
  const link = el(
    "a",
    "inline-flex h-8 items-center justify-center rounded-md bg-brand px-3 text-[13px] font-semibold text-white! hover:bg-brand-hover",
    s.live ? "Regarder le direct" : "Voir la caméra",
  ) as HTMLAnchorElement;
  link.href = `/cam/${encodeURIComponent(s.id)}`;
  root.append(preview, title, meta, link);
  return root;
}

export default LiveMap;
