"use client";

import { Plus } from "lucide-react";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { GrammarTableQuestion } from "@/lib/storage/types";
import { RowControls, addButtonClass, move } from "@/subjects/history/editors/RowControls";
import { GRAMMAR_TEMPLATES } from "../grammar";

/**
 * A grammar table: words on the left, students write the case (ბრუნვა),
 * screeve (მწკრივი), part of speech… A template fills the heading and the
 * list of terms to choose from.
 */
export function GrammarTableEditor({ question, onChange }: { question: GrammarTableQuestion; onChange: (question: GrammarTableQuestion) => void }) {
  const t = useT();
  const { rows } = question;
  const listId = `${question.id}-terms`;
  return (
    <div className="space-y-4" data-grammar-table-editor="">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm text-muted-foreground">{t("matching.templates")}</span>
        {GRAMMAR_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            data-grammar-template={template.id}
            onClick={() => onChange({ ...question, wordTitle: template.wordTitle, answerTitle: template.answerTitle, bank: [...template.terms] })}
            className="inline-flex items-center rounded-lg border bg-card px-2.5 py-1 text-sm text-soft-foreground transition-colors hover:border-primary-soft-border hover:bg-primary-soft/50"
          >
            {template.answerTitle}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("grammar.wordTitle")}>
          <Input value={question.wordTitle} maxLength={100} placeholder={t("grammar.wordDefault")} onChange={(e) => onChange({ ...question, wordTitle: e.target.value })} />
        </Field>
        <Field label={t("grammar.answerTitle")}>
          <Input value={question.answerTitle} maxLength={100} placeholder={t("grammar.answerDefault")} onChange={(e) => onChange({ ...question, answerTitle: e.target.value })} />
        </Field>
      </div>
      <Field label={t("grammar.bank")} hint={t("grammar.bankHint")}>
        <Textarea
          rows={2}
          value={question.bank.join(", ")}
          onChange={(e) => onChange({ ...question, bank: e.target.value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 20) })}
        />
      </Field>
      <datalist id={listId}>
        {question.bank.map((term) => (
          <option key={term} value={term} />
        ))}
      </datalist>
      <ol className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.id} className="flex items-center gap-2" data-grammar-row="">
            <span className="w-6 shrink-0 text-right font-semibold text-soft-foreground tabular-nums">{index + 1}.</span>
            <Input
              className="h-9 min-w-0 flex-1"
              value={row.word}
              maxLength={200}
              placeholder={t("grammar.wordPlaceholder")}
              aria-label={t("grammar.word", { number: index + 1 })}
              onChange={(e) => onChange({ ...question, rows: rows.map((r) => (r.id === row.id ? { ...r, word: e.target.value } : r)) })}
            />
            <Input
              className="h-9 min-w-0 flex-1"
              list={listId}
              value={row.answer}
              maxLength={200}
              placeholder={t("grammar.answerPlaceholder")}
              aria-label={t("grammar.answer", { number: index + 1 })}
              onChange={(e) => onChange({ ...question, rows: rows.map((r) => (r.id === row.id ? { ...r, answer: e.target.value } : r)) })}
            />
            <RowControls
              index={index}
              count={rows.length}
              min={1}
              onMove={(by) => onChange({ ...question, rows: move(rows, index, by) })}
              onRemove={() => onChange({ ...question, rows: rows.filter((r) => r.id !== row.id) })}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={`${addButtonClass} ml-6`}
        disabled={rows.length >= LIMITS.tableRows}
        onClick={() => onChange({ ...question, rows: [...rows, { id: newId(), word: "", answer: "" }] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("grammar.addRow")}
      </button>
    </div>
  );
}
