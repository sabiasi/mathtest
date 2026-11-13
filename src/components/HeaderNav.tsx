"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";

function NavLink({ active }: { active: boolean }) {
  const t = useT();
  return (
    <Link
      href="/tests"
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <LayoutGrid className="size-4" aria-hidden="true" />
      <span className="max-sm:sr-only">{t("home.title")}</span>
    </Link>
  );
}

/** "My tests" in the header, highlighted while you are on that page. */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="ml-1 sm:ml-3">
      <NavLink active={pathname === "/tests"} />
    </nav>
  );
}

/** Shown by the server before the address is known (nothing highlighted). */
export function HeaderNavFallback() {
  return (
    <nav className="ml-1 sm:ml-3">
      <NavLink active={false} />
    </nav>
  );
}
