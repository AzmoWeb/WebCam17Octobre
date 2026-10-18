import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="big">404</div>
      <h1 style={{ fontSize: 24 }}>Cette page n&apos;existe pas</h1>
      <p className="muted">La caméra ou le profil a peut-être été supprimé.</p>
      <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
        <Compass size={18} /> Retour à l&apos;accueil
      </Link>
    </div>
  );
}
