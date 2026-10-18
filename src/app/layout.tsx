import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Radio, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { UIProvider } from "@/components/UIProvider";
import ThemeToggle, { themeScript } from "@/components/ThemeToggle";
import NavLinks from "@/components/NavLinks";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "CamManif — caméras en direct", template: "%s · CamManif" },
  description: "Regardez et diffusez des caméras en direct, avec un chat en temps réel.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="fr" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <UIProvider>
          <header className="header">
            <div className="container">
              <Link href="/" className="logo">
                <span className="logo-mark">
                  <Radio size={18} />
                </span>
                CamManif
              </Link>
              <NavLinks loggedIn={!!user} />
              <div className="header-right">
                <ThemeToggle />
                {user ? (
                  <>
                    <Link href="/dashboard" className="btn btn-primary hide-mobile">
                      <Video size={16} /> Diffuser
                    </Link>
                    <UserMenu username={user.username} email={user.email} />
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn btn-ghost">
                      Connexion
                    </Link>
                    <Link href="/login?mode=signup" className="btn btn-primary">
                      S&apos;inscrire
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="page">
            <div className="container">{children}</div>
          </main>

          <footer className="footer">
            <div className="container row between">
              <span>© {new Date().getFullYear()} CamManif — caméras en direct</span>
              <span className="row" style={{ gap: 16 }}>
                <Link href="/">Explorer</Link>
                <Link href="/dashboard">Diffuser</Link>
              </span>
            </div>
          </footer>
        </UIProvider>
      </body>
    </html>
  );
}
