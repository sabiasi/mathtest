"use client";

import { Plus } from "lucide-react";
import { SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { WordPicker } from "@/features/editor/questions/WordPicker";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { FindMistakeQuestion } from "@/lib/storage/types";
import { findRef, sameRef, tokenize } from "@/lib/words";
import { RowControls, addButtonClass, move } from "@/subjects/history/editors/RowControls";

type Item = FindMistakeQuestion["items"][number];

/** Sentences that each contain a mistake: click the wrong word, write the correct form. */
export function FindMistakeEditor({ question, onChange }: { question: FindMistakeQuestion; onChange: (question: FindMistakeQuestion) => void }) {
  const t = useT();
  const { items } = question;
  const setItem = (id: string, changes: Partial<Item>) => onChange({ ...question, items: items.map((i) => (i.id === id ? { ...i, ...changes } : i)) });

  const abcd = question.style === "abcd";
  return (
    <div className="space-y-3" data-find-mistake-editor="">
      <div className="flex flex-wrap items-center gap-2 text-sm text-soft-foreground">
        {t("mistake.style")}
        <SegmentedControl
          label={t("mistake.style")}
          value={abcd ? "abcd" : "correct"}
          onChange={(style) => onChange({ ...question, style })}
          options={[
            { value: "correct", label: t("mistake.styleCorrect") },
            { value: "abcd", label: t("mistake.styleAbcd") },
          ]}
        />
      </div>
      <p className="text-sm text-muted-foreground">{t(abcd ? "mistake.hintAbcd" : "mistake.hint")}</p>
      <ol className="space-y-3">
        {items.map((item, index) => {
          const mistake = item.mistake && findRef(tokenize(item.sentence), item.mistake) >= 0 ? item.mistake : null;
          return (
            <li key={item.id} className="space-y-2 rounded-xl border bg-card p-3" data-mistake-item="">
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right font-semibold text-soft-foreground">{index + 1})</span>
                <Input
                  className="h-9 min-w-0 flex-1"
                  value={item.sentence}
                  maxLength={500}
                  placeholder={t("mistake.sentencePlaceholder")}
                  aria-label={t("mistake.sentence", { number: index + 1 })}
                  onChange={(e) => setItem(item.id, { sentence: e.target.value })}
                />
                <RowControls
                  index={index}
                  count={items.length}
                  min={1}
                  onMove={(by) => onChange({ ...question, items: move(items, index, by) })}
                  onRemove={() => onChange({ ...question, items: items.filter((i) => i.id !== item.id) })}
                />
              </div>
              <div className="ml-8 space-y-2">
                {abcd ? (
                  <AbcdPicker item={item} onChange={(changes) => setItem(item.id, changes)} />
                ) : (
                  <WordPicker
                    text={item.sentence}
                    isChosen={(ref) => sameRef(mistake, ref)}
                    onPick={(ref) => setItem(item.id, { mistake: sameRef(mistake, ref) ? null : ref })}
                    label={t("mistake.pick")}
                  />
                )}
                <Input
                  className="h-9"
                  value={item.correction}
                  maxLength={200}
                  placeholder={t("mistake.correctionPlaceholder")}
                  aria-label={t("mistake.correction", { number: index + 1 })}
                  onChange={(e) => setItem(item.id, { correction: e.target.value })}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={`${addButtonClass} ml-6`}
        disabled={items.length >= LIMITS.mistakeItems}
        onClick={() => onChange({ ...question, items: [...items, { id: newId(), sentence: "", mistake: null, correction: "" }] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("mistake.add")}
      </button>
    </div>
  );
}

/**
 * A–D style: click up to 4 words to underline them (A, B, C, D in sentence
 * order), then click the wrong one in the row below.
 */
function AbcdPicker({ item, onChange }: { item: Item; onChange: (changes: Partial<Item>) => void }) {
  const t = useT();
  const tokens = tokenize(item.sentence);
  const parts = (item.parts ?? []).filter((p) => findRef(tokens, p) >= 0).sort((a, b) => findRef(tokens, a) - findRef(tokens, b));
  return (
    <div className="space-y-2">
      <WordPicker
        text={item.sentence}
        isChosen={(ref) => parts.some((p) => sameRef(p, ref))}
        onPick={(ref) => {
          const exists = parts.some((p) => sameRef(p, ref));
          if (!exists && parts.length >= 4) return;
          const next = exists ? parts.filter((p) => !sameRef(p, ref)) : [...parts, ref];
          onChange({ parts: next, mistake: item.mistake && next.some((p) => sameRef(p, item.mistake)) ? item.mistake : null });
        }}
        label={t("mistake.pickParts")}
      />
      {parts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("mistake.whichWrong")}</span>
          {parts.map((part, i) => (
            <button
              key={`${part.word}-${part.occurrence}`}
              type="button"
              aria-pressed={sameRef(item.mistake, part)}
              onClick={() => onChange({ mistake: sameRef(item.mistake, part) ? null : part })}
              className="rounded-md border px-2 py-1 transition-colors hover:bg-accent aria-pressed:border-destructive aria-pressed:bg-destructive-soft aria-pressed:text-destructive-text"
            >
              {String.fromCharCode(65 + i)}: {part.word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
