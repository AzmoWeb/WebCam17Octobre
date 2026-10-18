import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Vérifie le secret partagé avec MediaMTX (?secret=… dans l'URL des hooks), en temps constant. */
export function hookSecretValid(request: Request) {
  const expected = process.env.MEDIAMTX_HOOK_SECRET;
  const given = new URL(request.url).searchParams.get("secret") ?? "";
  if (!expected || expected.length < 16) return false; // Secret absent ou trop faible : tout est refusé.
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
