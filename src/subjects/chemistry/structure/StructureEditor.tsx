"use client";

import { Eraser } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { FieldLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/features/editor/questions/QuestionMedia";
import { useT } from "@/i18n/language";
import type { StructureDiagram } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { allEdges } from "@/subjects/physics/diagrams/geometry";
import { parseEdge } from "@/lib/gridEdges";
import { allPoints, structurePoint, structureViewBox } from "./geometry";
import { STRUCTURE_LIMITS, STRUCTURE_TEMPLATES, fitStructure, parsePoint } from "./normalize";
import { StructureDrawing } from "./StructureView";

const ATOMS = ["C", "H", "O", "N", "Cl", "Br", "S", "OH", "CH3", "COOH", "NH2"];
type Tool = string | "eraser";

/** A rounded click area over the gap between two neighbouring dots. */
function gapRect(at: string, structure: StructureDiagram) {
  const edge = parseEdge(at, structure.cols, structure.rows);
  if (!edge) return null;
  const a = structurePoint(edge.x, edge.y);
  const b = edge.dir === "h" ? structurePoint(edge.x + 1, edge.y) : structurePoint(edge.x, edge.y + 1);
  const half = 9;
  const shrink = 14;
  return edge.dir === "v"
    ? { x: a.x - half, y: a.y + shrink, width: 2 * half, height: b.y - a.y - 2 * shrink }
    : { x: a.x + shrink, y: a.y - half, width: b.x - a.x - 2 * shrink, height: 2 * half };
}

/**
 * Drawing a structural formula: pick an atom, click a dot to put it there;
 * click the gap between two dots for a bond (click again: double, triple,
 * none). Or start from a ready-made molecule.
 */
export function StructureEditor({ structure, onChange }: { structure: StructureDiagram; onChange: (structure: StructureDiagram) => void }) {
  const t = useT();
  const [tool, setTool] = useState<Tool>("C");
  const [custom, setCustom] = useState("");
  const box = structureViewBox(structure, true);

  function clickPoint(at: string) {
    const rest = structure.atoms.filter((a) => a.at !== at);
    const existing = structure.atoms.find((a) => a.at === at);
    if (tool === "eraser" || existing?.label === tool) onChange({ ...structure, atoms: rest });
    else onChange({ ...structure, atoms: [...rest, { at, label: tool }] });
  }

  function clickGap(at: string) {
    const existing = structure.bonds.find((b) => b.at === at);
    const rest = structure.bonds.filter((b) => b.at !== at);
    if (tool === "eraser" || existing?.order === 3) onChange({ ...structure, bonds: rest });
    else onChange({ ...structure, bonds: [...rest, { at, order: ((existing?.order ?? 0) + 1) as 1 | 2 | 3 }] });
  }

  const onKey = (action: () => void) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const toolClass = (active: boolean) =>
    cn(
      "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border bg-card px-2 text-sm font-semibold text-foreground transition-colors hover:border-primary-soft-border hover:bg-primary-soft/50",
      active && "border-ring bg-primary-soft/70 ring-1 ring-ring",
    );

  return (
    <div className="space-y-4" data-structure-editor="">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm text-muted-foreground">{t("matching.templates")}</span>
        {STRUCTURE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            data-structure-template={template.id}
            onClick={() => onChange(template.make())}
            className="rounded-lg border bg-card px-2.5 py-1 text-sm text-soft-foreground transition-colors hover:border-primary-soft-border hover:bg-primary-soft/50"
          >
            {t(`structure.template.${template.id}`)}
          </button>
        ))}
      </div>

      <div>
        <FieldLabel>{t("structure.atom")}</FieldLabel>
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t("structure.atom")}>
          {ATOMS.map((atom) => (
            <button key={atom} type="button" role="radio" aria-checked={tool === atom} data-atom-tool={atom} onClick={() => setTool(atom)} className={toolClass(tool === atom)}>
              {atom}
            </button>
          ))}
          <Input
            className="h-9 w-20"
            value={custom}
            maxLength={STRUCTURE_LIMITS.label}
            placeholder={t("structure.custom")}
            aria-label={t("structure.custom")}
            onChange={(e) => {
              setCustom(e.target.value);
              if (e.target.value.trim()) setTool(e.target.value.trim());
            }}
          />
          <button type="button" role="radio" aria-checked={tool === "eraser"} onClick={() => setTool("eraser")} className={toolClass(tool === "eraser")} aria-label={t("circuit.part.eraser")}>
            <Eraser className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("structure.hint")}</p>
      </div>

      <div className="paper overflow-x-auto rounded-xl border p-2">
        <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} className="mx-auto block max-h-80 w-full" style={{ minWidth: `${Math.min(box.width, 480)}px` }}>
          {allPoints(structure.cols, structure.rows).map((at) => {
            const p = parsePoint(at, structure.cols, structure.rows)!;
            const { x, y } = structurePoint(p.x, p.y);
            return <circle key={at} cx={x} cy={y} r={2.5} className="fill-neutral-300" />;
          })}
          <StructureDrawing structure={structure} />
          {allEdges(structure.cols, structure.rows).map((at) => {
            const rect = gapRect(at, structure);
            if (!rect) return null;
            return (
              <g key={at} role="button" tabIndex={0} aria-label={t("structure.bondAt", { place: at })} onClick={() => clickGap(at)} onKeyDown={onKey(() => clickGap(at))} className="group cursor-pointer outline-none" data-bond-gap={at}>
                <rect {...rect} rx={8} className="fill-transparent transition-colors group-hover:fill-brand/15 group-focus-visible:fill-brand/30" />
              </g>
            );
          })}
          {allPoints(structure.cols, structure.rows).map((at) => {
            const p = parsePoint(at, structure.cols, structure.rows)!;
            const { x, y } = structurePoint(p.x, p.y);
            return (
              <g key={at} role="button" tabIndex={0} aria-label={t("structure.atomAt", { place: at })} onClick={() => clickPoint(at)} onKeyDown={onKey(() => clickPoint(at))} className="group cursor-pointer outline-none" data-atom-point={at}>
                <rect x={x - 13} y={y - 13} width={26} height={26} rx={13} className="fill-transparent transition-colors group-hover:fill-brand/15 group-focus-visible:fill-brand/30" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Stepper label={t("grid.cols")} value={structure.cols} min={STRUCTURE_LIMITS.minCols} max={STRUCTURE_LIMITS.maxCols} onChange={(cols) => onChange(fitStructure(structure, cols, structure.rows))} />
        <Stepper label={t("grid.rows")} value={structure.rows} min={STRUCTURE_LIMITS.minRows} max={STRUCTURE_LIMITS.maxRows} onChange={(rows) => onChange(fitStructure(structure, structure.cols, rows))} />
      </div>
    </div>
  );
}
