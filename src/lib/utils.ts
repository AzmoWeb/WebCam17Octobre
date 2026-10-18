export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Couleur stable dérivée d'une chaîne (pseudos, avatars). */
export const colorFor = (s: string) => `hsl(${hash(s) % 360} 70% 62%)`;

/** Dégradé stable pour les vignettes de caméra. */
export function gradientFor(s: string) {
  const h = hash(s) % 360;
  return `linear-gradient(135deg, hsl(${h} 65% 38%), hsl(${(h + 55) % 360} 70% 22%))`;
}

export const CATEGORIES = [
  { value: "manifestation", label: "Manifestation" },
  { value: "evenement", label: "Événement" },
  { value: "ville", label: "Ville" },
  { value: "nature", label: "Nature" },
  { value: "sport", label: "Sport" },
  { value: "autre", label: "Autre" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? "Autre";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function timeAgo(date: string | Date) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, s] of units) {
    if (Math.abs(seconds) >= s) return rtf.format(Math.round(seconds / s), unit);
  }
  return "à l'instant";
}

export const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** 3725 -> "1 h 02 min", 95 -> "1 min 35 s". */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m) return `${m} min ${String(s % 60).padStart(2, "0")} s`;
  return `${s} s`;
}

/** Durée en secondes entre deux dates (fin = maintenant si absente). */
export const secondsBetween = (start: string, end?: string | null) =>
  ((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 1000;

/** Message lisible pour les erreurs levées par les triggers anti-spam. */
export function friendlyDbError(message?: string) {
  if (!message) return "Action impossible, réessaie.";
  const m = /(?:rate_limit|duplicate): (.*)/.exec(message);
  return m ? m[1] : "Action impossible, réessaie.";
}

export const plural =(n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Résultat standard des server actions. */
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
