import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare, Radio, ShieldCheck, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import AuthForms from "./AuthForms";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; mode?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { message, mode } = await searchParams;

  const features = [
    { icon: <Radio size={20} />, title: "Diffuse en 1 minute", text: "Une clé privée à coller dans ta caméra ou OBS." },
    { icon: <Zap size={20} />, title: "Faible latence", text: "Le direct arrive en quelques secondes chez les spectateurs." },
    { icon: <MessageSquare size={20} />, title: "Chat en temps réel", text: "Commentaires, réactions et compteur de spectateurs." },
    { icon: <ShieldCheck size={20} />, title: "Modération intégrée", text: "Signalements, suppression et bannissement." },
  ];

  return (
    <div className="card auth-wrap">
      <div className="auth-side">
        <span className="logo">
          <span className="logo-mark" style={{ background: "rgba(255,255,255,0.2)", boxShadow: "none" }}>
            <Radio size={18} />
          </span>
          CamManif
        </span>
        <h2>Filme. Diffuse. Partage.</h2>
        <p>La plateforme simple pour diffuser tes caméras en direct et échanger avec ton public.</p>
        <div className="auth-features">
          {features.map((f) => (
            <div key={f.title} className="auth-feature">
              <span className="icon">{f.icon}</span>
              <div>
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <AuthForms initialMode={mode === "signup" ? "signup" : "login"} message={message} />
    </div>
  );
}
