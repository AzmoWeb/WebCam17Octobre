"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useUI } from "./UIProvider";

export default function ShareButton({ title }: { title: string }) {
  const { toast } = useUI();

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lien copié");
      }
    } catch {}
  }

  return (
    <Button onClick={share}>
      <Share2 className="size-4" /> Partager
    </Button>
  );
}
