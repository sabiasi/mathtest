"use client";

import { CircleAlert, CircleCheck, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { checkBalance } from "@/lib/chem";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { BalanceQuestion } from "@/lib/storage/types";
import { RowControls, addButtonClass, move } from "@/subjects/history/editors/RowControls";
import { EquationWithBoxes } from "./BalancePrint";

/**
 * Balance the equation: the teacher types the BALANCED equation
 * ("2H2 + O2 -> 2H2O"). We check it really is balanced, and show what
 * students will see: an empty box before each substance.
 */
export function BalanceEditor({ question, onChange }: { question: BalanceQuestion; onChange: (question: BalanceQuestion) => void }) {
  const t = useT();
  const { equations } = question;
  return (
    <div className="space-y-3" data-balance-editor="">
      <p className="text-sm text-muted-foreground">{t("balance.hint")}</p>
      <ol className="space-y-3">
        {equations.map((equation, index) => {
          const check = equation.balanced.trim() ? checkBalance(equation.balanced) : null;
          return (
            <li key={equation.id} className="space-y-2 rounded-xl border bg-card p-3" data-equation="">
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right font-semibold text-soft-foreground">{index + 1})</span>
                <Input
                  className="h-9 min-w-0 flex-1 font-mono text-sm"
                  value={equation.balanced}
                  maxLength={300}
                  spellCheck={false}
                  placeholder="2H2 + O2 -> 2H2O"
                  aria-label={t("balance.equation", { number: index + 1 })}
                  onChange={(e) => onChange({ ...question, equations: equations.map((x) => (x.id === equation.id ? { ...x, balanced: e.target.value } : x)) })}
                />
                <RowControls
                  index={index}
                  count={equations.length}
                  min={1}
                  onMove={(by) => onChange({ ...question, equations: move(equations, index, by) })}
                  onRemove={() => onChange({ ...question, equations: equations.filter((x) => x.id !== equation.id) })}
                />
              </div>
              {check && (
                <div className="ml-8 space-y-1.5">
                  <div className="paper overflow-x-auto rounded-lg border px-3 py-2 text-[15px]" aria-hidden="true">
                    <EquationWithBoxes source={equation.balanced} answerKey />
                  </div>
                  {check.status === "balanced" ? (
                    <p className="flex items-center gap-1.5 text-sm text-success-text" data-balance-status="ok">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      {t("balance.ok")}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm text-warning-text" data-balance-status="problem">
                      <CircleAlert className="size-4" aria-hidden="true" />
                      {check.status === "unreadable"
                        ? t("balance.unreadable")
                        : t("balance.notBalanced", { details: check.differences.map((d) => `${d.element}: ${d.left} → ${d.right}`).join(", ") })}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={`${addButtonClass} ml-6`}
        disabled={equations.length >= LIMITS.equations}
        onClick={() => onChange({ ...question, equations: [...equations, { id: newId(), balanced: "" }] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("balance.add")}
      </button>
    </div>
  );
}
