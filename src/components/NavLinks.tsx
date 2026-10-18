"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NavLinks({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Explorer", icon: Compass },
    ...(loggedIn ? [{ href: "/dashboard", label: "Studio", icon: LayoutDashboard }] : []),
  ];

  return (
    <nav className="nav-links">
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={cn("nav-link", pathname === href && "active")}>
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
