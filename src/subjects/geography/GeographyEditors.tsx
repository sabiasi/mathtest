"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { inputClasses, SegmentedControl } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useLanguage, useT } from "@/i18n/language";
import { GEO_LIMITS, formatNumber, parseNumber, scaleAnswer, shortMonths } from "@/lib/geography";
import { newId } from "@/lib/ids";
import { CLIMATE_TASKS, type ClimateChartQuestion, type LabelStyle, type ScaleCalcQuestion, type ScaleRow } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { ClimateChartPrint, ScaleCalcPrint } from "./GeographyPrint";

/**
 * A number box that lets the teacher type freely ("2," on the way to "2,5")
 * and only reports a value once it is a number.
 */
function NumberBox({
  value,
  onValue,
  label,
  min,
  max,
  className,
}: {
  value: number;
  onValue: (value: number) => void;
  label: string;
  min: number;
  max: number;
  className?: string;
}) {
  const language = useLanguage();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? formatNumber(value, language, 3).replace(/ /g, " ");
  const parsed = text === null ? value : parseNumber(text);
  const bad = parsed === null || parsed < min || parsed > max;
  return (
    <Input
      inputMode="decimal"
      className={cn("h-9 tabular-nums", bad && text !== null && "border-destructive", className)}
      value={shown}
      aria-label={label}
      aria-invalid={bad && text !== null}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNumber(e.target.value);
        if (n !== null && n >= min && n <= max) onValue(n);
      }}
      onBlur={() => setText(null)}
    />
  );
}

