import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { MessageCircle, Radio, ShieldAlert, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { UIProvider } from "@/components/UIProvider";
import ThemeToggle, { themeScript } from "@/components/ThemeToggle";
import NavLinks from "@/components/NavLinks";
import UserMenu from "@/components/UserMenu";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "CamManif — caméras en direct", template: "%s · CamManif" },
  description: "Regardez et diffusez des caméras en direct, avec un chat en temps réel.",
  applicationName: "CamManif",
  appleWebApp: { capable: true, title: "CamManif", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: "#090b10",
  width: "device-width",
  initialScale: 1,
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
                    <Link
                      href="/messages"
                      className="btn btn-ghost btn-icon"
                      style={{ position: "relative" }}
                      aria-label="Messages"
                      title="Messages"
                    >
                      <MessageCircle size={18} />
                      {user.unreadMessages > 0 && (
                        <span className="nav-badge">{user.unreadMessages > 9 ? "9+" : user.unreadMessages}</span>
                      )}
                    </Link>
                    <Link href="/dashboard" className="btn btn-primary hide-mobile">
                      <Video size={16} /> Diffuser
                    </Link>
                    <UserMenu username={user.username} email={user.email} isAdmin={user.isAdmin} />
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
            <div className="container">
              {user?.isBanned && (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                  <ShieldAlert size={18} /> Ton compte a été suspendu par un administrateur : tu ne peux plus commenter,
                  diffuser ni envoyer de messages.
                </div>
              )}
              {children}
            </div>
          </main>
          <PwaRegister />

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
