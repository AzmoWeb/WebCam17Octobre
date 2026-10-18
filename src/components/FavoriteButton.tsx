"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUI } from "./UIProvider";
import { cn } from "@/lib/utils";

type Props = {
  streamId: string;
  initial: boolean;
  count?: number;
  loggedIn: boolean;
  variant?: "overlay" | "button";
  onChange?: (fav: boolean) => void;
};

export default function FavoriteButton({ streamId, initial, count = 0, loggedIn, variant = "button", onChange }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const [fav, setFav] = useState(initial);
  const [total, setTotal] = useState(count);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      toast("Connecte-toi pour ajouter des favoris.", "info");
      router.push("/login");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const next = !fav;
    const { error } = next
      ? await supabase.from("favorites").insert({ stream_id: streamId })
      : await supabase.from("favorites").delete().eq("stream_id", streamId);
    setBusy(false);
    if (error) return toast("Impossible de modifier les favoris.", "error");
    setFav(next);
    setTotal((t) => t + (next ? 1 : -1));
    onChange?.(next);
    toast(next ? "Ajoutée à tes favoris" : "Retirée de tes favoris", next ? "success" : "info");
  }

  if (variant === "overlay") {
    return (
      <button
        className={cn("fav-btn", fav && "on")}
        onClick={toggle}
        disabled={busy}
        aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
        title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart size={16} />
      </button>
    );
  }

  return (
    <button className={cn("btn", fav && "active")} onClick={toggle} disabled={busy}>
      <Heart size={16} fill={fav ? "currentColor" : "none"} />
      {fav ? "Favori" : "Ajouter aux favoris"}
      <span className="badge" style={{ height: 20 }}>
        {total}
      </span>
    </button>
  );
}
