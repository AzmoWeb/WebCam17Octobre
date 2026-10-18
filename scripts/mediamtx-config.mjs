// Génère mediamtx/mediamtx.yml à partir de mediamtx/mediamtx.example.yml
// en y injectant MEDIAMTX_HOOK_SECRET (lu dans .env.local ou l'environnement).
// Usage : npm run mediamtx:config
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const secret = process.env.MEDIAMTX_HOOK_SECRET ?? readEnvFile(join(root, ".env.local")).MEDIAMTX_HOOK_SECRET;
if (!secret || secret.length < 16 || !/^[A-Za-z0-9_-]+$/.test(secret)) {
  console.error(
    "MEDIAMTX_HOOK_SECRET manquant ou invalide dans .env.local (16 caractères minimum, lettres/chiffres/-/_).\n" +
      "Génère-en un avec : node -e \"console.log(require('crypto').randomBytes(24).toString('hex'))\"",
  );
  process.exit(1);
}

const template = readFileSync(join(root, "mediamtx", "mediamtx.example.yml"), "utf8");
writeFileSync(join(root, "mediamtx", "mediamtx.yml"), template.replaceAll("__HOOK_SECRET__", secret));
console.log("mediamtx/mediamtx.yml généré.");
