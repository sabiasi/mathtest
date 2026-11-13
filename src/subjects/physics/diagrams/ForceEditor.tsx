"use client";

import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { FieldLabel, SegmentedControl } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import type { ForceArrow, ForceDiagram } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { ForceDrawing } from "./DiagramView";
import { forceLayout, presetAngle, reorientForces } from "./geometry";
import { INCLINE_LIMITS, MAX_FORCES, MAX_LABEL } from "./normalize";

const DIRECTIONS: { angle: number; Icon: LucideIcon }[] = [
  { angle: 0, Icon: ArrowRight },
  { angle: 45, Icon: ArrowUpRight },
  { angle: 90, Icon: ArrowUp },
  { angle: 135, Icon: ArrowUpLeft },
  { angle: 180, Icon: ArrowLeft },
  { angle: 225, Icon: ArrowDownLeft },
  { angle: 270, Icon: ArrowDown },
  { angle: 315, Icon: ArrowDownRight },
];

const PRESETS = ["gravity", "normal", "friction", "push", "tension"] as const;

/**
 * A body (box or ball) on nothing, a floor or an incline, with force
 * arrows from its centre. Quick buttons add the usual forces pointing the
 * right way; each arrow's direction, length and letter can be changed.
 */
export function ForceEditor({ diagram, onChange }: { diagram: ForceDiagram; onChange: (diagram: ForceDiagram) => void }) {
  const t = useT();
  const { viewBox } = forceLayout(diagram);
  const set = (changes: Partial<ForceDiagram>) => onChange({ ...diagram, ...changes });
  /** Surface / angle changes: N, friction and pull turn with the surface. */
  const setSurface = (changes: Partial<ForceDiagram>) => onChange(reorientForces(diagram, { ...diagram, ...changes }));
  const setForce = (id: string, changes: Partial<ForceArrow>) =>
    set({ forces: diagram.forces.map((f) => (f.id === id ? { ...f, ...changes } : f)) });
  const full = diagram.forces.length >= MAX_FORCES;

  function addPreset(kind: (typeof PRESETS)[number]) {
    if (full) return;
    const force: ForceArrow = { id: newId(), angle: presetAngle(kind, diagram), length: 2, label: t(`forces.preset.${kind}Label`) };
    set({ forces: [...diagram.forces, force] });
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_15rem]" data-force-editor="">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div>
            <FieldLabel>{t("forces.body")}</FieldLabel>
            <SegmentedControl
              label={t("forces.body")}
              value={diagram.body}
              onChange={(body) => set({ body })}
              options={[
                { value: "box", label: t("forces.box") },
                { value: "ball", label: t("forces.ball") },
              ]}
            />
          </div>
          <div>
            <FieldLabel>{t("forces.surface")}</FieldLabel>
            <SegmentedControl
              label={t("forces.surface")}
              value={diagram.surface}
              onChange={(surface) => setSurface({ surface })}
              options={[
                { value: "none", label: t("forces.none") },
                { value: "floor", label: t("forces.floor") },
                { value: "incline", label: t("forces.incline") },
              ]}
            />
          </div>
        </div>

        {diagram.surface === "incline" && (
          <label className="flex max-w-sm items-center gap-3 text-sm text-soft-foreground">
            {t("forces.angle")}
            <input
              type="range"
              min={INCLINE_LIMITS.min}
              max={INCLINE_LIMITS.max}
              step={5}
              value={diagram.inclineAngle}
              onChange={(e) => setSurface({ inclineAngle: Number(e.target.value) })}
              className="min-w-0 flex-1 accent-primary"
            />
            <span className="w-10 text-right font-semibold tabular-nums">{diagram.inclineAngle}°</span>
          </label>
        )}

        <div>
          <FieldLabel>{t("forces.add")}</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={full}
                onClick={() => addPreset(kind)}
                data-preset={kind}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-sm text-soft-foreground transition-colors hover:border-primary-soft-border hover:bg-primary-soft/50 disabled:opacity-40"
              >
                <Plus className="size-3.5 text-brand" aria-hidden="true" />
                {t(`forces.preset.${kind}`)}
              </button>
            ))}
          </div>
        </div>

        {diagram.forces.length > 0 && (
          <ul className="space-y-2" aria-label={t("forces.list")}>
            {diagram.forces.map((force) => (
              <li key={force.id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2" data-force-row="">
                <Input
                  className="h-9 w-20"
                  value={force.label}
                  maxLength={MAX_LABEL}
                  aria-label={t("forces.label")}
                  onChange={(e) => setForce(force.id, { label: e.target.value })}
                />
                <div className="flex flex-wrap gap-0.5" role="group" aria-label={t("forces.direction")}>
                  {DIRECTIONS.map(({ angle, Icon }) => (
                    <button
                      key={angle}
                      type="button"
                      aria-label={t("forces.degrees", { angle })}
                      aria-pressed={force.angle === angle}
                      onClick={() => setForce(force.id, { angle })}
                      className={cn(
                        "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground pointer-coarse:p-2",
                        force.angle === angle && "bg-primary-soft text-brand",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Input
                    className="h-9 w-16 px-2 tabular-nums"
                    inputMode="numeric"
                    value={force.angle}
                    aria-label={t("forces.direction")}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, "").slice(0, 3));
                      setForce(force.id, { angle: ((n % 360) + 360) % 360 });
                    }}
                  />
                  °
                </label>
                <SegmentedControl
                  label={t("forces.length")}
                  value={String(force.length)}
                  onChange={(value) => setForce(force.id, { length: Number(value) as 1 | 2 | 3 })}
                  options={[
                    { value: "1", label: t("forces.short") },
                    { value: "2", label: t("forces.medium") },
                    { value: "3", label: t("forces.long") },
                  ]}
                />
                <IconButton label={t("forces.remove")} tone="danger" className="ml-auto" onClick={() => set({ forces: diagram.forces.filter((f) => f.id !== force.id) })}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}

        <label className="flex items-center gap-2 text-sm text-soft-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={diagram.vectorLabels} onChange={(e) => set({ vectorLabels: e.target.checked })} />
          {t("forces.vectorLabels")}
        </label>
        <p className="text-sm text-muted-foreground">{t("forces.labelHint")}</p>
      </div>

      {/* ---- Preview ---- */}
      <div className="paper self-start rounded-xl border p-3 md:sticky md:top-0">
        <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} className="mx-auto block max-h-80 w-full">
          <ForceDrawing diagram={diagram} />
        </svg>
      </div>
    </div>
  );
}
