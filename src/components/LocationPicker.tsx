"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useUI } from "./UIProvider";

type Point = { lat: number; lng: number } | null;

// ~10 m de précision : suffisant, et évite de publier une position trop exacte.
const round = (n: number) => Math.round(n * 10000) / 10000;

/** Mini-carte : clic pour placer la caméra, ou bouton « Ma position ». */
export default function LocationPicker({ value, onChange }: { value: Point; onChange: (p: Point) => void }) {
  const { toast } = useUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const v = valueRef.current;
      const map = L.map(containerRef.current).setView(v ? [v.lat, v.lng] : [46.6, 2.4], v ? 14 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      map.on("click", (e) => onChangeRef.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
      mapRef.current = map;
      sync(L, v);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) import("leaflet").then(({ default: L }) => sync(L, value));
  }, [value]);

  function sync(L: typeof import("leaflet"), p: Point) {
    const map = mapRef.current;
    if (!map) return;
    if (!p) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lng]);
    else {
      const icon = L.divIcon({ className: "", html: '<span class="pin-marker"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });
      markerRef.current = L.marker([p.lat, p.lng], { icon }).addTo(map);
    }
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
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="isolate h-56 overflow-hidden rounded-lg border border-line" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-dim">
          {value ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` : "Clique sur la carte pour placer ta caméra."}
        </span>
        <div className="flex gap-2">
          <Button size="sm" onClick={locate}>
            <Crosshair className="size-3.5" /> Ma position
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              <X className="size-3.5" /> Retirer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
