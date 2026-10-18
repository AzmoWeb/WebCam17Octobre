import "server-only";

// Adresses internes de MediaMTX (doivent rester sur 127.0.0.1, jamais exposées).
const API = process.env.MEDIAMTX_API_URL ?? "http://127.0.0.1:9997";
const PLAYBACK = process.env.MEDIAMTX_PLAYBACK_URL ?? "http://127.0.0.1:9996";
export const HLS_URL = process.env.MEDIAMTX_HLS_URL ?? "http://127.0.0.1:8888";

/**
 * Chemin MediaMTX d'une caméra : live/<id>. La clé secrète n'apparaît pas dans le chemin :
 * elle est passée en paramètre (?key=…) à la publication et vérifiée par /api/mediamtx/auth.
 * La lecture directe de ce chemin est réservée au serveur (127.0.0.1).
 */
export const streamPath = (streamId: string) => `live/${streamId}`;

/** Qualités réduites générées à la demande (voir mediamtx.yml). */
export const QUALITIES = ["720", "480"] as const;

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

/** Ids des caméras actuellement en direct. */
export async function getLiveStreamIds(): Promise<Set<string>> {
  const paths = await getLivePaths();
  return new Set([...paths].filter((p) => /^live\/[0-9a-f-]{36}$/.test(p)).map((p) => p.slice(5)));
}

export async function isStreamLive(streamId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/v3/paths/get/${streamPath(streamId)}`, { cache: "no-store" });
    if (!res.ok) return false;
    return ((await res.json()) as { ready: boolean }).ready;
  } catch {
    return false;
  }
}

const KICK_ENDPOINTS: Record<string, string> = {
  rtmpConn: "rtmpconns",
  rtmpsConn: "rtmpsconns",
  rtspSession: "rtspsessions",
  rtspsSession: "rtspssessions",
  srtConn: "srtconns",
  webRTCSession: "webrtcsessions",
};

/** Coupe la connexion de la caméra qui publie (utilisé par l'admin). */
export async function kickPublisher(streamId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/v3/paths/get/${streamPath(streamId)}`, { cache: "no-store" });
    if (!res.ok) return false;
    const { source } = (await res.json()) as { source: { type: string; id: string } | null };
    const endpoint = source && KICK_ENDPOINTS[source.type];
    if (!endpoint) return false;
    const kick = await fetch(`${API}/v3/${endpoint}/kick/${source.id}`, { method: "POST" });
    return kick.ok;
  } catch {
    return false;
  }
}

/** Extrait enregistré (serveur playback de MediaMTX) au format MP4. */
export async function fetchRecording(streamId: string, start: Date, durationSeconds: number, signal?: AbortSignal) {
  const url = new URL(`${PLAYBACK}/get`);
  url.searchParams.set("path", streamPath(streamId));
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("duration", String(Math.max(1, Math.round(durationSeconds))));
  url.searchParams.set("format", "mp4");
  try {
    const res = await fetch(url, { cache: "no-store", signal });
    return res.ok && res.body ? res : null;
  } catch {
    return null;
  }
}
