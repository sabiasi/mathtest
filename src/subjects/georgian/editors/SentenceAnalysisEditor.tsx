"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { WordPicker } from "@/features/editor/questions/WordPicker";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { SentenceAnalysisQuestion } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { RowControls, addButtonClass, move } from "@/subjects/history/editors/RowControls";
import { SENTENCE_ROLES } from "../grammar";

type Part = SentenceAnalysisQuestion["parts"][number];

/**
 * Sentence analysis: the sentence, and the parts students must find
 * (subject, predicate, object…). Clicking a word in the sentence adds it to
 * the selected part's answer.
 */
export function SentenceAnalysisEditor({ question, onChange }: { question: SentenceAnalysisQuestion; onChange: (question: SentenceAnalysisQuestion) => void }) {
  const t = useT();
  const { parts } = question;
  const [selected, setSelected] = useState<string | null>(parts[0]?.id ?? null);
  const active = parts.find((p) => p.id === selected) ?? parts[0];
  const setPart = (id: string, changes: Partial<Part>) => onChange({ ...question, parts: parts.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  const listId = `${question.id}-roles`;

  function addStandard() {
    const missing = SENTENCE_ROLES.slice(0, 3).filter((role) => !parts.some((p) => p.role === role));
    onChange({ ...question, parts: [...parts, ...missing.map((role) => ({ id: newId(), role, answer: "" }))].slice(0, LIMITS.sentenceParts) });
  }

  return (
    <div className="space-y-4" data-sentence-editor="">
      <Field label={t("analysis.sentence")}>
        <Input value={question.sentence} maxLength={500} placeholder={t("analysis.sentencePlaceholder")} onChange={(e) => onChange({ ...question, sentence: e.target.value })} />
      </Field>
      {active && (
        <WordPicker
          text={question.sentence}
          isChosen={(ref) => active.answer.split(/\s+/).includes(ref.word)}
          onPick={(ref) => {
            const words = active.answer.split(/\s+/).filter(Boolean);
            const next = words.includes(ref.word) ? words.filter((w) => w !== ref.word) : [...words, ref.word];
            setPart(active.id, { answer: next.join(" ") });
          }}
          label={t("analysis.pick", { role: active.role || t("analysis.rolePlaceholder") })}
        />
      )}
      <datalist id={listId}>
        {SENTENCE_ROLES.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
      <ol className="space-y-2">
        {parts.map((part, index) => (
          <li
            key={part.id}
            className={cn("flex items-center gap-2 rounded-xl p-1", part.id === active?.id && "bg-primary-soft/50")}
            onFocusCapture={() => setSelected(part.id)}
            data-sentence-part=""
          >
            <Input
              className="h-9 w-48 shrink-0"
              list={listId}
              value={part.role}
              maxLength={100}
              placeholder={t("analysis.rolePlaceholder")}
              aria-label={t("analysis.role", { number: index + 1 })}
              onChange={(e) => setPart(part.id, { role: e.target.value })}
            />
            <Input
              className="h-9 min-w-0 flex-1"
              value={part.answer}
              maxLength={200}
              placeholder={t("analysis.answerPlaceholder")}
              aria-label={t("analysis.answer", { number: index + 1 })}
              onChange={(e) => setPart(part.id, { answer: e.target.value })}
            />
            <RowControls
              index={index}
              count={parts.length}
              min={0}
              onMove={(by) => onChange({ ...question, parts: move(parts, index, by) })}
              onRemove={() => onChange({ ...question, parts: parts.filter((p) => p.id !== part.id) })}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={addButtonClass}
          disabled={parts.length >= LIMITS.sentenceParts}
          onClick={() => {
            const part = { id: newId(), role: "", answer: "" };
            onChange({ ...question, parts: [...parts, part] });
            setSelected(part.id);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("analysis.add")}
        </button>
        {parts.length === 0 && (
          <button type="button" className={addButtonClass} onClick={addStandard} data-standard-parts="">
            <Plus className="size-4" aria-hidden="true" />
            {t("analysis.addStandard")}
          </button>
        )}
      </div>
    </div>
  );
}
