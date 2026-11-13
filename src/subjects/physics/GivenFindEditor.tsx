"use client";

import { KeyRound } from "lucide-react";
import { FieldLabel } from "@/components/ui/form";
import { LinesStepper } from "@/features/editor/questions/OpenAnswerEditor";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { MIN_GIVEN_FIND_LINES } from "@/lib/questions";
import type { RichText } from "@/lib/richText";
import type { GivenFindQuestion } from "@/lib/storage/types";

/**
 * The editor part of a "Given / Find / Solution" problem: how tall the frame
 * is, a small preview of it, and the teacher's own solution for the answer key.
 */
export function GivenFindEditor({
  question,
  onChange,
}: {
  question: GivenFindQuestion;
  onChange: (question: GivenFindQuestion) => void;
}) {
  const t = useT();
  const field = (key: "given" | "find" | "solution" | "answer", singleLine = false) => (
    // A <div>, not a <label>: a label would steal focus from formula boxes.
    <div>
      <FieldLabel>{t(`gf.${key}Key`)}</FieldLabel>
      <RichTextInput
        singleLine={singleLine}
        value={question[key]}
        ariaLabel={t(`gf.${key}Key`)}
        placeholder={t(`gf.${key}Placeholder`)}
        onChange={(value: RichText) => onChange({ ...question, [key]: value })}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <LinesStepper id={question.id} value={question.lines} min={MIN_GIVEN_FIND_LINES} onChange={(lines) => onChange({ ...question, lines })} />
        <div className="min-w-56 flex-1" aria-hidden="true">
          <p className="mb-1.5 text-sm text-muted-foreground">{t("oa.preview")}</p>
          <FramePreview lines={question.lines} />
        </div>
      </div>

      <details className="group rounded-xl border bg-muted/40 px-4 py-3" open={hasKey(question)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-soft-foreground [&::-webkit-details-marker]:hidden">
          <KeyRound className="size-4 text-brand" aria-hidden="true" />
          {t("gf.keyTitle")}
          <span className="text-sm font-normal text-muted-foreground">({t("header.optional")})</span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_3fr]">
          <div className="space-y-4">
            {field("given")}
            {field("find")}
          </div>
          <div className="space-y-4">
            {field("solution")}
            {field("answer", true)}
          </div>
        </div>
      </details>
    </div>
  );
}

const hasKey = (q: GivenFindQuestion) => [q.given, q.find, q.solution, q.answer].some((value) => value.length > 0);

/** A small picture of the printed frame (on white paper). */
function FramePreview({ lines }: { lines: number }) {
  const t = useT();
  const shown = Math.min(lines, 6);
  return (
    <div className="paper grid grid-cols-[34%_1fr] rounded-lg border px-3 py-2 text-xs text-neutral-700">
      <div className="flex flex-col border-r border-neutral-800 pr-2">
        <span className="flex-[2]">{t("gf.given")}</span>
        <span className="flex-1 border-t border-neutral-800 pt-0.5">{t("gf.find")}</span>
      </div>
      <div className="pl-2">
        <span>{t("gf.solution")}</span>
        {Array.from({ length: shown }, (_, i) => (
          <div key={i} className="h-4 border-b border-neutral-300" />
        ))}
      </div>
    </div>
  );
}
