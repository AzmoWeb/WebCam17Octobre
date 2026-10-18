import "server-only";
import { headers } from "next/headers";
import { admin } from "@/lib/supabase/admin";

/** Adresse IP du client (fournie par le reverse proxy en production). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/**
 * Limitation de débit stockée en base (fonctionne avec plusieurs instances du serveur).
 * Renvoie true si l'action est autorisée. En cas de panne de la base, on refuse par prudence.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit indisponible :", error.message);
    return false;
  }
  return data === true;
}

export const RATE_LIMITED = "Trop de tentatives, réessaie dans quelques minutes.";
