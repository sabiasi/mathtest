"use client";

import { WordPicker } from "@/features/editor/questions/WordPicker";
import { Field } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import { LIMITS } from "@/lib/questions";
import type { MarkWordsQuestion } from "@/lib/storage/types";
import { findRef, sameRef, tokenize, type WordRef } from "@/lib/words";

/** "Underline the nouns": the text, and the words that are the right answer (shown on the key). */
export function MarkWordsEditor({ question, onChange }: { question: MarkWordsQuestion; onChange: (question: MarkWordsQuestion) => void }) {
  const t = useT();
  const tokens = tokenize(question.body);
  const marked = question.marked.filter((m) => findRef(tokens, m) >= 0);
  const toggle = (ref: WordRef) =>
    onChange({ ...question, marked: marked.some((m) => sameRef(m, ref)) ? marked.filter((m) => !sameRef(m, ref)) : [...marked, ref].slice(0, LIMITS.blanks) });
  return (
    <div className="space-y-4" data-mark-words-editor="">
      <Field label={t("mark.text")}>
        <Textarea rows={3} value={question.body} maxLength={LIMITS.shortTextChars} placeholder={t("mark.textPlaceholder")} onChange={(e) => onChange({ ...question, body: e.target.value, marked })} />
      </Field>
      <WordPicker text={question.body} isChosen={(ref) => marked.some((m) => sameRef(m, ref))} onPick={toggle} label={t("mark.pick")} />
    </div>
  );
}
