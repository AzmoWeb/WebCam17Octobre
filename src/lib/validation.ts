import { z } from "zod";
import { cleanLine, cleanText } from "./sanitize";
import { CATEGORIES } from "./utils";

// Schémas Zod partagés par toutes les server actions et routes API.
// Les textes sont nettoyés (cleanLine / cleanText) avant la vérification de longueur.

const line = (max: number) => z.string().max(max * 4).transform(cleanLine).pipe(z.string().max(max));
const text = (max: number) => z.string().max(max * 4).transform(cleanText).pipe(z.string().max(max));
const required = (s: z.ZodType<string>, message: string) => s.pipe(z.string().min(1, message));

export const uuid = z.string().uuid();
export const bigintId = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const username = z.string().regex(/^[A-Za-z0-9_]{3,30}$/, "Pseudo : 3 à 30 caractères (lettres, chiffres ou _).");

/** Champ vide -> null, sinon date ISO valide. */
const optionalDate = z
  .string()
  .max(40)
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Date invalide.")
  .transform((d) => d?.toISOString() ?? null);

const optionalCoord = (limit: number) =>
  z
    .string()
    .max(20)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((n) => n === null || (Number.isFinite(n) && Math.abs(n) <= limit), "Position invalide.");

export const streamSchema = z
  .object({
    title: required(line(100), "Le titre est obligatoire."),
    description: text(1000).default(""),
    category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]]).catch("autre"),
    city: line(80).default(""),
    lat: optionalCoord(90).prefault(""),
    lng: optionalCoord(180).prefault(""),
    scheduled_at: optionalDate.prefault(""),
    event_id: z.union([uuid, z.literal("")]).transform((v) => v || null).prefault(""),
  })
  .transform((s) => (s.lat === null || s.lng === null ? { ...s, lat: null, lng: null } : s));

export const eventSchema = z.object({
  title: required(line(120), "Le titre est obligatoire."),
  description: text(2000).default(""),
  city: line(80).default(""),
  starts_at: optionalDate.pipe(z.string({ message: "La date de début est obligatoire." })),
});

export const commentContent = required(line(500), "Message vide.");
export const messageContent = required(text(2000), "Message vide.");
export const reportReason = line(200).default("");
export const clipSchema = z.object({
  streamId: uuid,
  title: line(100).default(""),
  duration: z.coerce.number().pipe(z.union([z.literal(15), z.literal(30), z.literal(60)])).catch(30),
});
export const bio = text(300);

export const signUpSchema = z.object({
  username,
  email: z.string().trim().toLowerCase().email("E-mail invalide.").max(254),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères.").max(128),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const passwordSchema = z
  .object({ password: z.string().min(8, "8 caractères minimum.").max(128), confirm: z.string().max(128) })
  .refine((v) => v.password === v.confirm, { message: "Les mots de passe ne correspondent pas." });

/** FormData -> objet simple (chaînes uniquement) pour la validation Zod. */
export function formObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** Premier message d'erreur lisible d'une validation Zod. */
export const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Données invalides.";
