"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, Heart, LayoutDashboard, LayoutGrid, LogOut, Map, MessageCircle, Settings, Shield, User } from "lucide-react";
import Avatar from "./Avatar";
import { signOut } from "@/app/login/actions";

export default function UserMenu({ username, email, isAdmin }: { username: string; email?: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const close = () => setOpen(false);

  return (
    <div className="dropdown" ref={ref}>
      <button className="btn btn-ghost" style={{ paddingLeft: 6, paddingRight: 8 }} onClick={() => setOpen((o) => !o)}>
        <Avatar name={username} size={28} />
        <span className="hide-mobile">{username}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="dropdown-menu">
          <div className="row" style={{ padding: "8px 10px 10px", gap: 10 }}>
            <Avatar name={username} size={38} />
            <div className="grow">
              <div style={{ fontWeight: 700 }}>@{username}</div>
              <div className="tiny muted truncate">{email}</div>
            </div>
          </div>
          <div className="dropdown-sep" />
          <Link href={`/u/${username}`} className="dropdown-item" onClick={close}>
            <User size={16} /> Mon profil
          </Link>
          <Link href="/dashboard" className="dropdown-item" onClick={close}>
            <LayoutDashboard size={16} /> Studio (mes caméras)
          </Link>
          <Link href="/messages" className="dropdown-item" onClick={close}>
            <MessageCircle size={16} /> Messages
          </Link>
          <Link href="/?tab=favoris" className="dropdown-item" onClick={close}>
            <Heart size={16} /> Mes favoris
          </Link>
          <Link href="/settings" className="dropdown-item" onClick={close}>
            <Settings size={16} /> Paramètres
          </Link>
          {/* Liens visibles sur mobile (menu principal masqué) */}
          <div className="dropdown-sep" />
          <Link href="/carte" className="dropdown-item" onClick={close}>
            <Map size={16} /> Carte en direct
          </Link>
          <Link href="/mosaique" className="dropdown-item" onClick={close}>
            <LayoutGrid size={16} /> Mosaïque
          </Link>
          <Link href="/events" className="dropdown-item" onClick={close}>
            <CalendarDays size={16} /> Événements
          </Link>
          {isAdmin && (
            <>
              <div className="dropdown-sep" />
              <Link href="/admin" className="dropdown-item" onClick={close}>
                <Shield size={16} /> Administration
              </Link>
            </>
          )}
          <div className="dropdown-sep" />
          <form action={signOut}>
            <button className="dropdown-item danger">
              <LogOut size={16} /> Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
