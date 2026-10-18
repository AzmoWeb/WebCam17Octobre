"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui";
import { useUI } from "./UIProvider";
import { toggleFavorite } from "@/app/cam/[id]/actions";
import { cn } from "@/lib/utils";

type Props = {
  streamId: string;
  initial: boolean;
  count?: number;
  loggedIn: boolean;
  variant?: "overlay" | "button";
  onChange?: (fav: boolean) => void;
};

export default function FavoriteButton({ streamId, initial, count, loggedIn, variant = "button", onChange }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const [fav, setFav] = useState(initial);
  const [total, setTotal] = useState(count ?? 0);
  const [pending, start] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      toast("Connecte-toi pour ajouter des favoris.", "info");
      return router.push("/login");
    }
    const next = !fav;
    setFav(next); // Affichage immédiat, annulé en cas d'erreur.
    setTotal((t) => t + (next ? 1 : -1));
    start(async () => {
      const res = await toggleFavorite(streamId, next);
      if (!res.ok) {
        setFav(!next);
        setTotal((t) => t + (next ? -1 : 1));
        return toast(res.error, "error");
      }
      onChange?.(next);
    });
  }

  const label = fav ? "Retirer des favoris" : "Ajouter aux favoris";

  if (variant === "overlay") {
    return (
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={label}
        title={label}
        className={cn(
          "grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur transition hover:scale-110",
          fav ? "text-live" : "text-white",
        )}
      >
        <Heart className="size-4" fill={fav ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <Button variant={fav ? "primary" : "secondary"} onClick={toggle} disabled={pending} aria-label={label}>
      <Heart className="size-4" fill={fav ? "currentColor" : "none"} />
      <span className="hidden sm:inline">{fav ? "Favori" : "Favoris"}</span>
      {count !== undefined && <span className="tabular-nums opacity-80">{total}</span>}
    </Button>
  );
}
