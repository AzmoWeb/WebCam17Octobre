"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";

// Erreur inattendue : message générique, aucun détail technique affiché.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-danger/15 text-danger">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-2xl font-extrabold">Une erreur est survenue</h1>
      <p className="max-w-md text-ink-muted">Le problème a été enregistré. Réessaie dans un instant.</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>
          <RotateCcw className="size-4" /> Réessayer
        </Button>
        <Link href="/" className={buttonClass()}>
          Accueil
        </Link>
      </div>
    </div>
  );
}
