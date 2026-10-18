"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LayoutGrid, Plus, Search, Share2, Sparkles, Video } from "lucide-react";
import MiniPlayer from "@/components/MiniPlayer";
import { Modal, useUI } from "@/components/UIProvider";
import { Button, Input, LiveDot, PageTitle } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { cn, gradientFor } from "@/lib/utils";

const LAYOUTS = { "2": "sm:grid-cols-2", "4": "sm:grid-cols-2", "6": "sm:grid-cols-2 lg:grid-cols-3", "9": "sm:grid-cols-2 lg:grid-cols-3" } as const;
type Layout = keyof typeof LAYOUTS;

export default function MosaicClient({ streams, initialIds, initialSize }: { streams: StreamSummary[]; initialIds: string[]; initialSize: number }) {
  const router = useRouter();
  const { toast } = useUI();
  const viewers = useViewerCounts();
  const [size, setSize] = useState<Layout>(String(initialSize) in LAYOUTS ? (String(initialSize) as Layout) : "4");
  const [slots, setSlots] = useState<(string | null)[]>(() => fill(initialIds, Number(size)));
  const [audioId, setAudioId] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const byId = useMemo(() => new Map(streams.map((s) => [s.id, s])), [streams]);

  // URL synchronisée pour partager la mosaïque.
  useEffect(() => {
    const ids = slots.filter(Boolean).join(",");
    router.replace(`/mosaique?layout=${size}${ids ? `&cams=${ids}` : ""}`, { scroll: false });
  }, [slots, size, router]);

  function changeLayout(n: Layout) {
    setSize(n);
    setSlots((prev) => fill(prev.filter((x): x is string => !!x), Number(n)));
  }

  function autoFill() {
    const live = streams.filter((s) => s.live).sort((a, b) => (viewers[b.id] ?? 0) - (viewers[a.id] ?? 0)).map((s) => s.id);
    if (!live.length) return toast("Aucune caméra en direct pour le moment.", "info");
    setSlots(fill(live, Number(size)));
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast("Lien de la mosaïque copié");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        icon={<LayoutGrid className="size-7" />}
        title="Mosaïque"
        subtitle="Plusieurs caméras sur un même écran. Un seul flux est audible à la fois."
        actions={
          <>
            <Tabs
              value={size}
              onChange={changeLayout}
              items={[
                { value: "2", label: "1×2" },
                { value: "4", label: "2×2" },
                { value: "6", label: "3×2" },
                { value: "9", label: "3×3" },
              ]}
            />
            <Button onClick={autoFill}>
              <Sparkles className="size-4" /> Directs
            </Button>
            <Button onClick={share} icon aria-label="Partager">
              <Share2 className="size-4" />
            </Button>
          </>
        }
      />

      <div className={cn("grid grid-cols-1 gap-2.5", LAYOUTS[size])}>
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
            <button
              key={i}
              onClick={() => setPicking(i)}
              className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-panel font-semibold text-ink-dim transition hover:border-brand hover:text-brand-hover"
            >
              <Plus className="size-7" /> Ajouter une caméra
            </button>
          );
        })}
      </div>

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
    .filter((s) => !exclude.includes(s.id) && [s.title, s.owner, s.city].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.live) - Number(a.live));

  return (
    <Modal title="Choisir une caméra" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-dim" />
          <Input className="pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {list.length === 0 && <li className="p-2 text-sm text-ink-dim">Aucune caméra disponible.</li>}
          {list.map((s) => (
            <li key={s.id}>
              <button onClick={() => onPick(s.id)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-panel-2">
                <span className="grid h-8 w-12 shrink-0 place-items-center rounded-md text-white/85" style={{ background: gradientFor(s.id) }}>
                  <Video className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.title}</span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-dim">
                    <LiveDot on={s.live} />
                    {s.live ? (
                      <>
                        <Eye className="size-3" /> {viewers[s.id] ?? 0}
                      </>
                    ) : (
                      "Hors ligne"
                    )}{" "}
                    · {s.owner}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
