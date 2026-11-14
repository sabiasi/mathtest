"use client";

/**
 * Pieces shared by the sign-in, sign-up and password pages: the card
 * layout, a password box with a show/hide eye, the Google button, and
 * the coloured message boxes.
 */
import { PageBackdrop } from "@/components/PageBackdrop";
import { CircleAlert, CircleCheck, CloudUpload, Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { useId, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { guestTestCount } from "@/lib/onboarding";
import { supabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

const noSubscription = () => () => {};

/** "The tests you made on this device will move into your account" — only if there are some. */
function GuestTestsNote() {
  const t = useT();
  const count = useSyncExternalStore(noSubscription, guestTestCount, () => 0);
  if (count === 0) return null;
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary-soft/60 px-3 py-2.5 text-left text-sm text-soft-foreground" data-guest-note="">
      <CloudUpload className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
      {t("guest.willMove", { count })}
    </p>
  );
}

/** The centred card every auth page uses. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  guestNote = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Mention that a guest's tests will move into the account (sign-in / sign-up). */
  guestNote?: boolean;
}) {
  const t = useT();
  return (
    <div className="relative flex min-h-[calc(100vh-7.5rem)] items-start justify-center overflow-x-clip px-4 py-10 sm:items-center sm:py-16">
      <PageBackdrop grid />
      <PageTransition className="w-full max-w-[26rem]">
        <div className="rounded-2xl border bg-card p-6 shadow-[var(--elevation-lg),0_30px_60px_-30px_var(--glow)] sm:p-8">
          <div className="flex flex-col items-center text-center">
            <LogoMark className="size-11" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
          {guestNote && supabaseConfigured && <GuestTestsNote />}
          <div className="mt-7">{supabaseConfigured ? children : <SetupNotice />}</div>
        </div>
        {footer && <div className="mt-5 text-center text-[15px] text-muted-foreground">{footer}</div>}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" />
          {t("auth.privacyNote")}
        </p>
      </PageTransition>
    </div>
  );
}

/** Shown until .env.local is filled in. */
export function SetupNotice() {
  const t = useT();
  return (
    <Message tone="warning">
      <strong className="block">{t("setup.title")}</strong>
      {t("setup.text")}
    </Message>
  );
}

/** A coloured box for errors ("error"), success ("success") or warnings. */
export function Message({ tone, children }: { tone: "error" | "success" | "warning"; children: ReactNode }) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-xl border px-3.5 py-3 text-[15px] leading-snug",
        tone === "error" && "border-destructive/30 bg-destructive-soft text-destructive-text",
        tone === "success" && "border-success-border/50 bg-success-soft text-success-text",
        tone === "warning" && "border-warning-border bg-warning-soft text-warning-text",
      )}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** A labelled text box with an optional error underneath. */
export function TextField({
  label,
  hint,
  error,
  ...props
}: ComponentProps<typeof Input> & { label: string; hint?: string; error?: string | null }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>
        <FieldLabel hint={hint}>{label}</FieldLabel>
      </label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="h-11" {...props} />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** A password box with an eye button to show what was typed. */
export function PasswordField({
  label,
  hint,
  error,
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & { label: string; hint?: string; error?: string | null }) {
  const t = useT();
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id}>
        <FieldLabel hint={hint}>{label}</FieldLabel>
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={t(visible ? "auth.hidePassword" : "auth.showPassword")}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** The main button of a form, with a spinner while working. */
export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  const t = useT();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={busy}>
      {busy && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
      {busy ? t("auth.working") : children}
    </Button>
  );
}

/** "──── or ────" */
export function OrDivider() {
  const t = useT();
  return (
    <div className="my-5 flex items-center gap-3 text-sm text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {t("auth.or")}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** "Continue with Google", with Google's own "G" mark (as Google's guidelines ask). */
export function GoogleButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  const t = useT();
  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onClick} disabled={busy}>
      {busy ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
      )}
      {t("auth.google")}
    </Button>
  );
}

/** The address Supabase sends people back to after a link or Google. */
export function callbackUrl(params: Record<string, string>) {
  return `${window.location.origin}/auth/callback?${new URLSearchParams(params)}`;
}
