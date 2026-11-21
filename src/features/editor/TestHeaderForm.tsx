"use client";

import { Sparkles } from "lucide-react";
import { DateField } from "@/components/DateField";
import { Field, FieldLabel, SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useT } from "@/i18n/language";
import { CEFR_LEVELS, type LabelStyle, type Test } from "@/lib/storage/types";
import { getToolkit } from "@/subjects/registry";

/** The top part of the test: school, title, subject, grade, date, time, instructions. */
export function TestHeaderForm({
  test,
  onChange,
}: {
  test: Test;
  onChange: (changes: Partial<Test>) => void;
}) {
  const t = useT();
  const toolkit = getToolkit(test.subjectId);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6" data-test-header="">
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
            data-title-input=""
            placeholder={t("header.titlePlaceholder")}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2">
          <FieldLabel>{t("header.subject")}</FieldLabel>
          {/* Only the test's own subject: it is chosen when the test is created and never changes here. */}
          <span className="inline-flex items-center gap-3 rounded-xl border bg-primary-soft/60 py-1.5 pr-3 pl-1.5" data-header-subject={test.subjectId}>
            <SubjectIcon id={test.subjectId} className="rounded-lg p-1.5" iconClassName="size-4" />
            <span className="text-sm font-medium text-foreground">{t(`subject.${test.subjectId}`)}</span>
          </span>
          {toolkit.status === "placeholder" && (
            <p className="mt-2.5 flex items-start gap-2 text-sm text-muted-foreground" data-coming-soon="">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              {t("subjects.comingSoon", { subject: t(`subject.${test.subjectId}`) })}
            </p>
          )}
        </div>

        <Field label={t("header.subjectName")} hint={t("header.subjectNameHint")}>
          <Input
            value={test.subject}
            placeholder={t(`subject.${test.subjectId}`)}
            onChange={(e) => onChange({ subject: e.target.value })}
          />
        </Field>

        {toolkit.levels && (
          <div>
            <FieldLabel id="level-label">{t("header.level")}</FieldLabel>
            <SegmentedControl
              label={t("header.level")}
              value={test.level || "none"}
              onChange={(level) => onChange({ level: level === "none" ? "" : (level as Test["level"]) })}
              options={[{ value: "none", label: "—" }, ...CEFR_LEVELS.map((level) => ({ value: level, label: level }))]}
            />
          </div>
        )}

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
