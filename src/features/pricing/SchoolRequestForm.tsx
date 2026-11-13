"use client";

import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { displayName, useAuth } from "@/features/auth/AuthProvider";
import { useLanguage, useT } from "@/i18n/language";
import { looksLikeEmail } from "@/lib/schoolRequest";

type Status = "idle" | "sending" | "sent";

/** "Contact us" for the School plan → POST /api/school-request (saved for the founders). */
export function SchoolRequestForm() {
  const t = useT();
  const language = useLanguage();
  const { user, profile } = useAuth();
  // Signed-in teachers: start with what we already know.
  const [form, setForm] = useState({
    contact_name: displayName(user, profile),
    school_name: profile?.school_name ?? "",
    city: "",
    teachers: "",
    email: user?.email ?? "",
    phone: "",
    message: "",
    website: "", // hidden "honeypot" field: only robots fill it in
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!form.contact_name.trim() || !form.school_name.trim() || !looksLikeEmail(form.email.trim())) {
      setError(t("school.invalid"));
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/school-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, language }),
      });
      if (response.ok) {
        setStatus("sent");
        return;
      }
      setError(
        t(
          response.status === 429
            ? "school.tooMany"
            : response.status === 400
              ? "school.invalid"
              : response.status === 501
                ? "school.notConnected"
                : "school.error",
        ),
      );
    } catch {
      setError(t("school.error"));
    }
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <p role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-success-text">
        <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        {t("school.sent")}
      </p>
    );
  }

  const optional = t("school.optional");
  return (
    <form onSubmit={send} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate data-school-form="">
      <Field label={t("school.name")}>
        <Input value={form.contact_name} onChange={set("contact_name")} autoComplete="name" required maxLength={200} />
      </Field>
      <Field label={t("school.school")}>
        <Input value={form.school_name} onChange={set("school_name")} autoComplete="organization" required maxLength={300} />
      </Field>
      <Field label={t("school.city")} hint={optional}>
        <Input value={form.city} onChange={set("city")} autoComplete="address-level2" maxLength={100} />
      </Field>
      <Field label={t("school.teachers")} hint={optional}>
        <Input value={form.teachers} onChange={set("teachers")} inputMode="numeric" type="number" min={1} max={10000} />
      </Field>
      <Field label={t("school.email")}>
        <Input value={form.email} onChange={set("email")} type="email" autoComplete="email" required maxLength={320} />
      </Field>
      <Field label={t("school.phone")} hint={optional}>
        <Input value={form.phone} onChange={set("phone")} type="tel" autoComplete="tel" maxLength={40} />
      </Field>
      <Field label={t("school.message")} hint={optional} className="sm:col-span-2">
        <Textarea value={form.message} onChange={set("message")} maxLength={3000} />
      </Field>
      {/* Invisible to people (and screen readers); robots fill in every field. */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={set("website")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {error && (
        <p role="alert" className="rounded-xl border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-text sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={status === "sending"} className="max-sm:w-full">
          {status === "sending" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
          {t("school.send")}
        </Button>
      </div>
    </form>
  );
}
