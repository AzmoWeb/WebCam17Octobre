import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MessageSquare, Radio, ShieldCheck, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import AuthForms from "./AuthForms";

export const metadata: Metadata = { title: "Connexion" };

const FEATURES = [
  { icon: Radio, title: "Diffuse en 1 minute", text: "Une clé privée à coller dans ta caméra ou OBS." },
  { icon: Zap, title: "Faible latence", text: "Le direct arrive en quelques secondes." },
  { icon: MessageSquare, title: "Chat en temps réel", text: "Commentaires, réactions, spectateurs." },
  { icon: ShieldCheck, title: "Modération intégrée", text: "Signalements, suppression, bannissement." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; mode?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { message, mode } = await searchParams;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-line bg-panel md:grid-cols-2">
      <div className="relative hidden flex-col gap-8 overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-[#5c16c5] p-10 text-white md:flex">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl" />
        <span className="relative flex items-center gap-2 text-lg font-extrabold">
          <span className="grid size-9 place-items-center rounded-lg bg-white/20">
            <Radio className="size-5" />
          </span>
          CamManif
        </span>
        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight">Filme. Diffuse. Partage.</h2>
          <p className="mt-2 text-white/80">La plateforme simple pour diffuser tes caméras en direct.</p>
        </div>
        <ul className="relative flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
                <Icon className="size-5" />
              </span>
              <span>
                <strong className="block">{title}</strong>
                <span className="text-sm text-white/75">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <AuthForms initialMode={mode === "signup" ? "signup" : "login"} message={message?.slice(0, 200)} nonce={nonce} />
    </div>
  );
}
