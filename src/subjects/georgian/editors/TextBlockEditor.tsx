"use client";

import { BookOpenText } from "lucide-react";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import { LIMITS } from "@/lib/questions";
import type { PassageQuestion, PoemQuestion } from "@/lib/storage/types";
import { paragraphs, stanzas } from "../text";

/**
 * A reading text or a poem: the teacher pastes their own text (nothing is
 * pre-filled). Prose: one paragraph per line. Poem: one verse per line, an
 * empty line between stanzas. Line numbers help questions like "lines 5–8".
 */
export function TextBlockEditor<Q extends PassageQuestion | PoemQuestion>({
  question,
  georgianTypography,
  onChange,
}: {
  question: Q;
  /** The paper prints Georgian quotes and dashes (the note below says so). */
  georgianTypography: boolean;
  onChange: (question: Q) => void;
}) {
  const t = useT();
  const poem = question.type === "poem";
  const count = poem
    ? t("text.poemCount", { stanzas: stanzas(question.body).length, verses: stanzas(question.body).flat().length })
    : t("text.passageCount", { paragraphs: paragraphs(question.body).length });

  return (
    <div className="space-y-4" data-text-block-editor={question.type}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("text.title")} hint={t("header.optional")}>
          <Input value={question.title} maxLength={300} onChange={(e) => onChange({ ...question, title: e.target.value })} />
        </Field>
        <Field label={t("text.author")} hint={t("header.optional")}>
          <Input value={question.author} maxLength={300} onChange={(e) => onChange({ ...question, author: e.target.value })} />
        </Field>
      </div>
      <Field label={t(poem ? "text.poemBody" : "text.passageBody")}>
        <Textarea
          rows={poem ? 12 : 10}
          value={question.body}
          maxLength={LIMITS.passageChars}
          placeholder={t(poem ? "text.poemPlaceholder" : "text.passagePlaceholder")}
          onChange={(e) => onChange({ ...question, body: e.target.value })}
          className={poem ? "font-sans whitespace-pre" : ""}
          data-text-body=""
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-soft-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={question.lineNumbers}
            onChange={(e) => onChange({ ...question, lineNumbers: e.target.checked })}
          />
          {t(poem ? "text.verseNumbers" : "text.lineNumbers")}
        </label>
        {question.type === "passage" && (
          <label className="flex items-center gap-2 text-soft-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={question.paragraphLetters === true}
              onChange={(e) => onChange({ ...question, paragraphLetters: e.target.checked })}
            />
            {t("text.paragraphLetters")}
          </label>
        )}
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <BookOpenText className="size-4" aria-hidden="true" />
          {count}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{t(georgianTypography ? "text.ownTextNote" : "text.ownTextNotePlain")}</p>
    </div>
  );
}
