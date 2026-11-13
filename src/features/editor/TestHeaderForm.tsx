"use client";

import { DateField } from "@/components/DateField";
import { Field, FieldLabel, SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import type { LabelStyle, Test } from "@/lib/storage/types";

/** The top part of the test: school, title, subject, grade, date, time, instructions. */
export function TestHeaderForm({
  test,
  onChange,
}: {
  test: Test;
  onChange: (changes: Partial<Test>) => void;
}) {
  const t = useT();

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{t("header.heading")}</h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label={t("header.schoolName")} hint={t("header.optional")} className="sm:col-span-2">
          <Input
            value={test.schoolName}
            placeholder={t("header.schoolNamePlaceholder")}
            onChange={(e) => onChange({ schoolName: e.target.value })}
          />
        </Field>

        <Field label={t("header.title")} className="sm:col-span-2">
          <Input
            className="h-11 text-lg font-semibold"
            value={test.title}
            placeholder={t("header.titlePlaceholder")}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>

        <Field label={t("header.subject")}>
          <Input
            value={test.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
          />
        </Field>

        <Field label={t("header.grade")}>
          <Input
            value={test.grade}
            placeholder={t("header.gradePlaceholder")}
            onChange={(e) => onChange({ grade: e.target.value })}
          />
        </Field>

        {/* A <div>, not a <label>: a label would send every click to the first dropdown. */}
        <div>
          <FieldLabel id="date-label">{t("header.date")}</FieldLabel>
          <DateField value={test.date} onChange={(date) => onChange({ date })} labelId="date-label" />
        </div>

        <Field label={t("header.timeLimit")}>
          <Input
            inputMode="numeric"
            value={test.timeLimitMinutes ?? ""}
            placeholder={t("header.timeLimitPlaceholder")}
            onChange={(e) => {
              // Keep digits only, at most 3 (up to 999 minutes).
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              onChange({ timeLimitMinutes: Number(digits) > 0 ? Number(digits) : null });
            }}
          />
        </Field>

        <Field label={t("header.instructions")} className="sm:col-span-2">
          <Textarea
            rows={3}
            value={test.instructions}
            placeholder={t("header.instructionsPlaceholder")}
            onChange={(e) => onChange({ instructions: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2">
          <FieldLabel>{t("header.labelStyle")}</FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<LabelStyle>
              label={t("header.labelStyle")}
              value={test.labelStyle}
              onChange={(labelStyle) => onChange({ labelStyle })}
              options={[
                { value: "georgian", label: "ა, ბ, გ, დ" },
                { value: "latin", label: "A, B, C, D" },
              ]}
            />
            <span className="text-sm text-muted-foreground">{t("header.labelStyleHint")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
