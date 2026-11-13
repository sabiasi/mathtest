"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MoveRight, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { inputClasses } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { WEB_LIMITS, addArrow, freeCell, moveOrganism, removeOrganism, sampleChain, samplePyramid, sampleWeb, type PyramidKind } from "@/lib/ecology";
import { newId } from "@/lib/ids";
import type { FoodWebQuestion, PyramidLevel, PyramidQuestion } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { FoodWebChart, PyramidPrint } from "./EcologyPrint";

/**
 * Food chain / web: organisms on a grid. Click one to rename it, hide it
 * (an empty box for students), move it, or draw an arrow to another one
 * (food → eater, the way energy flows).
 */
export function FoodWebEditor({ question, onChange }: { question: FoodWebQuestion; onChange: (question: FoodWebQuestion) => void }) {
  const t = useT();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const selected = question.organisms.find((o) => o.id === selectedId) ?? null;
  const nameOf = (id: string) => question.organisms.find((o) => o.id === id)?.name || "?";
  const action = buttonVariants({ variant: "outline", size: "sm" });

  function select(id: string) {
    if (connecting && selectedId && id !== selectedId) {
      onChange({ ...question, ...addArrow(question, selectedId, id, newId) });
      setConnecting(false);
      return;
    }
    setConnecting(false);
    setSelectedId(id === selectedId ? null : id);
  }

  async function applySample(kind: "chain" | "web") {
    if (question.organisms.length > 0 && !(await confirm({ title: t("web.replaceTitle"), message: t("web.replace"), confirmLabel: t("dialog.continue") }))) return;
    onChange({ ...question, ...(kind === "chain" ? sampleChain(newId) : sampleWeb(newId)) });
    setSelectedId(null);
  }

  function addOrganism() {
    const cell = freeCell(question.organisms, selected?.row ?? 0);
    if (!cell || question.organisms.length >= WEB_LIMITS.organisms) return;
    const organism = { id: newId(), name: t("web.newName"), col: cell.col, row: cell.row, hidden: false };
    onChange({ ...question, organisms: [...question.organisms, organism] });
    setSelectedId(organism.id);
  }

  const setSelected = (changes: Partial<FoodWebQuestion["organisms"][number]>) =>
    selected && onChange({ ...question, organisms: question.organisms.map((o) => (o.id === selected.id ? { ...o, ...changes } : o)) });
  const move = (dCol: number, dRow: number) => selected && onChange({ ...question, ...moveOrganism(question, selected.id, dCol, dRow) });

  return (
    <div className="space-y-4" data-food-web-editor="">
      <p className="text-sm text-muted-foreground">{t("web.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={action} onClick={() => void applySample("chain")}>
          {t("web.sampleChain")}
        </button>
        <button type="button" className={action} onClick={() => void applySample("web")}>
          {t("web.sampleWeb")}
        </button>
        <button type="button" className={action} onClick={addOrganism} disabled={question.organisms.length >= WEB_LIMITS.organisms} data-add-organism="">
          <Plus className="size-4" aria-hidden="true" />
          {t("web.add")}
        </button>
      </div>
      {question.organisms.length > 0 && (
        <div className={cn("paper overflow-x-auto rounded-xl border p-3", connecting && "ring-2 ring-ring")}>
          <FoodWebChart question={question} answerKey={false} selected={selectedId} onSelect={select} />
        </div>
      )}
      {connecting && <p className="text-sm font-medium text-brand">{t("web.connecting", { name: selected?.name ?? "" })}</p>}

      {selected && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-3 text-sm" data-organism-panel="">
          <div className="flex flex-wrap items-center gap-3">
            <Input className="h-9 w-56" maxLength={40} value={selected.name} aria-label={t("web.name")} onChange={(e) => setSelected({ name: e.target.value })} data-organism-name="" />
            <label className="flex items-center gap-2 text-soft-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={selected.hidden} onChange={(e) => setSelected({ hidden: e.target.checked })} data-organism-hidden="" />
              {t("web.hidden")}
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonVariants({ variant: connecting ? "default" : "outline", size: "sm" })} onClick={() => setConnecting(!connecting)} data-connect="">
              <MoveRight className="size-4" aria-hidden="true" />
              {t("web.arrow")}
            </button>
            {(
              [
                [ArrowLeft, -1, 0, "web.left"],
                [ArrowRight, 1, 0, "web.right"],
                [ArrowUp, 0, -1, "web.up"],
                [ArrowDown, 0, 1, "web.down"],
              ] as const
            ).map(([Icon, dCol, dRow, label]) => (
              <button key={label} type="button" className={action} aria-label={t(label)} onClick={() => move(dCol, dRow)}>
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive-text hover:bg-destructive-soft hover:text-destructive-text" })}
              onClick={() => {
                onChange({ ...question, ...removeOrganism(question, selected.id) });
                setSelectedId(null);
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t("web.remove")}
            </button>
          </div>
          {question.arrows.some((a) => a.from === selected.id || a.to === selected.id) && (
            <ul className="flex flex-wrap gap-2">
              {question.arrows
                .filter((a) => a.from === selected.id || a.to === selected.id)
                .map((a) => (
                  <li key={a.id} className="inline-flex items-center gap-1 rounded-lg bg-card px-2 py-1 shadow-xs">
                    {nameOf(a.from)} → {nameOf(a.to)}
                    <IconButton label={t("web.removeArrow")} tone="danger" className="p-1" onClick={() => onChange({ ...question, arrows: question.arrows.filter((x) => x.id !== a.id) })}>
                      <X className="size-3.5" aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-soft-foreground">
        <input type="checkbox" className="size-4 accent-primary" checked={question.legend} onChange={(e) => onChange({ ...question, legend: e.target.checked })} />
        {t("web.legendOption")}
      </label>
    </div>
  );
}

const HIDE_OPTIONS: PyramidLevel["hide"][] = ["none", "name", "value", "both"];

/** Ecological pyramid: levels from the bottom (producers) up; choose what students fill in. */
export function PyramidEditor({ question, onChange }: { question: PyramidQuestion; onChange: (question: PyramidQuestion) => void }) {
  const t = useT();
  const confirm = useConfirm();
  const setLevel = (id: string, changes: Partial<PyramidLevel>) => onChange({ ...question, levels: question.levels.map((l) => (l.id === id ? { ...l, ...changes } : l)) });

  async function applySample(kind: PyramidKind) {
    if (question.levels.some((l) => l.name || l.value) && !(await confirm({ title: t("web.replaceTitle"), message: t("pyramid.replace"), confirmLabel: t("dialog.continue") }))) return;
    onChange({ ...question, levels: samplePyramid(kind, newId) });
  }

  return (
    <div className="space-y-4" data-pyramid-editor="">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("pyramid.samples")}</span>
        {(["energy", "biomass", "numbers"] as const).map((kind) => (
          <button key={kind} type="button" className={buttonVariants({ variant: "outline", size: "sm" })} onClick={() => void applySample(kind)}>
            {t(`pyramid.${kind}`)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{t("pyramid.hint")}</p>
      <ol className="space-y-2">
        {question.levels.map((level, i) => (
          <li key={level.id} className="grid gap-2 rounded-xl border bg-card p-2 sm:grid-cols-[2rem_1fr_1fr_1fr_auto_auto]" data-pyramid-level="">
            <span className="flex items-center justify-center font-semibold text-muted-foreground">{i + 1}</span>
            <Input className="h-9" maxLength={40} value={level.level} placeholder={t("pyramid.level")} aria-label={t("pyramid.level")} onChange={(e) => setLevel(level.id, { level: e.target.value })} />
            <Input className="h-9" maxLength={40} value={level.name} placeholder={t("pyramid.name")} aria-label={t("pyramid.name")} onChange={(e) => setLevel(level.id, { name: e.target.value })} />
            <Input className="h-9" maxLength={30} value={level.value} placeholder={t("pyramid.value")} aria-label={t("pyramid.value")} onChange={(e) => setLevel(level.id, { value: e.target.value })} />
            <select
              className={cn(inputClasses, "h-9 w-auto text-sm")}
              value={level.hide}
              aria-label={t("pyramid.hide")}
              onChange={(e) => setLevel(level.id, { hide: e.target.value as PyramidLevel["hide"] })}
            >
              {HIDE_OPTIONS.map((hide) => (
                <option key={hide} value={hide}>
                  {t(`pyramid.hide.${hide}`)}
                </option>
              ))}
            </select>
            <IconButton label={t("pyramid.remove")} tone="danger" disabled={question.levels.length <= 2} onClick={() => onChange({ ...question, levels: question.levels.filter((l) => l.id !== level.id) })}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ol>
      {question.levels.length < WEB_LIMITS.levels && (
        <button
          type="button"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          onClick={() => onChange({ ...question, levels: [...question.levels, { id: newId(), level: "", name: "", value: "", hide: "none" }] })}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("pyramid.add")}
        </button>
      )}
      <div className="paper rounded-xl border p-3 text-[15px]">
        <PyramidPrint question={question} answerKey={false} />
      </div>
    </div>
  );
}
