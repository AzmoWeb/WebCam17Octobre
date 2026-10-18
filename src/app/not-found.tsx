import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="bg-gradient-to-r from-brand to-brand-hover bg-clip-text text-8xl font-black tracking-tighter text-transparent">404</div>
      <h1 className="text-2xl font-extrabold">Cette page n&apos;existe pas</h1>
      <p className="text-ink-muted">La caméra ou le profil a peut-être été supprimé.</p>
      <Link href="/" className={buttonClass({ variant: "primary", size: "lg", className: "mt-2" })}>
        <Compass className="size-5" /> Retour à l&apos;accueil
      </Link>
    </div>
  );
}
