"use client";

import { Share2 } from "lucide-react";
import { useUI } from "./UIProvider";

export default function ShareButton({ title, className = "btn" }: { title: string; className?: string }) {
  const { toast } = useUI();

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lien copié dans le presse-papiers");
      }
    } catch {
      // Partage annulé.
    }
  }

  return (
    <button className={className} onClick={share}>
      <Share2 size={16} /> Partager
    </button>
  );
}
