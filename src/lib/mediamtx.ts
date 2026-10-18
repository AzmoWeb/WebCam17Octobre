import "server-only";

const API = process.env.MEDIAMTX_API_URL ?? "http://127.0.0.1:9997";
export const HLS_URL = process.env.MEDIAMTX_HLS_URL ?? "http://127.0.0.1:8888";

/** Chemin MediaMTX sur lequel une caméra publie : live/<clé>. */
export const publishPath = (key: string) => `live/${key}`;

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
