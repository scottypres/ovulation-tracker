"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Plus, Stethoscope, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
};

const ITEMS: NavItem[] = [
  { href: "/", label: "Today", Icon: Home, match: (p) => p === "/" },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/log", label: "Log", Icon: Plus },
  { href: "/appointments", label: "Visits", Icon: Stethoscope },
  { href: "/more", label: "More", Icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/80 backdrop-blur rounded-t-3xl"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match ? match(pathname) : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-accent" : "bg-transparent",
                  )}
                >
                  <Icon className={cn("size-5", active ? "opacity-100" : "opacity-80")} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
