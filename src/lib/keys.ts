import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Hash SHA-256 (hex) d'une clé de stream : seule valeur stockée en base. */
export const hashKey = (key: string) => createHash("sha256").update(key, "utf8").digest("hex");

/** Nouvelle clé aléatoire (192 bits) et son hash. */
export function generateStreamKey() {
  const key = randomBytes(24).toString("hex");
  return { key, hash: hashKey(key) };
}
