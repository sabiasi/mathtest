"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { MIN_PASSWORD_LENGTH, authErrorKey } from "@/lib/auth/errors";
import { getSupabase } from "@/lib/supabase/client";
import { AuthCard, Message, PasswordField, SubmitButton } from "./AuthParts";
import { useAuth } from "./AuthProvider";

/**
 * /reset-password — choose a new password. Reached from the email link
 * (which signs the teacher in for this purpose) or from Settings.
 */
export function ResetPasswordView() {
  const t = useT();
  const { status } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; repeat?: string }>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = {
      password: password.length >= MIN_PASSWORD_LENGTH ? undefined : t("auth.passwordTooShort", { min: MIN_PASSWORD_LENGTH }),
      repeat: repeat === password ? undefined : t("auth.passwordsDiffer"),
    };
    setFieldErrors(errors);
    if (errors.password || errors.repeat) return;
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authErrorKey(error));
    toast.success(t("auth.passwordSaved"));
    router.push("/tests");
  }

  return (
    <AuthCard title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}>
      {status === "loading" ? (
        <div className="space-y-4">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : status !== "signed-in" ? (
        <div className="space-y-4">
          <Message tone="error">{t("auth.resetNoSession")}</Message>
          <Link href="/forgot-password" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            {t("auth.requestNewLink")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <Message tone="error">{t(error)}</Message>}
          <PasswordField
            label={t("auth.newPassword")}
            hint={t("auth.passwordHint", { min: MIN_PASSWORD_LENGTH })}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <PasswordField
            label={t("auth.confirmPassword")}
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            error={fieldErrors.repeat}
          />
          <SubmitButton busy={busy}>{t("auth.savePassword")}</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
