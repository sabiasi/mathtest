"use client";

import { Field, SegmentedControl, inputClasses } from "@/components/ui/form";
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{t("header.heading")}</h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label={t("header.schoolName")} hint={t("header.optional")} className="sm:col-span-2">
          <input
            className={inputClasses}
            value={test.schoolName}
            placeholder={t("header.schoolNamePlaceholder")}
            onChange={(e) => onChange({ schoolName: e.target.value })}
          />
        </Field>

        <Field label={t("header.title")} className="sm:col-span-2">
          <input
            className={`${inputClasses} text-lg font-semibold`}
            value={test.title}
            placeholder={t("header.titlePlaceholder")}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>

        <Field label={t("header.subject")}>
          <input
            className={inputClasses}
            value={test.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
          />
        </Field>

        <Field label={t("header.grade")}>
          <input
            className={inputClasses}
            value={test.grade}
            placeholder={t("header.gradePlaceholder")}
            onChange={(e) => onChange({ grade: e.target.value })}
          />
        </Field>

        <Field label={t("header.date")}>
          <input
            type="date"
            className={inputClasses}
            value={test.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </Field>

        <Field label={t("header.timeLimit")}>
          <input
            inputMode="numeric"
            className={inputClasses}
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
          <textarea
            rows={3}
            className={`${inputClasses} field-sizing-content min-h-24`}
            value={test.instructions}
            placeholder={t("header.instructionsPlaceholder")}
            onChange={(e) => onChange({ instructions: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">{t("header.labelStyle")}</p>
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
            <span className="text-sm text-slate-500">{t("header.labelStyleHint")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
