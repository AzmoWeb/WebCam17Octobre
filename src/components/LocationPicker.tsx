"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, X } from "lucide-react";
import { useUI } from "./UIProvider";

type Point = { lat: number; lng: number } | null;

/** Mini-carte : clic pour placer la caméra, ou bouton « Ma position ». */
export default function LocationPicker({ value, onChange }: { value: Point; onChange: (p: Point) => void }) {
  const { toast } = useUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current).setView(value ? [value.lat, value.lng] : [46.6, 2.4], value ? 14 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      map.on("click", (e) => onChangeRef.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
      mapRef.current = map;
      syncMarker(L, value);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) import("leaflet").then(({ default: L }) => syncMarker(L, value));
  }, [value]);

  function syncMarker(L: typeof import("leaflet"), p: Point) {
    const map = mapRef.current;
    if (!map) return;
    if (!p) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const icon = L.divIcon({ className: "", html: '<span class="map-pin live"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
    if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lng]);
    else markerRef.current = L.marker([p.lat, p.lng], { icon }).addTo(map);
  }

  function locate() {
    if (!navigator.geolocation) return toast("Géolocalisation indisponible.", "error");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        onChange(p);
        mapRef.current?.setView([p.lat, p.lng], 15);
      },
      () => toast("Position refusée ou introuvable.", "error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div ref={containerRef} className="location-picker" />
      <div className="row between">
        <span className="tiny muted">
          {value ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` : "Clique sur la carte pour placer ta caméra."}
        </span>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={locate}>
            <Crosshair size={14} /> Ma position
          </button>
          {value && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(null)}>
              <X size={14} /> Retirer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ~10 m de précision : suffisant, et évite de publier une position trop exacte.
const round = (n: number) => Math.round(n * 10000) / 10000;
