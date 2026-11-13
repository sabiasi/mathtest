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
        "flex flex-col items-center rounded-2xl border-2 border-dashed bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-brand shadow-xs ring-1 ring-primary-soft-border">
        <Icon className="size-8" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{text}</p>
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
