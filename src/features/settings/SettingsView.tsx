"use client";

import { PageBackdrop } from "@/components/PageBackdrop";
import { KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel, SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { PlanSummary } from "@/features/plans/PlanSummary";
import { SubjectPicker } from "@/features/subjects/SubjectPicker";
import { LANGUAGES, LANGUAGE_NAMES, type Language } from "@/i18n/dictionaries";
import { setLanguage, useLanguage, useT } from "@/i18n/language";
import type { Profile, ProfileChanges, ThemeChoice } from "@/lib/auth/profile";
import { DEFAULT_SUBJECT, subjectFromText } from "@/subjects/ids";

/** /settings — name, school, default subject, language, theme; account actions. */
export function SettingsView() {
  const t = useT();
  const { user, profile, updateProfile, signOut } = useAuth();
  const language = useLanguage();
  const { theme, setTheme } = useTheme();

  function changeLanguage(next: Language) {
    setLanguage(next);
    void updateProfile({ language: next });
  }

  function changeTheme(next: ThemeChoice) {
    setTheme(next);
    void updateProfile({ theme: next });
  }

  return (
    <PageTransition className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <PageBackdrop className="h-72 opacity-60" />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("settings.title")}</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">{t("settings.subtitle")}</p>

      <Section title={t("plan.title")} id="plan">
        <PlanSummary />
      </Section>

      <Section title={t("settings.profile")}>
        {!profile ? (
          <div className="space-y-5">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          // key: a fresh form if a different account's profile arrives
          <ProfileForm key={profile.id} profile={profile} email={user?.email ?? ""} onSave={updateProfile} />
        )}
      </Section>

      <Section title={t("settings.preferences")}>
        <div className="space-y-5">
          <div>
            <FieldLabel>{t("settings.language")}</FieldLabel>
            <SegmentedControl<Language>
              label={t("settings.language")}
              value={language}
              onChange={changeLanguage}
              options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
            />
          </div>
          <div>
            <FieldLabel>{t("theme.label")}</FieldLabel>
            <SegmentedControl<ThemeChoice>
              label={t("theme.label")}
              value={(theme as ThemeChoice | undefined) ?? null}
              onChange={changeTheme}
              options={[
                { value: "light", label: <Labelled Icon={Sun}>{t("theme.light")}</Labelled> },
                { value: "dark", label: <Labelled Icon={Moon}>{t("theme.dark")}</Labelled> },
                { value: "system", label: <Labelled Icon={Monitor}>{t("theme.system")}</Labelled> },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title={t("settings.account")}>
        <div className="flex flex-wrap gap-3">
          <Link href="/reset-password" className={buttonVariants({ variant: "outline" })}>
            <KeyRound aria-hidden="true" />
            {t("settings.changePassword")}
          </Link>
          <Button variant="ghost" onClick={() => void signOut()} className="text-destructive-text hover:bg-destructive-soft hover:text-destructive-text">
            <LogOut aria-hidden="true" />
            {t("user.signOut")}
          </Button>
        </div>
      </Section>
    </PageTransition>
  );
}

/** Name, school and subject — saved with the "Save" button. */
function ProfileForm({
  profile,
  email,
  onSave,
}: {
  profile: Profile;
  email: string;
  onSave: (changes: ProfileChanges) => Promise<boolean>;
}) {
  const t = useT();
  // The form starts with the saved values; typing only changes this copy until "Save".
  const [form, setForm] = useState({
    full_name: profile.full_name,
    school_name: profile.school_name,
    // Saved as a subject id ("math"); older profiles may have free text.
    default_subject: subjectFromText(profile.default_subject) ?? DEFAULT_SUBJECT,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const ok = await onSave({
      full_name: form.full_name.trim(),
      school_name: form.school_name.trim(),
      default_subject: form.default_subject,
    });
    setSaving(false);
    if (ok) toast.success(t("settings.saved"));
    else toast.error(t("settings.saveFailed"));
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <Field label={t("auth.name")}>
        <Input value={form.full_name} autoComplete="name" onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </Field>
      <div>
        <FieldLabel>{t("auth.email")}</FieldLabel>
        <p className="flex h-10 items-center rounded-lg bg-muted px-3 text-[15px] text-soft-foreground">{email}</p>
      </div>
      <Field label={t("settings.school")} hint={t("settings.schoolHint")}>
        <Input
          value={form.school_name}
          placeholder={t("header.schoolNamePlaceholder")}
          onChange={(e) => setForm({ ...form, school_name: e.target.value })}
        />
      </Field>
      <div>
        <FieldLabel hint={t("settings.subjectHint")}>{t("settings.subject")}</FieldLabel>
        <SubjectPicker
          value={form.default_subject}
          onChange={(default_subject) => setForm({ ...form, default_subject })}
          label={t("settings.subject")}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {t("settings.save")}
      </Button>
    </form>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-20 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Labelled({ Icon, children }: { Icon: typeof Sun; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </span>
  );
}