export function ScaleCalcEditor({ question, onChange }: { question: ScaleCalcQuestion; onChange: (question: ScaleCalcQuestion) => void }) {
  const t = useT();
  const language = useLanguage();
  const setRow = (id: string, changes: Partial<ScaleRow>) => onChange({ ...question, rows: question.rows.map((r) => (r.id === id ? { ...r, ...changes } : r)) });
  const unit = (u: "km" | "m" | "cm") => t(`scale.unit.${u}`);

  return (
    <div className="space-y-4" data-scale-editor="">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-soft-foreground">
        <label className="flex items-center gap-2 font-medium text-foreground">
          {t("scale.denominator")} 1 :
          <NumberBox
            className="w-32"
            label={t("scale.denominator")}
            value={question.denominator}
            min={GEO_LIMITS.denominator.min}
            max={GEO_LIMITS.denominator.max}
            onValue={(denominator) => onChange({ ...question, denominator: Math.round(denominator) })}
          />
        </label>
        <span className="flex flex-wrap items-center gap-2">
          {t("scale.realUnit")}
          <SegmentedControl
            label={t("scale.realUnit")}
            value={question.realUnit}
            options={[
              { value: "km", label: unit("km") },
              { value: "m", label: unit("m") },
            ]}
            onChange={(realUnit) => onChange({ ...question, realUnit })}
          />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-soft-foreground">
        {t("scale.shown")}
        <SegmentedControl
          label={t("scale.shown")}
          value={question.shown}
          options={(["numeric", "named", "linear"] as const).map((value) => ({ value, label: t(`scale.shown.${value}`) }))}
          onChange={(shown) => onChange({ ...question, shown })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-soft-foreground">
        <input type="checkbox" className="size-4 accent-primary" checked={question.askConvert} onChange={(e) => onChange({ ...question, askConvert: e.target.checked })} />
        {t("scale.askConvert")}
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t("scale.rows")}</p>
        <p className="text-sm text-muted-foreground">{t("scale.hint")}</p>
        <ol className="space-y-2">
          {question.rows.map((row, i) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2" data-scale-row="">
              <span className="w-6 text-center font-semibold text-muted-foreground">{i + 1}</span>
              <select
                className={cn(inputClasses, "h-9 w-auto text-sm")}
                value={row.ask}
                aria-label={t("scale.rows")}
                onChange={(e) => setRow(row.id, { ask: e.target.value as ScaleRow["ask"] })}
              >
                <option value="real">{t("scale.askReal")}</option>
                <option value="map">{t("scale.askMap")}</option>
              </select>
              <NumberBox className="w-28" label={t("scale.value")} value={row.value} min={0} max={GEO_LIMITS.value} onValue={(value) => setRow(row.id, { value })} />
              <span className="text-sm text-soft-foreground">{row.ask === "real" ? unit("cm") : unit(question.realUnit)}</span>
              <span className="ml-auto text-sm text-muted-foreground" data-scale-answer="">
                {row.value > 0 &&
                  t("scale.answer", {
                    answer: `${formatNumber(scaleAnswer(row, question.denominator, question.realUnit), language, 3)} ${row.ask === "real" ? unit(question.realUnit) : unit("cm")}`,
                  })}
              </span>
              <IconButton label={t("scale.remove")} tone="danger" onClick={() => onChange({ ...question, rows: question.rows.filter((r) => r.id !== row.id) })}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
        {question.rows.length < GEO_LIMITS.rows && (
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={() => onChange({ ...question, rows: [...question.rows, { id: newId(), value: 0, ask: "real" }] })}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("scale.add")}
          </button>
        )}
      </div>

      <div className="paper rounded-xl border p-3 text-[15px]">
        <ScaleCalcPrint question={question} answerKey />
      </div>
    </div>
  );
}

export function ClimateChartEditor({
  question,
  labelStyle,
  onChange,
}: {
  question: ClimateChartQuestion;
  labelStyle: LabelStyle;
  onChange: (question: ClimateChartQuestion) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const months = shortMonths(language);
  const setValue = (key: "temperature" | "precipitation", index: number, value: number) =>
    onChange({ ...question, [key]: question[key].map((v, i) => (i === index ? value : v)) });
  const toggleTask = (task: (typeof CLIMATE_TASKS)[number], on: boolean) =>
    onChange({ ...question, tasks: CLIMATE_TASKS.filter((x) => (x === task ? on : question.tasks.includes(x))) });

  return (
    <div className="space-y-4" data-climate-editor="">
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {t("climate.place")}
        <Input
          className="h-9 max-w-72 flex-1"
          maxLength={80}
          value={question.place}
          placeholder={t("climate.placePlaceholder")}
          onChange={(e) => onChange({ ...question, place: e.target.value })}
        />
      </label>
      <p className="text-sm text-muted-foreground">{t("climate.hint")}</p>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-1 text-left font-medium">{t("climate.month")}</th>
              {months.map((m) => (
                <th key={m} className="px-0.5 font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["temperature", "precipitation"] as const).map((key) => (
              <tr key={key}>
                <th className="whitespace-nowrap px-1 text-left font-medium text-soft-foreground">{t(`climate.${key}`)}</th>
                {question[key].map((value, i) => (
                  <td key={i} className="p-0.5">
                    <NumberBox
                      className="w-14 px-1 text-center"
                      label={`${t(`climate.${key}`)} — ${months[i]}`}
                      value={value}
                      min={key === "temperature" ? GEO_LIMITS.temperature.min : 0}
                      max={key === "temperature" ? GEO_LIMITS.temperature.max : GEO_LIMITS.precipitation}
                      onValue={(v) => setValue(key, i, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="flex items-center gap-2 text-sm text-soft-foreground">
        <input type="checkbox" className="size-4 accent-primary" checked={question.table} onChange={(e) => onChange({ ...question, table: e.target.checked })} />
        {t("climate.table")}
      </label>
      <fieldset className="space-y-1.5">
        <legend className="mb-1 text-sm font-medium text-foreground">{t("climate.tasks")}</legend>
        {CLIMATE_TASKS.map((task) => (
          <label key={task} className="flex items-center gap-2 text-sm text-soft-foreground">
            <input type="checkbox" className="size-4 accent-primary" checked={question.tasks.includes(task)} onChange={(e) => toggleTask(task, e.target.checked)} />
            {t(`climate.task.${task}`)}
          </label>
        ))}
      </fieldset>
      <div className="paper rounded-xl border p-3 text-[15px]">
        <ClimateChartPrint question={question} labelStyle={labelStyle} answerKey />
      </div>
    </div>
  );
}
