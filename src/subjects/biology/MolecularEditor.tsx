"use client";

import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { MessageKey } from "@/i18n/dictionaries";
import { useT } from "@/i18n/language";
import { MAX_BASES, readSequence } from "@/lib/molecular";
import type { CodonTableQuestion, SequenceQuestion } from "@/lib/storage/types";
import { SequencePrint, sequenceAnswer } from "./MolecularPrint";

const TASKS = ["complement", "mrna", "protein"] as const;
const EXAMPLES = ["TAC CGG AAA ATT", "ATG GCC TTT TAA", "AUG UGG GGA UAA"];

/** A DNA / RNA strand and which rows students complete; the answers are worked out automatically. */
export function SequenceEditor({ question, onChange }: { question: SequenceQuestion; onChange: (question: SequenceQuestion) => void }) {
  const t = useT();
  const read = readSequence(question.given);
  const toggle = (task: (typeof TASKS)[number], on: boolean) =>
    onChange({ ...question, tasks: TASKS.filter((x) => (x === task ? on : question.tasks.includes(x))) });

  return (
    <div className="space-y-4" data-sequence-editor="">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{t("seq.given")}</span>
        <Input
          value={question.given}
          maxLength={MAX_BASES * 2}
          spellCheck={false}
          lang="en"
          className="font-mono uppercase"
          onChange={(e) => onChange({ ...question, given: e.target.value })}
          data-sequence-input=""
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{t("genetics.examples")}</span>
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className={buttonVariants({ variant: "outline", size: "sm", className: "font-mono" })} onClick={() => onChange({ ...question, given: example })}>
            {example}
          </button>
        ))}
      </div>
      {!read.ok ? (
        <p role="alert" className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-text">
          {t(`seq.error.${read.error}` as MessageKey, { detail: read.detail ?? "", max: MAX_BASES })}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(read.kind === "dna" ? "seq.isDna" : "seq.isRna", { count: read.bases.length })}
          {read.bases.length % 3 !== 0 && ` ${t("seq.notTriplets")}`}
        </p>
      )}

      <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
        <p className="font-medium text-soft-foreground">{t("seq.tasks")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-soft-foreground">
          {TASKS.map((task) => (
            <label key={task} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={question.tasks.includes(task)}
                disabled={task === "mrna" && read.ok && read.kind === "rna"}
                onChange={(e) => toggle(task, e.target.checked)}
                data-task={task}
              />
              {t(`seq.task.${task}`)}
            </label>
          ))}
        </div>
        {read.ok && read.kind === "dna" && (question.tasks.includes("mrna") || question.tasks.includes("protein")) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-soft-foreground">{t("seq.strand")}:</span>
            <SegmentedControl<SequenceQuestion["strand"]>
              label={t("seq.strand")}
              value={question.strand}
              onChange={(strand) => onChange({ ...question, strand })}
              options={[
                { value: "template", label: t("seq.template") },
                { value: "coding", label: t("seq.coding") },
              ]}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-soft-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={question.example} onChange={(e) => onChange({ ...question, example: e.target.checked })} />
          {t("seq.example")}
        </label>
      </div>

      {read.ok && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-soft-foreground">{t("seq.preview")}</p>
          <div className="paper overflow-x-auto rounded-xl border p-3 text-[15px]">
            <SequencePrint question={question} answerKey />
          </div>
          <p className="text-xs text-muted-foreground" data-sequence-answer="">
            {sequenceAnswer(question)}
          </p>
        </div>
      )}
    </div>
  );
}

/** The codon table has one option: the amino acids' full names under it. */
export function CodonTableEditor({ question, onChange }: { question: CodonTableQuestion; onChange: (question: CodonTableQuestion) => void }) {
  const t = useT();
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">{t("seq.codonHint")}</p>
      <label className="flex items-center gap-2 text-soft-foreground">
        <input type="checkbox" className="size-4 accent-primary" checked={question.legend} onChange={(e) => onChange({ ...question, legend: e.target.checked })} />
        {t("seq.codonLegend")}
      </label>
    </div>
  );
}
