"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  Radio,
  Settings,
  Shield,
  User,
  Video,
  X,
} from "lucide-react";
import Avatar from "./Avatar";
import { buttonClass } from "@/components/ui";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";

export type HeaderUser = { username: string; email?: string; isAdmin: boolean; unread: number } | null;

const LINKS = [
  { href: "/", label: "Explorer", icon: Compass },
  { href: "/carte", label: "Carte", icon: Map },
  { href: "/mosaique", label: "Mosaïque", icon: LayoutGrid },
  { href: "/events", label: "Événements", icon: CalendarDays },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export default function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-line bg-panel/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-5">
        <button
          className={buttonClass({ variant: "ghost", icon: true, className: "lg:hidden" })}
          onClick={() => setDrawer(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
            <Radio className="size-[18px]" />
          </span>
          <span className="hidden text-lg sm:inline">CamManif</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
                isActive(pathname, href) ? "bg-panel-3 text-ink" : "text-ink-muted hover:bg-panel-2 hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link href="/messages" className={buttonClass({ variant: "ghost", icon: true, className: "relative" })} aria-label="Messages">
                <MessageCircle className="size-5" />
                {user.unread > 0 && (
                  <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-live px-1 text-[10px] font-extrabold text-white">
                    {user.unread > 9 ? "9+" : user.unread}
                  </span>
                )}
              </Link>
              <Link href="/dashboard" className={buttonClass({ variant: "primary", className: "hidden sm:inline-flex" })}>
                <Video className="size-4" /> Diffuser
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass({ variant: "ghost" })}>
                Connexion
              </Link>
              <Link href="/login?mode=signup" className={buttonClass({ variant: "primary" })}>
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Hors du <header> : son backdrop-filter piégerait le positionnement `fixed` du menu. */}
    {drawer && <MobileDrawer user={user} pathname={pathname} onClose={() => setDrawer(false)} />}
    </>
  );
}

function UserMenu({ user }: { user: NonNullable<HeaderUser> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-muted hover:bg-panel-3 hover:text-ink";

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex h-10 items-center gap-1.5 rounded-lg px-1.5 hover:bg-panel-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Menu du compte"
      >
        <Avatar name={user.username} size="sm" />
        <ChevronDown className="hidden size-4 text-ink-muted sm:block" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 animate-pop rounded-xl border border-line bg-panel-2 p-1.5 shadow-2xl">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={user.username} />
            <div className="min-w-0">
              <div className="truncate font-bold">@{user.username}</div>
              <div className="truncate text-xs text-ink-dim">{user.email}</div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href={`/u/${user.username}`} className={item}>
            <User className="size-4" /> Mon profil
          </Link>
          <Link href="/dashboard" className={item}>
            <LayoutDashboard className="size-4" /> Studio
          </Link>
          <Link href="/messages" className={item}>
            <MessageCircle className="size-4" /> Messages
          </Link>
          <Link href="/?tab=favoris" className={item}>
            <Heart className="size-4" /> Favoris
          </Link>
          <Link href="/settings" className={item}>
            <Settings className="size-4" /> Paramètres
          </Link>
          {user.isAdmin && (
            <Link href="/admin" className={item}>
              <Shield className="size-4" /> Administration
            </Link>
          )}
          <div className="my-1 h-px bg-line" />
          <form action={signOut}>
            <button className={cn(item, "hover:bg-danger/15 hover:text-danger")}>
              <LogOut className="size-4" /> Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ user, pathname, onClose }: { user: HeaderUser; pathname: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const links = [
    ...LINKS,
    ...(user
      ? [
          { href: "/dashboard", label: "Studio", icon: LayoutDashboard },
          { href: "/messages", label: "Messages", icon: MessageCircle },
          ...(user.isAdmin ? [{ href: "/admin", label: "Administration", icon: Shield }] : []),
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-[90] lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in flex-col border-r border-line bg-panel p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="flex items-center gap-2 font-extrabold">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
              <Radio className="size-[18px]" />
            </span>
            CamManif
          </span>
          <button className={buttonClass({ variant: "ghost", icon: true, size: "sm" })} onClick={onClose} aria-label="Fermer le menu">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 font-semibold",
                isActive(pathname, href) ? "bg-panel-3 text-ink" : "text-ink-muted hover:bg-panel-2 hover:text-ink",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        {user && (
          <Link href="/dashboard" className={buttonClass({ variant: "primary", block: true, className: "mt-auto" })}>
            <Video className="size-4" /> Diffuser
          </Link>
        )}
      </aside>
    </div>
  );
}
