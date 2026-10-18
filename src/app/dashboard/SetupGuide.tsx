"use client";

import { useState } from "react";
import { BookOpen, Camera, Monitor, Smartphone, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "obs" | "ipcam" | "mobile" | "ffmpeg";

export default function SetupGuide({ rtmpUrl }: { rtmpUrl: string }) {
  const [tab, setTab] = useState<Tab>("obs");
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "obs", label: "OBS Studio", icon: <Monitor size={15} /> },
    { id: "ipcam", label: "Caméra IP", icon: <Camera size={15} /> },
    { id: "mobile", label: "Téléphone", icon: <Smartphone size={15} /> },
    { id: "ffmpeg", label: "Test (ffmpeg)", icon: <Terminal size={15} /> },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <BookOpen size={18} /> Guide de démarrage
        </h3>
      </div>
      <div className="card-body stack" style={{ gap: 18 }}>
        <div className="tabs" style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
          {tabs.map((t) => (
            <button key={t.id} className={cn("tab", tab === t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "obs" && (
          <ol className="steps">
            <li>Ouvre OBS → <strong>Paramètres</strong> → <strong>Stream</strong>.</li>
            <li>
              Service : <strong>Personnalisé…</strong>. Serveur : <code>{rtmpUrl}</code>
            </li>
            <li>Colle ta <strong>clé de stream</strong> (bouton « Copier » ci-dessus) puis valide.</li>
            <li>
              Dans <strong>Sortie</strong> (mode avancé), règle l&apos;<strong>intervalle d&apos;images clés</strong> sur{" "}
              <code>1 s</code> pour réduire le délai.
            </li>
            <li>
              Clique sur <strong>Commencer le streaming</strong> : le badge « En direct » apparaît ici en quelques
              secondes.
            </li>
          </ol>
        )}

        {tab === "ipcam" && (
          <ol className="steps">
            <li>Ouvre l&apos;interface web de ta caméra (souvent dans « Réseau » → « RTMP » ou « Diffusion »).</li>
            <li>Active la diffusion RTMP.</li>
            <li>Colle l&apos;<strong>URL complète</strong> (avec la clé) dans le champ URL / adresse du serveur.</li>
            <li>
              Si ta caméra ne fait que du RTSP en « push », utilise <code>{rtmpUrl.replace(/^rtmp:\/\/([^/:]+).*/, "rtsp://$1:8554/live")}/&lt;clé&gt;</code>.
            </li>
            <li>Enregistre : la caméra se connecte automatiquement, même après une coupure.</li>
          </ol>
        )}

        {tab === "mobile" && (
          <ol className="steps">
            <li>
              Installe une appli de diffusion RTMP, par exemple <strong>Larix Broadcaster</strong> (iOS / Android, gratuite).
            </li>
            <li>Ajoute une connexion et colle l&apos;<strong>URL complète</strong> avec ta clé.</li>
            <li>Choisis une résolution 720p à 30 i/s pour un bon compromis qualité / réseau mobile.</li>
            <li>Appuie sur le bouton d&apos;enregistrement : tu es en direct.</li>
          </ol>
        )}

        {tab === "ffmpeg" && (
          <div className="stack">
            <p className="text-2 small">Envoie une mire de test sans caméra (remplace TA_CLE par ta clé) :</p>
            <div className="code-block">
              {`ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \\
  -f lavfi -i sine -c:v libx264 -preset veryfast \\
  -tune zerolatency -g 30 -c:a aac \\
  -f flv ${rtmpUrl}/TA_CLE`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
