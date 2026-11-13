"use client";

import { Plus, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl, inputClasses } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { HUMAN_TAXONOMY, KEY_LIMITS, keyTree, leafCount, looseLeads, removeCouplet } from "@/lib/dichotomous";
import { newId } from "@/lib/ids";
import type { DichotomousKeyQuestion, KeyCouplet, KeyLead, TaxonomyQuestion } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { KeyPrint, TaxonomyPrint } from "./ClassificationPrint";

/**
 * Dichotomous key: numbered yes/no questions. Each answer either goes on to
 * another question or names an organism (which can be left for students).
 */
export function KeyEditor({ question, onChange }: { question: DichotomousKeyQuestion; onChange: (question: DichotomousKeyQuestion) => void }) {
  const t = useT();
  const setCouplet = (id: string, changes: Partial<KeyCouplet>) => onChange({ ...question, couplets: question.couplets.map((c) => (c.id === id ? { ...c, ...changes } : c)) });
  const loose = looseLeads(question.couplets);
  const tree = keyTree(question);
  const tooWide = question.style === "tree" && tree && leafCount(tree) > KEY_LIMITS.treeLeaves;

  const leadEditor = (couplet: KeyCouplet, side: "yes" | "no") => {
    const lead = couplet[side];
    const setLead = (changes: Partial<KeyLead>) => setCouplet(couplet.id, { [side]: { ...lead, ...changes } });
    return (
      <div className="flex flex-wrap items-center gap-2" data-lead={side}>
        <span className="w-10 font-semibold text-soft-foreground">{t(side === "yes" ? "key.yes" : "key.no")}</span>
        <select
          className={cn(inputClasses, "h-9 w-auto text-sm")}
          value={lead.next ?? ""}
          aria-label={t("key.goesTo")}
          onChange={(e) => setLead({ next: e.target.value || null })}
        >
          <option value="">{t("key.organism")}</option>
          {question.couplets.map((c, i) =>
            c.id === couplet.id ? null : (
              <option key={c.id} value={c.id}>
                {t("key.toQuestion", { number: i + 1 })}
              </option>
            ),
          )}
        </select>
        {!lead.next && (
          <>
            <Input className="h-9 w-44" maxLength={40} value={lead.organism} placeholder={t("key.organismPlaceholder")} onChange={(e) => setLead({ organism: e.target.value })} />
            <label className="flex items-center gap-1.5 text-soft-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={lead.hide} onChange={(e) => setLead({ hide: e.target.checked })} />
              {t("key.hide")}
            </label>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 text-sm" data-key-editor="">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-soft-foreground">{t("key.style")}:</span>
        <SegmentedControl<DichotomousKeyQuestion["style"]>
          label={t("key.style")}
          value={question.style}
          onChange={(style) => onChange({ ...question, style })}
          options={[
            { value: "list", label: t("key.list") },
            { value: "tree", label: t("key.tree") },
          ]}
        />
      </div>
      <ol className="space-y-2">
        {question.couplets.map((c, i) => (
          <li key={c.id} className="space-y-2 rounded-xl border bg-card p-3" data-couplet="">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <Input className="h-9 flex-1" maxLength={120} value={c.question} placeholder={t("key.questionPlaceholder")} onChange={(e) => setCouplet(c.id, { question: e.target.value })} />
              <IconButton label={t("key.remove")} tone="danger" disabled={question.couplets.length <= 1} onClick={() => onChange({ ...question, couplets: removeCouplet(question.couplets, c.id) })}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="space-y-1.5 pl-9">
              {leadEditor(c, "yes")}
              {leadEditor(c, "no")}
            </div>
          </li>
        ))}
      </ol>
      {question.couplets.length < KEY_LIMITS.couplets && (
        <button
          type="button"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          onClick={() =>
            onChange({
              ...question,
              couplets: [...question.couplets, { id: newId(), question: "", yes: { next: null, organism: "", hide: false }, no: { next: null, organism: "", hide: false } }],
            })
          }
          data-add-couplet=""
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("key.add")}
        </button>
      )}
      {loose > 0 && <p className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-warning-text">{t("key.loose", { count: loose })}</p>}
      {tooWide && <p className="text-muted-foreground">{t("key.tooWide", { count: KEY_LIMITS.treeLeaves })}</p>}
      <div className="paper overflow-x-auto rounded-xl border p-3 text-[15px]">
        <KeyPrint question={question} answerKey />
      </div>
    </div>
  );
}

/** Taxonomy: the organism and its eight ranks; tick the ones students write. */
export function TaxonomyEditor({ question, onChange }: { question: TaxonomyQuestion; onChange: (question: TaxonomyQuestion) => void }) {
  const t = useT();
  const setRank = (index: number, changes: Partial<TaxonomyQuestion["ranks"][number]>) =>
    onChange({ ...question, ranks: question.ranks.map((r, i) => (i === index ? { ...r, ...changes } : r)) });
  return (
    <div className="space-y-4 text-sm" data-taxonomy-editor="">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-soft-foreground">{t("tax.organism")}</span>
          <Input className="h-9 w-52" maxLength={60} value={question.organism} onChange={(e) => onChange({ ...question, organism: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-soft-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={question.plants} onChange={(e) => onChange({ ...question, plants: e.target.checked })} />
          {t("tax.plants")}
        </label>
        <button
          type="button"
          className={buttonVariants({ variant: "outline", size: "sm" })}
          onClick={() => onChange({ ...question, organism: HUMAN_TAXONOMY.organism, plants: false, ranks: question.ranks.map((r) => ({ ...r, value: HUMAN_TAXONOMY.ranks[r.rank] })) })}
        >
          {t("tax.example")}
        </button>
      </div>
      <ol className="space-y-1.5">
        {question.ranks.map((r, i) => (
          <li key={r.rank} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2" data-rank={r.rank}>
            <span className="text-soft-foreground">{t(r.rank === "phylum" && question.plants ? "tax.division" : `tax.${r.rank}`)}</span>
            <Input className="h-9" maxLength={60} value={r.value} onChange={(e) => setRank(i, { value: e.target.value })} />
            <label className="flex items-center gap-1.5 text-soft-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={r.hide} onChange={(e) => setRank(i, { hide: e.target.checked })} />
              {t("tax.hide")}
            </label>
          </li>
        ))}
      </ol>
      <div className="paper rounded-xl border p-3 text-[15px]">
        <TaxonomyPrint question={question} answerKey={false} />
      </div>
    </div>
  );
}
