"use client";

import { ReorderArrows } from "@/components/ReorderArrows";
import { move } from "@/subjects/history/editors/RowControls";
import { ArrowLeftRight, Plus, X } from "lucide-react";
import { Field } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useLanguage, useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { RichText } from "@/lib/richText";
import type { MatchingPair, MatchingQuestion } from "@/lib/storage/types";
import type { SubjectToolkit } from "@/subjects/types";

const addButton =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-primary-soft disabled:opacity-40";

/**
 * Matching: write each pair as it belongs together (left ↔ right). On paper
 * the right column is shuffled and lettered; extra items make guessing harder.
 */
export function MatchingEditor({
  question,
  templates,
  onChange,
}: {
  question: MatchingQuestion;
  /** The subject's ready-made column headings (history: Person ↔ Date…). */
  templates: SubjectToolkit["matchingTemplates"];
  onChange: (question: MatchingQuestion) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const { pairs, extras } = question;

  const setPair = (id: string, changes: Partial<MatchingPair>) =>
    onChange({ ...question, pairs: pairs.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  const setExtra = (id: string, text: RichText) =>
    onChange({ ...question, extras: extras.map((e) => (e.id === id ? { ...e, text } : e)) });

  return (
    <div className="space-y-4" data-matching-editor="">
      {templates && templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm text-muted-foreground">{t("matching.templates")}</span>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              data-template={template.id}
              onClick={() => onChange({ ...question, leftTitle: template.left[language], rightTitle: template.right[language] })}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-sm text-soft-foreground transition-colors hover:border-primary-soft-border hover:bg-primary-soft/50"
            >
              {template.left[language]}
              <ArrowLeftRight className="size-3.5 text-brand" aria-hidden="true" />
              {template.right[language]}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("matching.leftTitle")} hint={t("header.optional")}>
          <Input value={question.leftTitle} maxLength={100} placeholder={t("matching.leftTitlePlaceholder")} onChange={(e) => onChange({ ...question, leftTitle: e.target.value })} />
        </Field>
        <Field label={t("matching.rightTitle")} hint={t("header.optional")}>
          <Input value={question.rightTitle} maxLength={100} placeholder={t("matching.rightTitlePlaceholder")} onChange={(e) => onChange({ ...question, rightTitle: e.target.value })} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">{t("matching.pairsHint")}</p>
        <ol className="space-y-2">
          {pairs.map((pair, index) => (
            <li key={pair.id} className="flex items-center gap-2" data-pair="">
              <span className="w-6 shrink-0 text-right font-semibold text-soft-foreground tabular-nums">{index + 1}.</span>
              <RichTextInput
                singleLine
                className="min-w-0 flex-1"
                value={pair.left}
                ariaLabel={t("matching.left", { number: index + 1 })}
                placeholder={question.leftTitle || t("matching.leftPlaceholder")}
                onChange={(left) => setPair(pair.id, { left })}
              />
              <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <RichTextInput
                singleLine
                className="min-w-0 flex-1"
                value={pair.right}
                ariaLabel={t("matching.right", { number: index + 1 })}
                placeholder={question.rightTitle || t("matching.rightPlaceholder")}
                onChange={(right) => setPair(pair.id, { right })}
              />
              {/* The left column prints in this order (the right one is shuffled anyway). */}
              <ReorderArrows
                index={index}
                count={pairs.length}
                what={String(index + 1)}
                onMove={(by) => onChange({ ...question, pairs: move(pairs, index, by) })}
              />
              <IconButton
                label={t("matching.removePair")}
                tone="danger"
                disabled={pairs.length <= LIMITS.matchingPairs.min}
                onClick={() => onChange({ ...question, pairs: pairs.filter((p) => p.id !== pair.id) })}
              >
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={`${addButton} mt-1 ml-6`}
          disabled={pairs.length >= LIMITS.matchingPairs.max}
          onClick={() => onChange({ ...question, pairs: [...pairs, { id: newId(), left: [], right: [] }] })}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("matching.addPair")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">{t("matching.extrasHint")}</p>
        {extras.length > 0 && (
          <ul className="space-y-2">
            {extras.map((extra, index) => (
              <li key={extra.id} className="flex items-center gap-2 sm:ml-[calc(50%+0.25rem)]">
                <RichTextInput
                  singleLine
                  className="min-w-0 flex-1"
                  value={extra.text}
                  ariaLabel={t("matching.extra", { number: index + 1 })}
                  placeholder={t("matching.extraPlaceholder")}
                  onChange={(text) => setExtra(extra.id, text)}
                />
                <IconButton label={t("matching.removeExtra")} tone="danger" onClick={() => onChange({ ...question, extras: extras.filter((e) => e.id !== extra.id) })}>
                  <X className="size-4" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className={`${addButton} mt-1 ml-6`}
          disabled={extras.length >= LIMITS.matchingExtras}
          onClick={() => onChange({ ...question, extras: [...extras, { id: newId(), text: [] }] })}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("matching.addExtra")}
        </button>
      </div>
    </div>
  );
}
