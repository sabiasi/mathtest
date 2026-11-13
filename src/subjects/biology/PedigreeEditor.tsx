"use client";

import { ArrowLeft, ArrowRight, Baby, HeartHandshake, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import {
  addChild,
  addFirstCouple,
  addPartner,
  canAddChild,
  canAddPartner,
  coupleOf,
  movePerson,
  personNumbers,
  removePerson,
} from "@/lib/pedigree";
import type { PedigreePerson, PedigreeQuestion } from "@/lib/storage/types";
import { PedigreeChart, PedigreeLegend } from "./GeneticsPrint";

/**
 * Pedigree chart: click a person to change them (sex, affected / carrier,
 * a genotype under the symbol, or a box where students write it), add a
 * husband / wife or a child, move left / right, or remove.
 */
export function PedigreeEditor({ question, onChange }: { question: PedigreeQuestion; onChange: (question: PedigreeQuestion) => void }) {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = question.people.find((p) => p.id === selectedId) ?? null;
  const numbers = personNumbers(question);
  const couple = selected ? coupleOf(question, selected.id) : undefined;

  const apply = (next: Pick<PedigreeQuestion, "people" | "couples">, select?: string | null) => {
    onChange({ ...question, ...next });
    if (select !== undefined) setSelectedId(select);
  };
  const setPerson = (changes: Partial<PedigreePerson>) =>
    selected && onChange({ ...question, people: question.people.map((p) => (p.id === selected.id ? { ...p, ...changes } : p)) });
  const action = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="space-y-4" data-pedigree-editor="">
      <p className="text-sm text-muted-foreground">{t("pedigree.hint")}</p>
      {question.people.length > 0 ? (
        <div className="paper overflow-x-auto rounded-xl border p-3">
          <PedigreeChart question={question} answerKey={false} selected={selectedId} onSelect={(id) => setSelectedId(id === selectedId ? null : id)} />
          {question.legend && <PedigreeLegend question={question} />}
        </div>
      ) : null}
      <button
        type="button"
        className={action}
        onClick={() => {
          const ids: string[] = [];
          const next = addFirstCouple(question, () => {
            const id = newId();
            ids.push(id);
            return id;
          });
          apply(next, ids[0] ?? null);
        }}
        data-add-couple=""
      >
        <UserPlus className="size-4" aria-hidden="true" />
        {t("pedigree.addCouple")}
      </button>

      {selected && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-3 text-sm" data-person-panel="">
          <p className="font-semibold text-foreground">{t("pedigree.person", { number: numbers.get(selected.id) ?? "" })}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <SegmentedControl<PedigreePerson["sex"]>
              label={t("pedigree.sex")}
              value={selected.sex}
              onChange={(sex) => setPerson({ sex })}
              options={[
                { value: "male", label: `□ ${t("pedigree.male")}` },
                { value: "female", label: `○ ${t("pedigree.female")}` },
                { value: "unknown", label: `◇ ${t("pedigree.unknown")}` },
              ]}
            />
            <SegmentedControl<PedigreePerson["status"]>
              label={t("pedigree.status")}
              value={selected.status}
              onChange={(status) => setPerson({ status })}
              options={[
                { value: "unaffected", label: t("pedigree.unaffected") },
                { value: "affected", label: t("pedigree.affected") },
                { value: "carrier", label: t("pedigree.carrierShort") },
              ]}
            />
            <label className="flex items-center gap-2 text-soft-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={selected.deceased} onChange={(e) => setPerson({ deceased: e.target.checked })} />
              {t("pedigree.deceased")}
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-soft-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={selected.ask} onChange={(e) => setPerson({ ask: e.target.checked })} data-person-ask="" />
              {t("pedigree.ask")}
            </label>
            {selected.ask ? (
              <Input className="h-9" maxLength={20} value={selected.answer} placeholder={t("pedigree.answerPlaceholder")} onChange={(e) => setPerson({ answer: e.target.value })} data-person-answer="" />
            ) : (
              <Input className="h-9" maxLength={20} value={selected.text} placeholder={t("pedigree.textPlaceholder")} onChange={(e) => setPerson({ text: e.target.value })} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canAddPartner(question, selected.id) && (
              <button type="button" className={action} onClick={() => apply(addPartner(question, selected.id, newId))} data-add-partner="">
                <HeartHandshake className="size-4" aria-hidden="true" />
                {t("pedigree.addPartner")}
              </button>
            )}
            {couple && canAddChild(question, couple.id) && (
              <button type="button" className={action} onClick={() => apply(addChild(question, couple.id, newId))} data-add-child="">
                <Baby className="size-4" aria-hidden="true" />
                {t("pedigree.addChild")}
              </button>
            )}
            <button type="button" className={action} aria-label={t("pedigree.moveLeft")} onClick={() => apply(movePerson(question, selected.id, -1))}>
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className={action} aria-label={t("pedigree.moveRight")} onClick={() => apply(movePerson(question, selected.id, 1))}>
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive-text hover:bg-destructive-soft hover:text-destructive-text" })}
              onClick={() => apply(removePerson(question, selected.id), null)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t("pedigree.remove")}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-soft-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-primary" checked={question.legend} onChange={(e) => onChange({ ...question, legend: e.target.checked })} />
          {t("pedigree.legend")}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-primary" checked={question.numbers} onChange={(e) => onChange({ ...question, numbers: e.target.checked })} />
          {t("pedigree.numbers")}
        </label>
      </div>
    </div>
  );
}
