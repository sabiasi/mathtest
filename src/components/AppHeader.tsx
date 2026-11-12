import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoMark } from "./Logo";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg text-lg font-bold text-slate-900">
          <LogoMark />
          MathTest
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
