"use client";

import { useState } from "react";
import { BookOpen, Camera, Monitor, Smartphone, Terminal } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";

type Tab = "obs" | "ipcam" | "mobile" | "ffmpeg";

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="flex list-none flex-col gap-3.5 [counter-reset:step]">{children}</ol>;
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-ink-muted [counter-increment:step] before:grid before:size-6 before:shrink-0 before:place-items-center before:rounded-full before:bg-brand/15 before:text-xs before:font-extrabold before:text-brand-hover before:content-[counter(step)]">
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-xs break-all text-ink">{children}</code>
);

export default function SetupGuide({ rtmpUrl, streamId }: { rtmpUrl: string; streamId: string }) {
  const [tab, setTab] = useState<Tab>("obs");

  return (
    <Card>
      <CardHeader icon={<BookOpen className="size-[18px]" />} title="Guide de démarrage" />
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <Tabs
          value={tab}
          onChange={setTab}
          className="self-start"
          items={[
            { value: "obs", label: "OBS", icon: <Monitor className="size-4" /> },
            { value: "ipcam", label: "Caméra IP", icon: <Camera className="size-4" /> },
            { value: "mobile", label: "Téléphone", icon: <Smartphone className="size-4" /> },
            { value: "ffmpeg", label: "Test", icon: <Terminal className="size-4" /> },
          ]}
        />

        {tab === "obs" && (
          <Steps>
            <Step>
              OBS → <strong className="text-ink">Paramètres</strong> → <strong className="text-ink">Stream</strong> → Service « Personnalisé ».
            </Step>
            <Step>
              Serveur : <Code>{rtmpUrl}</Code>
            </Step>
            <Step>
              Clé de stream : <Code>{streamId}?key=TA_CLE</Code> (bouton « Copier » ci-dessus).
            </Step>
            <Step>Sortie (mode avancé) : intervalle d&apos;images clés à 1 s pour réduire le délai.</Step>
            <Step>« Commencer le streaming » : le badge En direct apparaît en quelques secondes.</Step>
          </Steps>
        )}
        {tab === "ipcam" && (
          <Steps>
            <Step>Ouvre l&apos;interface web de la caméra (Réseau → RTMP / Diffusion).</Step>
            <Step>Active la diffusion RTMP et colle l&apos;URL complète (avec la clé).</Step>
            <Step>
              Caméra RTSP uniquement : <Code>{rtmpUrl.replace(/^rtmp:\/\/([^/:]+).*/, "rtsp://$1:8554/live")}/{streamId}?key=TA_CLE</Code>
            </Step>
            <Step>Enregistre : la caméra se reconnecte toute seule après une coupure.</Step>
          </Steps>
        )}
        {tab === "mobile" && (
          <Steps>
            <Step>
              Installe une appli RTMP, par exemple <strong className="text-ink">Larix Broadcaster</strong> (gratuite).
            </Step>
            <Step>Nouvelle connexion → colle l&apos;URL complète avec ta clé.</Step>
            <Step>720p à 30 i/s : bon compromis qualité / réseau mobile.</Step>
            <Step>Appuie sur le bouton rouge : tu es en direct.</Step>
          </Steps>
        )}
        {tab === "ffmpeg" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink-muted">Mire de test sans caméra (remplace TA_CLE) :</p>
            <pre className="overflow-x-auto rounded-lg bg-black p-3.5 font-mono text-xs text-ink-muted">
              {`ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \\
  -f lavfi -i sine -c:v libx264 -preset veryfast \\
  -tune zerolatency -g 30 -c:a aac -f flv \\
  "${rtmpUrl}/${streamId}?key=TA_CLE"`}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
}
