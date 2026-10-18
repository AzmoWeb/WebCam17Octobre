import "server-only";

const API = process.env.MEDIAMTX_API_URL ?? "http://127.0.0.1:9997";
const PLAYBACK = process.env.MEDIAMTX_PLAYBACK_URL ?? "http://127.0.0.1:9996";
export const HLS_URL = process.env.MEDIAMTX_HLS_URL ?? "http://127.0.0.1:8888";

/** Chemin MediaMTX sur lequel une caméra publie : live/<clé>. */
export const publishPath = (key: string) => `live/${key}`;

/** Qualités réduites générées à la demande (voir mediamtx.yml). */
export const QUALITIES = ["720", "480"] as const;
export type Quality = (typeof QUALITIES)[number];

/** Ensemble des chemins qui reçoivent actuellement un flux. */
export async function getLivePaths(): Promise<Set<string>> {
  try {
    const res = await fetch(`${API}/v3/paths/list?itemsPerPage=1000`, { cache: "no-store" });
    if (!res.ok) return new Set();
    const json = (await res.json()) as { items: { name: string; ready: boolean }[] };
    return new Set(json.items.filter((p) => p.ready).map((p) => p.name));
  } catch {
    return new Set(); // MediaMTX éteint : tout est hors ligne.
  }
}

export async function isPathLive(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/v3/paths/get/${path}`, { cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json()) as { ready: boolean };
    return json.ready;
  } catch {
    return false;
  }
}

/**
 * Récupère un extrait enregistré (serveur playback de MediaMTX) en essayant
 * chaque clé connue de la caméra (la clé a pu être régénérée depuis).
 */
export async function fetchRecording(keys: string[], start: Date, durationSeconds: number, signal?: AbortSignal) {
  for (const key of keys) {
    const url = new URL(`${PLAYBACK}/get`);
    url.searchParams.set("path", publishPath(key));
    url.searchParams.set("start", start.toISOString());
    url.searchParams.set("duration", String(Math.max(1, Math.round(durationSeconds))));
    url.searchParams.set("format", "mp4");
    try {
      const res = await fetch(url, { cache: "no-store", signal });
      if (res.ok && res.body) return res;
    } catch {
      // Essaie la clé suivante.
    }
  }
  return null;
}
