"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/** Lecteur pour les vidéos enregistrées (clips / replays), avec message si l'enregistrement a expiré. */
export default function RecordedVideo({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="player">
      {failed ? (
        <div className="player-offline">
          <div className="offline-icon">
            <AlertTriangle size={30} />
          </div>
          <strong style={{ fontSize: 18, color: "#fff" }}>Vidéo indisponible</strong>
          <span className="small">L&apos;enregistrement a expiré ou n&apos;a pas été conservé par le serveur.</span>
        </div>
      ) : (
        <video key={src} src={src} controls playsInline autoPlay={autoPlay} onError={() => setFailed(true)} />
      )}
    </div>
  );
}
