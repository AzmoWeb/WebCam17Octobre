"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LayoutGrid, Plus, Search, Share2, Sparkles, Video } from "lucide-react";
import MiniPlayer from "@/components/MiniPlayer";
import { Modal, useUI } from "@/components/UIProvider";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { cn, gradientFor } from "@/lib/utils";

const LAYOUTS = [
  { size: 2, label: "1 × 2", cols: 2 },
  { size: 4, label: "2 × 2", cols: 2 },
  { size: 6, label: "3 × 2", cols: 3 },
  { size: 9, label: "3 × 3", cols: 3 },
];

type Props = { streams: StreamSummary[]; initialIds: string[]; initialSize: number };

export default function MosaicClient({ streams, initialIds, initialSize }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const viewers = useViewerCounts();
  const [size, setSize] = useState(LAYOUTS.some((l) => l.size === initialSize) ? initialSize : 4);
  const [slots, setSlots] = useState<(string | null)[]>(() => fill(initialIds, size));
  const [audioId, setAudioId] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const byId = useMemo(() => new Map(streams.map((s) => [s.id, s])), [streams]);
  const layout = LAYOUTS.find((l) => l.size === size)!;

  // Garde l'URL synchronisée pour pouvoir partager la mosaïque.
  useEffect(() => {
    const ids = slots.filter(Boolean).join(",");
    router.replace(`/mosaique?layout=${size}${ids ? `&cams=${ids}` : ""}`, { scroll: false });
  }, [slots, size, router]);

  function changeLayout(n: number) {
    setSize(n);
    setSlots((prev) => fill(prev.filter((x): x is string => !!x), n));
  }

  function autoFill() {
    const live = streams
      .filter((s) => s.live)
      .sort((a, b) => (viewers[b.id] ?? 0) - (viewers[a.id] ?? 0))
      .map((s) => s.id);
    if (live.length === 0) return toast("Aucune caméra en direct pour le moment.", "info");
    setSlots(fill(live, size));
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast("Lien de la mosaïque copié");
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row between">
        <h1 className="section-title" style={{ fontSize: 24 }}>
          <LayoutGrid size={24} /> Mosaïque
        </h1>
        <div className="row">
          <div className="tabs">
            {LAYOUTS.map((l) => (
              <button key={l.size} className={cn("tab", size === l.size && "active")} onClick={() => changeLayout(l.size)}>
                {l.label}
              </button>
            ))}
          </div>
          <button className="btn" onClick={autoFill}>
            <Sparkles size={16} /> Remplir avec les directs
          </button>
          <button className="btn" onClick={share}>
            <Share2 size={16} /> Partager
          </button>
        </div>
      </div>

      <div className="mosaic" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}>
        {slots.map((id, i) => {
          const s = id ? byId.get(id) : null;
          return s ? (
            <MiniPlayer
              key={`${i}-${s.id}`}
              streamId={s.id}
              title={s.title}
              owner={s.owner}
              initiallyLive={s.live}
              audible={audioId === s.id}
              onToggleAudio={() => setAudioId((a) => (a === s.id ? null : s.id))}
              onRemove={() => setSlots((prev) => prev.map((x, j) => (j === i ? null : x)))}
            />
          ) : (
            <button key={i} className="mosaic-empty" onClick={() => setPicking(i)}>
              <Plus size={28} />
              <span>Ajouter une caméra</span>
            </button>
          );
        })}
      </div>

      <p className="muted small">
        Astuce : un seul flux est audible à la fois — clique sur l&apos;icône du haut-parleur pour choisir lequel.
      </p>

      {picking !== null && (
        <Picker
          streams={streams}
          viewers={viewers}
          exclude={slots}
          onClose={() => setPicking(null)}
          onPick={(id) => {
            setSlots((prev) => prev.map((x, j) => (j === picking ? id : x)));
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function fill(ids: string[], size: number) {
  const out: (string | null)[] = ids.slice(0, size);
  while (out.length < size) out.push(null);
  return out;
}

function Picker({
  streams,
  viewers,
  exclude,
  onPick,
  onClose,
}: {
  streams: StreamSummary[];
  viewers: Record<string, number>;
  exclude: (string | null)[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = streams
    .filter((s) => !exclude.includes(s.id))
    .filter((s) => [s.title, s.owner, s.city].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.live) - Number(a.live));

  return (
    <Modal title="Choisir une caméra" onClose={onClose} maxWidth={520}>
      <div className="modal-body stack">
        <div className="input-icon">
          <Search size={16} />
          <input className="input" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="stack" style={{ gap: 2, maxHeight: 400, overflowY: "auto" }}>
          {list.length === 0 && <p className="muted small">Aucune caméra disponible.</p>}
          {list.map((s) => (
            <button key={s.id} className="dash-cam map-item" style={{ margin: 0 }} onClick={() => onPick(s.id)}>
              <span className="dash-cam-thumb" style={{ background: gradientFor(s.id) }}>
                <Video size={14} />
              </span>
              <span className="grow" style={{ textAlign: "left", minWidth: 0 }}>
                <span className="truncate" style={{ display: "block", fontWeight: 600 }}>
                  {s.title}
                </span>
                <span className="tiny muted row" style={{ gap: 6 }}>
                  <span className={cn("live-dot", s.live && "on")} />
                  {s.live ? (
                    <>
                      <Eye size={11} /> {viewers[s.id] ?? 0}
                    </>
                  ) : (
                    "Hors ligne"
                  )}{" "}
                  · @{s.owner}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
