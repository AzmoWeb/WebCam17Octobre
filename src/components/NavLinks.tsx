"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, LayoutDashboard, LayoutGrid, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NavLinks({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Explorer", icon: Compass },
    { href: "/carte", label: "Carte", icon: Map },
    { href: "/mosaique", label: "Mosaïque", icon: LayoutGrid },
    { href: "/events", label: "Événements", icon: CalendarDays },
    ...(loggedIn ? [{ href: "/dashboard", label: "Studio", icon: LayoutDashboard }] : []),
  ];

  return (
    <nav className="nav-links">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn("nav-link", (href === "/" ? pathname === "/" : pathname.startsWith(href)) && "active")}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
