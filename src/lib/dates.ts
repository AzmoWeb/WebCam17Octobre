/** Convertit une date ISO en valeur pour <input type="datetime-local"> (heure locale). */
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Valeur d'un <input type="datetime-local"> -> date ISO complète (fuseau du navigateur). */
export const fromLocalInput = (local: string) => (local ? new Date(local).toISOString() : "");
