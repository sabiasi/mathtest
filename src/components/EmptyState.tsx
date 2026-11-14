import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A friendly "nothing here yet" box: icon, title, short text and buttons. */
export function EmptyState({
  Icon,
  title,
  text,
  actions,
  className,
}: {
  Icon: LucideIcon;
  title: string;
  text: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-dashed bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      {/* A soft light behind the picture */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] opacity-40 blur-2xl" />
      {/* A small "stack of papers" with the icon on the top sheet */}
      <div className="relative" aria-hidden="true">
        <span className="absolute inset-0 -rotate-12 rounded-2xl border bg-card shadow-xs" />
        <span className="absolute inset-0 rotate-6 rounded-2xl border bg-card shadow-xs" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-brand shadow-sm ring-1 ring-primary-soft-border">
          <Icon className="size-8" />
        </div>
      </div>
      <h2 className="relative mt-6 text-xl font-semibold text-foreground">{title}</h2>
      <p className="relative mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{text}</p>
      {actions && <div className="relative mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
