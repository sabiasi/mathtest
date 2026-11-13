"use client";

/**
 * Toasts: short messages that slide in at the bottom ("ტესტი შენახულია")
 * and disappear by themselves. Show one with:
 *   import { toast } from "sonner";
 *   toast.success("…")   or   toast("…", { action: { label: "Undo", onClick } })
 */
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      className="toaster group print:hidden"
      icons={{
        success: <CircleCheck className="size-5 text-success" />,
        info: <Info className="size-5 text-brand" />,
        warning: <TriangleAlert className="size-5 text-warning-text" />,
        error: <OctagonX className="size-5 text-destructive" />,
        loading: <LoaderCircle className="size-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "font-sans! text-[15px]! shadow-lg! gap-3!",
          actionButton: "bg-primary! text-primary-foreground! font-semibold! rounded-md! px-3! h-8!",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) + 2px)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
