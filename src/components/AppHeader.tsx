import Link from "next/link";
import { Suspense } from "react";
import { HeaderNav, HeaderNavFallback } from "./HeaderNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoMark } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { HeaderAccount } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="glass relative z-30 border-b print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          href="/about"
          className="flex items-center gap-2.5 rounded-lg text-[17px] font-bold tracking-tight text-foreground"
        >
          <LogoMark className="size-7" />
          MathTest
        </Link>
        {/* The nav reads the current address, which Next.js only knows in the browser. */}
        <Suspense fallback={<HeaderNavFallback />}>
          <HeaderNav />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
