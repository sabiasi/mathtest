"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { MIN_PASSWORD_LENGTH, authErrorKey, looksLikeEmail } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/routes";
import { getSupabase } from "@/lib/supabase/client";
import { AuthCard, GoogleButton, Message, OrDivider, PasswordField, SubmitButton, TextField, callbackUrl } from "./AuthParts";

/** /signup — create an account, then "check your email". */
export function SignUpView() {
  const t = useT();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = {
      name: name.trim() ? undefined : t("auth.needName"),
      email: looksLikeEmail(email) ? undefined : t("auth.needEmail"),
      password: password.length >= MIN_PASSWORD_LENGTH ? undefined : t("auth.passwordTooShort", { min: MIN_PASSWORD_LENGTH }),
    };
    setFieldErrors(errors);
    if (errors.name || errors.email || errors.password) return;

    setBusy("form");
    setError(null);
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() }, // the database copies this into the profile
        emailRedirectTo: callbackUrl({ flow: "signup", next }),
      },
    });
    setBusy(null);
    if (error) return setError(authErrorKey(error));
    // Supabase doesn't say "this email is taken" openly (so strangers can't
    // test which emails have accounts). An existing account shows up as a
    // user without any sign-in "identities".
    if (data.user && data.user.identities?.length === 0) return setError("authError.alreadyExists");
    // Email confirmation switched off in Supabase: already signed in.
    if (data.session) return window.location.assign(next);
    setSentTo(email.trim());
  }

  async function handleGoogle() {
    setBusy("google");
    const { error } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl({ next }) } });
    if (error) {
      setError(authErrorKey(error));
      setBusy(null);
    }
  }

  async function resend() {
    if (!sentTo) return;
    const { error } = await getSupabase().auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: callbackUrl({ flow: "signup", next }) },
    });
    if (error) setError(authErrorKey(error));
    else setResent(true);
  }

  if (sentTo) {
    return (
      <AuthCard title={t("auth.checkEmailTitle")}>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-brand">
            <MailCheck className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[15px] leading-relaxed text-soft-foreground">{t("auth.checkEmailText", { email: sentTo })}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t("auth.checkSpam")}</p>
          <div className="mt-5 w-full space-y-3">
            {error && <Message tone="error">{t(error)}</Message>}
            {resent && <Message tone="success">{t("auth.resent")}</Message>}
            <Button variant="outline" className="w-full" onClick={resend} disabled={resent}>
              {t("auth.resend")}
            </Button>
            <Link href="/signin" className="block text-sm font-semibold text-brand hover:underline">
              {t("auth.backToSignIn")}
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      guestNote
      title={t("auth.signUpTitle")}
      subtitle={t("auth.signUpSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/signin" className="font-semibold text-brand hover:underline">
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Message tone="error">
            {t(error)}
            {error === "authError.alreadyExists" && (
              <Link href="/signin" className="mt-1 block font-semibold underline underline-offset-2">
                {t("auth.signIn")}
              </Link>
            )}
          </Message>
        </div>
      )}

      <GoogleButton onClick={handleGoogle} busy={busy === "google"} />
      <OrDivider />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          label={t("auth.name")}
          autoComplete="name"
          placeholder={t("auth.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
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
        <PasswordField
          label={t("auth.password")}
          hint={t("auth.passwordHint", { min: MIN_PASSWORD_LENGTH })}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <SubmitButton busy={busy === "form"}>{t("auth.signUp")}</SubmitButton>
      </form>
    </AuthCard>
  );
}
