"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { authErrorKey, looksLikeEmail } from "@/lib/auth/errors";
import { getSupabase } from "@/lib/supabase/client";
import { AuthCard, Message, SubmitButton, TextField, callbackUrl } from "./AuthParts";

/** /forgot-password — sends a link to set a new password. */
export function ForgotPasswordView() {
  const t = useT();
  const params = useSearchParams();
  const linkError = params.get("error");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(linkError?.startsWith("authError.") ? (linkError as MessageKey) : null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!looksLikeEmail(email)) return setFieldError(t("auth.needEmail"));
    setFieldError(null);
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl({ flow: "recovery", next: "/reset-password" }),
    });
    setBusy(false);
    if (error) setError(authErrorKey(error));
    else setSentTo(email.trim());
  }

  const back = (
    <Link href="/signin" className="font-semibold text-brand hover:underline">
      {t("auth.backToSignIn")}
    </Link>
  );

  if (sentTo) {
    return (
      <AuthCard title={t("auth.resetSentTitle")} footer={back}>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-brand">
            <MailCheck className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[15px] leading-relaxed text-soft-foreground">{t("auth.resetSentText", { email: sentTo })}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t("auth.checkSpam")}</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")} footer={back}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Message tone="error">{t(error)}</Message>}
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
        />
        <SubmitButton busy={busy}>{t("auth.sendLink")}</SubmitButton>
      </form>
    </AuthCard>
  );
}
