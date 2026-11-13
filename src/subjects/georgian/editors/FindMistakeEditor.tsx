"use client";

import { Plus } from "lucide-react";
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

  return (
    <div className="space-y-3" data-find-mistake-editor="">
      <p className="text-sm text-muted-foreground">{t("mistake.hint")}</p>
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
                <WordPicker
                  text={item.sentence}
                  isChosen={(ref) => sameRef(mistake, ref)}
                  onPick={(ref) => setItem(item.id, { mistake: sameRef(mistake, ref) ? null : ref })}
                  label={t("mistake.pick")}
                />
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
