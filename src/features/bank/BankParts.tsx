"use client";

/** Pieces shared by the bank page and the editor's "Insert from bank" window: the filters and one question row. */
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { inputClasses } from "@/components/ui/form";
import { RichTextView } from "@/features/math/RichTextView";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useLanguage, useT } from "@/i18n/language";
import { bankFacets, summaryOf, type BankFilter, type BankItem } from "@/lib/bank/bank";
import type { QuestionType } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { getToolkit } from "@/subjects/registry";
import type { SubjectId } from "@/subjects/ids";

/** A question type's name as that subject calls it ("Label the picture"). */
export function useTypeName() {
  const t = useT();
  const language = useLanguage();
  return (subject: SubjectId, type: QuestionType) => getToolkit(subject).typeLabels?.[type]?.[language] ?? t(`type.${type}`);
}

export function BankFilters({ items, filter, onChange, lockSubject = false }: { items: BankItem[]; filter: BankFilter; onChange: (filter: BankFilter) => void; lockSubject?: boolean }) {
  const t = useT();
  const facets = bankFacets(items);
  const set = (change: Partial<BankFilter>) => onChange({ ...filter, ...change });
  const select = cn(inputClasses, "w-auto min-w-0 flex-1 sm:flex-none");
  return (
    <div className="flex flex-wrap items-center gap-2" data-bank-filters="">
      <label className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input type="search" className={cn(inputClasses, "pl-9")} value={filter.search ?? ""} placeholder={t("bank.search")} aria-label={t("bank.search")} onChange={(e) => set({ search: e.target.value })} data-bank-search="" />
      </label>
      {!lockSubject && facets.subjects.length > 1 && (
        <select className={select} value={filter.subject ?? ""} aria-label={t("ai.subject")} onChange={(e) => set({ subject: e.target.value as SubjectId | "" })} data-bank-subject="">
          <option value="">{t("templates.all")}</option>
          {facets.subjects.map((id) => <option key={id} value={id}>{t(`subject.${id}`)}</option>)}
        </select>
      )}
      {facets.grades.length > 1 && (
        <select className={select} value={filter.grade ?? ""} aria-label={t("templates.grade")} onChange={(e) => set({ grade: e.target.value })} data-bank-grade="">
          <option value="">{t("templates.allGrades")}</option>
          {facets.grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
        </select>
      )}
      {facets.types.length > 1 && (
        <select className={select} value={filter.type ?? ""} aria-label={t("bank.type")} onChange={(e) => set({ type: e.target.value as QuestionType | "" })} data-bank-type="">
          <option value="">{t("bank.allTypes")}</option>
          {facets.types.map((type) => <option key={type} value={type}>{t(`type.${type}`)}</option>)}
        </select>
      )}
      {facets.tags.length > 0 && (
        <select className={select} value={filter.tag ?? ""} aria-label={t("bank.tag")} onChange={(e) => set({ tag: e.target.value })} data-bank-tag="">
          <option value="">{t("bank.allTags")}</option>
          {facets.tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      )}
    </div>
  );
}

/** One saved question: its text (with formulas), what it is filed under, and the caller's buttons. */
export function BankRow({ item, lead, actions, children }: { item: BankItem; lead?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  const t = useT();
  const typeName = useTypeName();
  const empty = summaryOf(item.question) === "";
  return (
    <li className="rounded-2xl border bg-card p-4 shadow-sm" data-bank-item={item.id} data-bank-type-of={item.type}>
      <div className="flex items-start gap-3">
        {lead}
        <SubjectIcon id={item.subject} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-3 text-[15px] leading-relaxed break-words" data-bank-text="">
            {empty ? <span className="text-muted-foreground">{typeName(item.subject, item.type)}</span> : <RichTextView value={item.question.text} />}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{typeName(item.subject, item.type)}</span>
            <span aria-hidden="true">·</span>
            <span>{t(`subject.${item.subject}`)}</span>
            {item.grade && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t("bank.gradeOf", { grade: item.grade })}</span>
              </>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-soft-foreground" data-bank-tag-chip="">
                {tag}
              </span>
            ))}
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap justify-end gap-1">{actions}</div>}
      </div>
      {children}
    </li>
  );
}
