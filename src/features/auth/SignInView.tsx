"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { authErrorKey, looksLikeEmail } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/routes";
import { getSupabase } from "@/lib/supabase/client";
import { AuthCard, GoogleButton, Message, OrDivider, PasswordField, SubmitButton, TextField, callbackUrl } from "./AuthParts";

/** /signin?next=/editor/…  (also shows notices like "email confirmed") */
export function SignInView() {
  const t = useT();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const notice = params.get("notice"); // "confirmed"
  const linkError = params.get("error"); // a dictionary key from /auth/callback

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "google" | null>(null);
  const [error, setError] = useState<MessageKey | null>(linkError?.startsWith("authError.") ? (linkError as MessageKey) : null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [resent, setResent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = {
      email: looksLikeEmail(email) ? undefined : t("auth.needEmail"),
      password: password ? undefined : t("auth.needPassword"),
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    setBusy("password");
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(authErrorKey(error));
      setBusy(null);
      return;
    }
    // A full page load, so every part of the app starts fresh as this teacher.
    window.location.assign(next);
  }

  async function handleGoogle() {
    setBusy("google");
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl({ next }) },
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setError(authErrorKey(error));
      setBusy(null);
    }
  }

  async function resendConfirmation() {
    const { error } = await getSupabase().auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl({ flow: "signup" }) },
    });
    if (error) setError(authErrorKey(error));
    else setResent(true);
  }

  return (
    <AuthCard
      guestNote
      title={t("auth.signInTitle")}
      subtitle={t("auth.signInSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href={`/signup${next !== "/tests" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
            {t("auth.signUp")}
          </Link>
        </>
      }
    >
      {/* empty:hidden — the box (and its bottom margin) only exists when there's a message */}
      <div className="mb-4 space-y-4 empty:hidden">
        {notice === "confirmed" && <Message tone="success">{t("auth.emailConfirmed")}</Message>}
        {error && (
          <Message tone="error">
            {t(error)}
            {error === "authError.emailNotConfirmed" && looksLikeEmail(email) && !resent && (
              <button type="button" onClick={resendConfirmation} className="mt-1 block font-semibold underline underline-offset-2">
                {t("auth.resend")}
              </button>
            )}
          </Message>
        )}
        {resent && <Message tone="success">{t("auth.resent")}</Message>}
      </div>

      <GoogleButton onClick={handleGoogle} busy={busy === "google"} />
      <OrDivider />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <div>
          <PasswordField
            label={t("auth.password")}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
              {t("auth.forgot")}
            </Link>
          </div>
        </div>
        <SubmitButton busy={busy === "password"}>{t("auth.signIn")}</SubmitButton>
      </form>
    </AuthCard>
  );
}
