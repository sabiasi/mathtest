"use client";

import { Field, SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import { LIMITS } from "@/lib/questions";
import type { FillBlankQuestion } from "@/lib/storage/types";
import { findRef, sameRef, tokenize, type WordRef } from "@/lib/words";
import { WordPicker } from "./WordPicker";

const list = (value: string) =>
  value
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);

/**
 * Fill in the blanks / gap fill: write the full, correct text, then click
 * the words students must fill in. Then choose how they answer:
 *   open   — they write the word (a hint like "(go)" may follow the gap)
 *   bank   — a box of the words (plus extra wrong ones), shuffled
 *   choice — A/B/C/D options for each gap (the right word + 1–3 wrong ones)
 */
export function FillBlankEditor({
  question,
  english = false,
  onChange,
}: {
  question: FillBlankQuestion;
  /** The text is in English (the example sentence is English too). */
  english?: boolean;
  onChange: (question: FillBlankQuestion) => void;
}) {
  const t = useT();
  const tokens = tokenize(question.body);
  // Blanks whose word is no longer in the text (edited away) are dropped.
  const blanks = question.blanks.filter((b) => findRef(tokens, b) >= 0);
  // In text order, so the list below matches the numbers on paper.
  const ordered = [...blanks].sort((a, b) => findRef(tokens, a) - findRef(tokens, b));
  const setBlank = (blank: WordRef, changes: Partial<FillBlankQuestion["blanks"][number]>) =>
    onChange({ ...question, blanks: blanks.map((b) => (sameRef(b, blank) ? { ...b, ...changes } : b)) });

  function toggle(ref: WordRef) {
    const exists = blanks.some((b) => sameRef(b, ref));
    if (!exists && blanks.length >= LIMITS.blanks) return;
    onChange({ ...question, blanks: exists ? blanks.filter((b) => !sameRef(b, ref)) : [...blanks, { ...ref, hint: "", options: [] }] });
  }

  return (
    <div className="space-y-4" data-fill-blank-editor="">
      <Field label={t("fill.text")}>
        <Textarea
          rows={4}
          value={question.body}
          maxLength={LIMITS.shortTextChars}
          placeholder={t(english ? "fill.textPlaceholderEn" : "fill.textPlaceholder")}
          onChange={(e) => onChange({ ...question, body: e.target.value, blanks })}
        />
      </Field>
      <WordPicker text={question.body} isChosen={(ref) => blanks.some((b) => sameRef(b, ref))} onPick={toggle} label={t("fill.pick")} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-soft-foreground">
        <span className="flex items-center gap-2">
          {t("fill.mode")}
          <SegmentedControl
            label={t("fill.mode")}
            value={question.mode}
            onChange={(mode) => onChange({ ...question, mode })}
            options={[
              { value: "open", label: t("fill.modeOpen") },
              { value: "bank", label: t("fill.modeBank") },
              { value: "choice", label: t("fill.modeChoice") },
            ]}
          />
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-primary" checked={question.numbered} onChange={(e) => onChange({ ...question, numbered: e.target.checked })} />
          {t("fill.numbered")}
        </label>
      </div>

      {question.mode === "bank" && (
        <Field label={t("fill.extras")} hint={t("fill.extrasHint")}>
          <Input defaultValue={question.extras.join(", ")} onBlur={(e) => onChange({ ...question, extras: list(e.target.value).slice(0, 10) })} />
        </Field>
      )}

      {ordered.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-muted-foreground">{t(question.mode === "choice" ? "fill.choicesTitle" : "fill.hintsTitle")}</p>
          <ol className="space-y-2">
            {ordered.map((blank, i) => (
              <li key={`${blank.word}-${blank.occurrence}`} className="flex flex-wrap items-center gap-2" data-blank-row="">
                <span className="w-6 text-right text-sm font-semibold text-soft-foreground">{i + 1}</span>
                <span className="min-w-20 rounded-md bg-primary-soft px-2 py-1 text-sm font-semibold text-brand">{blank.word}</span>
                {question.mode === "choice" ? (
                  [0, 1, 2].map((j) => (
                    <Input
                      key={j}
                      className="h-9 w-32"
                      value={blank.options?.[j] ?? ""}
                      maxLength={100}
                      placeholder={t("fill.wrongOption")}
                      aria-label={t("fill.wrongOptionFor", { word: blank.word, number: j + 1 })}
                      onChange={(e) => {
                        const options = [0, 1, 2].map((k) => (k === j ? e.target.value : (blank.options?.[k] ?? "")));
                        setBlank(blank, { options });
                      }}
                    />
                  ))
                ) : (
                  <Input
                    className="h-9 min-w-0 flex-1"
                    value={blank.hint}
                    maxLength={100}
                    placeholder={t("fill.hintPlaceholder")}
                    aria-label={t("fill.hintFor", { word: blank.word })}
                    onChange={(e) => setBlank(blank, { hint: e.target.value })}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
