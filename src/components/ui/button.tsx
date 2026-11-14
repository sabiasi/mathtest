import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The app's buttons (from shadcn/ui, adjusted: a bit bigger for teachers,
 * colours from our design tokens, and a small "press" effect).
 *
 * `buttonVariants(...)` returns just the CSS classes, so a <Link> can look
 * like a button too:  <Link className={buttonVariants({ variant: "outline" })}>
 * or:                 <Button asChild><Link href="…">…</Link></Button>
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out-soft",
    "motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    "outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // A thin highlight along the top edge and a soft glow on hover.
        default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.2),var(--elevation-sm)] hover:bg-primary-hover hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_8px_22px_-8px_var(--glow)]",
        destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-card text-foreground shadow-xs hover:bg-accent",
        secondary: "bg-secondary text-foreground hover:bg-accent",
        soft: "bg-primary-soft text-brand hover:bg-primary-soft-border/60",
        ghost: "text-soft-foreground hover:bg-accent hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-[15px] pointer-coarse:h-11",
        sm: "h-9 px-3 text-sm pointer-coarse:h-10",
        lg: "h-12 px-6 text-base",
        icon: "size-10 pointer-coarse:size-11",
        "icon-sm": "size-9 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Give the button's look to its only child (e.g. a <Link>) instead of rendering a <button>. */
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      // A plain <button> inside a form would "submit" by default; ours never do.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
