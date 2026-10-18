"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui";

type InstallPrompt = Event & { prompt: () => Promise<void> };

/** Enregistre le service worker et propose d'installer l'application (Android / Chrome / Edge). */
export default function PwaRegister() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      try {
        if (localStorage.getItem("pwa-dismissed")) return;
      } catch {}
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[150] flex animate-slide-in items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3 text-sm shadow-2xl sm:right-auto sm:left-5 sm:max-w-sm">
      <Download className="size-5 shrink-0 text-brand-hover" />
      <span className="flex-1">Installer CamManif sur cet appareil ?</span>
      <Button
        size="sm"
        variant="primary"
        onClick={async () => {
          await prompt.prompt();
          setPrompt(null);
        }}
      >
        Installer
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon
        aria-label="Plus tard"
        onClick={() => {
          try {
            localStorage.setItem("pwa-dismissed", "1");
          } catch {}
          setPrompt(null);
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
