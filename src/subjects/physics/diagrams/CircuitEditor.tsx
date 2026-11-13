"use client";

import { ArrowLeftRight, Eraser, Trash2 } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { FieldLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/features/editor/questions/QuestionMedia";
import { useT } from "@/i18n/language";
import type { CircuitDiagram, CircuitElement, CircuitPart } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { CircuitDrawing, PartShape } from "./DiagramView";
import { CELL, allEdges, circuitViewBox, dotPoint, edgeEnds } from "./geometry";
import { CIRCUIT_LIMITS, CIRCUIT_PARTS, MAX_LABEL, fitCircuit, parseEdge } from "./normalize";

type Tool = CircuitPart | "eraser";

/**
 * Building a circuit: the drawing is a grid of dots. Pick a part, then click
 * the gap between two dots to put it there. Clicking a part selects it, to
 * give it a label (R1, 6 Ω…) or turn a battery around.
 */
export function CircuitEditor({ circuit, onChange }: { circuit: CircuitDiagram; onChange: (circuit: CircuitDiagram) => void }) {
  const t = useT();
  const [tool, setTool] = useState<Tool>("wire");
  const [selected, setSelected] = useState<string | null>(null);
  const selectedElement = circuit.elements.find((e) => e.at === selected) ?? null;

  const elementAt = (at: string) => circuit.elements.find((e) => e.at === at);
  const setElements = (elements: CircuitElement[]) => onChange({ ...circuit, elements });

  function clickGap(at: string) {
    const existing = elementAt(at);
    if (tool === "eraser") {
      setElements(circuit.elements.filter((e) => e.at !== at));
      if (selected === at) setSelected(null);
      return;
    }
    if (existing?.part === tool) {
      setSelected(at); // already there: just select it (for its label)
      return;
    }
    const element: CircuitElement = { at, part: tool, label: existing?.label ?? "", flipped: false };
    setElements(existing ? circuit.elements.map((e) => (e.at === at ? element : e)) : [...circuit.elements, element]);
    setSelected(tool === "wire" ? null : at);
  }

  function updateSelected(changes: Partial<CircuitElement>) {
    if (!selected) return;
    setElements(circuit.elements.map((e) => (e.at === selected ? { ...e, ...changes } : e)));
  }

  function resize(cols: number, rows: number) {
    const next = fitCircuit(circuit, cols, rows);
    onChange(next);
    if (selected && !parseEdge(selected, cols, rows)) setSelected(null);
  }

  const box = circuitViewBox(circuit, true);
  const tools: Tool[] = [...CIRCUIT_PARTS, "eraser"];

  return (
    <div className="space-y-4" data-circuit-editor="">
      {/* ---- Parts ---- */}
      <div>
        <FieldLabel>{t("circuit.pick")}</FieldLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("circuit.pick")}>
          {tools.map((part) => (
            <button
              key={part}
              type="button"
              role="radio"
              aria-checked={tool === part}
              data-tool={part}
              onClick={() => setTool(part)}
              className={cn(
                "flex w-[4.6rem] flex-col items-center gap-1 rounded-lg border bg-card px-1 py-1.5 text-xs text-soft-foreground transition-colors hover:border-primary-soft-border hover:bg-primary-soft/50",
                tool === part && "border-ring bg-primary-soft/70 text-foreground ring-1 ring-ring",
              )}
            >
              {part === "eraser" ? (
                <Eraser className="h-6 w-6" aria-hidden="true" />
              ) : (
                <svg viewBox={`-4 -18 ${CELL + 8} 36`} className="h-6 w-full" aria-hidden="true">
                  <g stroke="currentColor" strokeWidth={2.4} fill="none" strokeLinecap="round">
                    <PartShape part={part} />
                  </g>
                  {(part === "ammeter" || part === "voltmeter") && (
                    <text x={CELL / 2} y={1} fontSize={15} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="currentColor">
                      {part === "ammeter" ? "A" : "V"}
                    </text>
                  )}
                </svg>
              )}
              <span className="leading-tight">{t(`circuit.part.${part}`)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("circuit.hint")}</p>
      </div>

      {/* ---- The drawing ---- */}
      <div className="paper overflow-x-auto rounded-xl border p-2">
        <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} className="mx-auto block max-h-[22rem] w-full" style={{ minWidth: `${Math.min(box.width, 520)}px` }}>
          {/* Faint dots: where parts can go */}
          {Array.from({ length: circuit.rows + 1 }, (_, y) =>
            Array.from({ length: circuit.cols + 1 }, (_, x) => {
              const p = dotPoint(x, y);
              return <circle key={`${x}:${y}`} cx={p.x} cy={p.y} r={3} className="fill-neutral-300" />;
            }),
          )}
          {/* The selected part glows */}
          {selectedElement && <GapLine at={selectedElement.at} circuit={circuit} className="stroke-brand/25" width={22} />}
          <CircuitDrawing circuit={circuit} />
          {/* Click areas, one per gap (on top, invisible until hovered) */}
          {allEdges(circuit.cols, circuit.rows).map((at) => (
            <GapButton key={at} at={at} circuit={circuit} label={gapLabel(at, elementAt(at))} onClick={() => clickGap(at)} />
          ))}
        </svg>
      </div>

      {/* ---- Selected part + grid size ---- */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {selectedElement && selectedElement.part !== "wire" ? (
          <div className="min-w-56 flex-1 space-y-2">
            <FieldLabel hint={t("circuit.labelHint")}>{t("circuit.label", { part: t(`circuit.part.${selectedElement.part}`) })}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <Input
                className="w-40"
                value={selectedElement.label}
                maxLength={MAX_LABEL}
                placeholder={selectedElement.part === "resistor" ? "R1" : selectedElement.part === "lamp" ? "L1" : ""}
                onChange={(e) => updateSelected({ label: e.target.value })}
                aria-label={t("circuit.label", { part: t(`circuit.part.${selectedElement.part}`) })}
                data-circuit-label=""
              />
              {selectedElement.part === "battery" && (
                <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => updateSelected({ flipped: !selectedElement.flipped })}>
                  <ArrowLeftRight className="size-4" aria-hidden="true" />
                  {t("circuit.flip")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 text-destructive-text hover:bg-destructive-soft hover:text-destructive-text"
                onClick={() => {
                  setElements(circuit.elements.filter((e) => e.at !== selectedElement.at));
                  setSelected(null);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t("circuit.remove")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="min-w-56 flex-1 text-sm text-muted-foreground">{t("circuit.selectHint")}</p>
        )}
        <div className="space-y-2 text-sm">
          <Stepper label={t("grid.cols")} value={circuit.cols} min={CIRCUIT_LIMITS.minCols} max={CIRCUIT_LIMITS.maxCols} onChange={(cols) => resize(cols, circuit.rows)} />
          <Stepper label={t("grid.rows")} value={circuit.rows} min={CIRCUIT_LIMITS.minRows} max={CIRCUIT_LIMITS.maxRows} onChange={(rows) => resize(circuit.cols, rows)} />
        </div>
      </div>
    </div>
  );

  /** What a screen reader says for a gap: "gap 3, resistor R1". */
  function gapLabel(at: string, element: CircuitElement | undefined) {
    const index = allEdges(circuit.cols, circuit.rows).indexOf(at) + 1;
    const what = element ? `${t(`circuit.part.${element.part}`)}${element.label ? ` ${element.label}` : ""}` : t("circuit.empty");
    return t("circuit.gap", { number: index, what });
  }
}

function GapLine({ at, circuit, className, width }: { at: string; circuit: CircuitDiagram; className: string; width: number }) {
  const ends = edgeEnds(at, circuit.cols, circuit.rows);
  if (!ends) return null;
  return <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} strokeWidth={width} strokeLinecap="round" className={className} />;
}

/** An invisible, wide click target over one gap; highlighted on hover or keyboard focus. */
function GapButton({ at, circuit, label, onClick }: { at: string; circuit: CircuitDiagram; label: string; onClick: () => void }) {
  const ends = edgeEnds(at, circuit.cols, circuit.rows);
  if (!ends) return null;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };
  // A rounded box over the gap, a little shorter than it, so neighbouring
  // gaps don't overlap at the dots.
  const shrink = 9;
  const half = 12;
  const vertical = ends[0].x === ends[1].x;
  const rect = vertical
    ? { x: ends[0].x - half, y: ends[0].y + shrink, width: 2 * half, height: ends[1].y - ends[0].y - 2 * shrink }
    : { x: ends[0].x + shrink, y: ends[0].y - half, width: ends[1].x - ends[0].x - 2 * shrink, height: 2 * half };
  return (
    <g role="button" tabIndex={0} aria-label={label} onClick={onClick} onKeyDown={onKeyDown} className="group cursor-pointer outline-none" data-gap={at}>
      <rect
        {...rect}
        rx={half}
        className="fill-transparent transition-colors group-hover:fill-brand/15 group-focus-visible:fill-brand/30"
      />
    </g>
  );
}
