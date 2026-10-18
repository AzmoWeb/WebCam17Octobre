"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryLabel } from "@/lib/utils";

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

/** Carte Leaflet / OpenStreetMap avec un marqueur par caméra (rouge clignotant si en direct). */
const LiveMap = forwardRef<LiveMapHandle, { streams: MapStream[]; height?: number | string }>(function LiveMap(
  { streams, height = "100%" },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const fittedRef = useRef(false);

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
      const map = L.map(containerRef.current, { zoomControl: true }).setView(FRANCE, 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      syncMarkers(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mise à jour des marqueurs quand la liste change.
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then(({ default: L }) => syncMarkers(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams]);

  function syncMarkers(L: typeof import("leaflet")) {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const ids = new Set(streams.map((s) => s.id));

    for (const [id, m] of markers) {
      if (!ids.has(id)) {
        m.remove();
        markers.delete(id);
      }
    }

    for (const s of streams) {
      const icon = L.divIcon({
        className: "",
        html: `<span class="map-pin ${s.live ? "live" : ""}"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12],
      });
      const popup = buildPopup(s);
      const existing = markers.get(s.id);
      if (existing) {
        existing.setLatLng([s.lat, s.lng]).setIcon(icon).setPopupContent(popup).setZIndexOffset(s.live ? 1000 : 0);
      } else {
        markers.set(
          s.id,
          L.marker([s.lat, s.lng], { icon, zIndexOffset: s.live ? 1000 : 0 }).bindPopup(popup).addTo(map),
        );
      }
    }

    if (!fittedRef.current && streams.length > 0) {
      fittedRef.current = true;
      const bounds = L.latLngBounds(streams.map((s) => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.3), { maxZoom: 13 });
    }
  }

  return <div ref={containerRef} className="live-map" style={{ height }} />;
});

// Popup construite en DOM (pas de HTML injecté depuis les données utilisateur).
function buildPopup(s: MapStream) {
  const root = document.createElement("div");
  root.className = "map-popup";
  const status = document.createElement("span");
  status.className = s.live ? "badge badge-live" : "badge badge-offline";
  status.textContent = s.live ? `EN DIRECT · ${s.viewers}` : "Hors ligne";
  const title = document.createElement("strong");
  title.textContent = s.title;
  const meta = document.createElement("span");
  meta.className = "muted small";
  meta.textContent = `@${s.owner} · ${categoryLabel(s.category)}${s.city ? ` · ${s.city}` : ""}`;
  const link = document.createElement("a");
  link.href = `/cam/${s.id}`;
  link.className = "btn btn-primary btn-sm";
  link.textContent = s.live ? "Regarder le direct" : "Voir la caméra";
  root.append(status, title, meta, link);
  return root;
}

export default LiveMap;
