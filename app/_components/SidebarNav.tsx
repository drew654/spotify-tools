"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "Play History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
              isActive
                ? "bg-spotify-green/15 text-spotify-green"
                : "text-zinc-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${isActive ? "text-spotify-green" : "text-zinc-400"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
