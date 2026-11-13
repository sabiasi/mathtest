"use client";

import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import { LIMITS } from "@/lib/questions";
import type { FillBlankQuestion } from "@/lib/storage/types";
import { findRef, sameRef, tokenize, type WordRef } from "@/lib/words";
import { WordPicker } from "./WordPicker";

/**
 * Fill in the blanks: write the full, correct text, then click the words
 * students must fill in. Each blank can have a hint printed after it, e.g.
 * the base form "(წერა)" — that makes it a "put in the right form" exercise.
 */
export function FillBlankEditor({ question, onChange }: { question: FillBlankQuestion; onChange: (question: FillBlankQuestion) => void }) {
  const t = useT();
  const tokens = tokenize(question.body);
  // Blanks whose word is no longer in the text (edited away) are dropped.
  const blanks = question.blanks.filter((b) => findRef(tokens, b) >= 0);

  function toggle(ref: WordRef) {
    const exists = blanks.some((b) => sameRef(b, ref));
    if (!exists && blanks.length >= LIMITS.blanks) return;
    onChange({ ...question, blanks: exists ? blanks.filter((b) => !sameRef(b, ref)) : [...blanks, { ...ref, hint: "" }] });
  }

  return (
    <div className="space-y-4" data-fill-blank-editor="">
      <Field label={t("fill.text")}>
        <Textarea
          rows={4}
          value={question.body}
          maxLength={LIMITS.shortTextChars}
          placeholder={t("fill.textPlaceholder")}
          onChange={(e) => onChange({ ...question, body: e.target.value, blanks })}
        />
      </Field>
      <WordPicker text={question.body} isChosen={(ref) => blanks.some((b) => sameRef(b, ref))} onPick={toggle} label={t("fill.pick")} />
      {blanks.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-muted-foreground">{t("fill.hintsTitle")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {blanks.map((blank) => (
              <li key={`${blank.word}-${blank.occurrence}`} className="flex items-center gap-2">
                <span className="min-w-20 rounded-md bg-primary-soft px-2 py-1 text-sm font-semibold text-brand">{blank.word}</span>
                <Input
                  className="h-9 min-w-0 flex-1"
                  value={blank.hint}
                  maxLength={100}
                  placeholder={t("fill.hintPlaceholder")}
                  aria-label={t("fill.hintFor", { word: blank.word })}
                  onChange={(e) => onChange({ ...question, blanks: blanks.map((b) => (sameRef(b, blank) ? { ...b, hint: e.target.value } : b)) })}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-soft-foreground">
        <input type="checkbox" className="size-4 accent-primary" checked={question.wordBank} onChange={(e) => onChange({ ...question, wordBank: e.target.checked })} />
        {t("fill.wordBank")}
      </label>
    </div>
  );
}
