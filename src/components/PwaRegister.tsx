"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

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
    <div className="toast" style={{ position: "fixed", left: 20, bottom: 20, zIndex: 150 }}>
      <Download size={18} style={{ color: "var(--accent)" }} />
      <span className="grow">Installer CamManif sur cet appareil ?</span>
      <button
        className="btn btn-primary btn-sm"
        onClick={async () => {
          await prompt.prompt();
          setPrompt(null);
        }}
      >
        Installer
      </button>
      <button
        className="btn btn-ghost btn-icon btn-sm"
        aria-label="Plus tard"
        onClick={() => {
          try {
            localStorage.setItem("pwa-dismissed", "1");
          } catch {}
          setPrompt(null);
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
