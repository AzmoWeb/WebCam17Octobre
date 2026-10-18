"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/** Lecteur des vidéos enregistrées (clips / replays), avec message si l'enregistrement a expiré. */
export default function RecordedVideo({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black sm:rounded-xl">
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-white/5 text-white/80">
            <AlertTriangle className="size-7" />
          </div>
          <strong className="text-lg text-white">Vidéo indisponible</strong>
          <span className="text-sm text-white/70">L&apos;enregistrement a expiré ou n&apos;a pas été conservé.</span>
        </div>
      ) : (
        <video key={src} src={src} controls playsInline autoPlay={autoPlay} className="size-full" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
