import { cn } from "@/lib/utils";

/** A grey placeholder shape that gently pulses while something loads. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}

export { Skeleton };
