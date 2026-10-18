import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { getCurrentUser } from "@/lib/supabase/server";
import { UIProvider } from "@/components/UIProvider";
import Header from "@/components/Header";
import PwaRegister from "@/components/PwaRegister";
import { Alert } from "@/components/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "CamManif — caméras en direct", template: "%s · CamManif" },
  description: "Regardez et diffusez des caméras en direct, avec un chat en temps réel.",
  applicationName: "CamManif",
  appleWebApp: { capable: true, title: "CamManif", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: "#0e0e10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="fr" className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <UIProvider>
          <Header
            user={user ? { username: user.username, email: user.email, isAdmin: user.isAdmin, unread: user.unreadMessages } : null}
          />

          <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-5 sm:px-5 sm:py-7">
            {user?.isBanned && (
              <Alert tone="error" className="mb-5">
                Ton compte a été suspendu par un administrateur : tu ne peux plus commenter, diffuser ni envoyer de messages.
              </Alert>
            )}
            {children}
          </main>

          <footer className="border-t border-line py-6 text-[13px] text-ink-dim">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-3 sm:px-5">
              <span>© {new Date().getFullYear()} CamManif — caméras en direct</span>
              <nav className="flex gap-4">
                <Link href="/" className="hover:text-ink">
                  Explorer
                </Link>
                <Link href="/carte" className="hover:text-ink">
                  Carte
                </Link>
                <Link href="/events" className="hover:text-ink">
                  Événements
                </Link>
                <Link href="/dashboard" className="hover:text-ink">
                  Diffuser
                </Link>
              </nav>
            </div>
          </footer>
          <PwaRegister />
        </UIProvider>
      </body>
    </html>
  );
}
