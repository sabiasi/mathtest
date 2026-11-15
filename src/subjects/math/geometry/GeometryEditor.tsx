"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FieldLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import type { GeometryDiagram, GeometryShape } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { sideCount, vertexCount } from "./geometry";
import { GeometryView } from "./GeometryView";
import { GEOMETRY_LIMITS, GEOMETRY_SHAPES, TRIANGLE_PRESETS, cleanLabel, newGeometry, withShape } from "./normalize";

const choiceClass = (active: boolean) =>
  cn(
    "flex items-center gap-2 rounded-xl border bg-card text-left font-medium text-foreground outline-none transition-colors",
    "hover:border-primary-soft-border hover:bg-primary-soft/50 focus-visible:ring-2 focus-visible:ring-ring",
    active && "border-ring bg-primary-soft/70 ring-1 ring-ring",
  );

/** A small picture of a shape for its button (no letters). */
function ShapeIcon({ shape }: { shape: GeometryShape }) {
  const plain = { ...newGeometry(shape), showVertices: false, radius: false, rightAngle: false };
  return (
    <span className="paper flex size-12 shrink-0 items-center justify-center rounded-lg border p-1" aria-hidden="true">
      <GeometryView geometry={plain} bold />
    </span>
  );
}

/**
 * Choosing a geometric figure: big shape buttons, a preview that is ready
 * to insert at once, and optional letters and labels behind "Labels".
 */
export function GeometryEditor({ geometry, onChange }: { geometry: GeometryDiagram; onChange: (geometry: GeometryDiagram) => void }) {
  const t = useT();
  const set = (changes: Partial<GeometryDiagram>) => onChange({ ...geometry, ...changes });
  // Open at once when the teacher already wrote labels (editing an old figure).
  const [labelsOpen, setLabelsOpen] = useState(() => geometry.sides.some(Boolean) || !geometry.showVertices);
  const isCircle = geometry.shape === "circle";
  const corners = vertexCount(geometry.shape);
  const sides = sideCount(geometry.shape);
  const setAt = (list: string[], index: number, value: string) => list.map((old, i) => (i === index ? value : old));
  const sideName = (i: number) => `${geometry.vertices[i] || "?"}${geometry.vertices[(i + 1) % corners] || "?"}`;

  return (
    <div className="space-y-4" data-geometry-editor="">
      <div>
        <FieldLabel id="geometry-shape-label">{t("geometry.shape")}</FieldLabel>
        <div role="group" aria-labelledby="geometry-shape-label" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GEOMETRY_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              aria-pressed={geometry.shape === shape}
              data-geometry-shape={shape}
              onClick={() => onChange(withShape(geometry, shape))}
              className={cn(choiceClass(geometry.shape === shape), "min-h-16 min-w-0 flex-col p-2 text-center text-sm sm:flex-row sm:text-left sm:text-base")}
            >
              <ShapeIcon shape={shape} />
              {t(`geometry.shape.${shape}`)}
            </button>
          ))}
        </div>
      </div>

      {geometry.shape === "triangle" && (
        <div>
          <FieldLabel id="geometry-triangle-label">{t("geometry.triangleKind")}</FieldLabel>
          <div role="group" aria-labelledby="geometry-triangle-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TRIANGLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={geometry.triangle === preset}
                data-geometry-triangle={preset}
                onClick={() => set({ triangle: preset })}
                className={cn(choiceClass(geometry.triangle === preset), "min-h-11 justify-center px-3 py-2 text-center text-sm")}
              >
                {t(`geometry.triangle.${preset}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* ---- Preview ---- */}
        <div>
          <div className="paper flex h-56 items-center justify-center rounded-xl border p-4" data-geometry-preview="">
            <GeometryView geometry={geometry} className="max-h-full" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("geometry.notToScale")}</p>
        </div>

        {/* ---- Optional letters and labels ---- */}
        <div className="self-start rounded-xl border">
          <button
            type="button"
            aria-expanded={labelsOpen}
            data-geometry-labels=""
            onClick={() => setLabelsOpen(!labelsOpen)}
            className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-4 py-2 text-left font-medium text-foreground outline-none hover:bg-primary-soft/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              {t("geometry.labels")} <span className="font-normal text-muted-foreground">({t("geometry.optional")})</span>
            </span>
            <ChevronDown className={cn("size-5 shrink-0 transition-transform", labelsOpen && "rotate-180")} aria-hidden="true" />
          </button>
          {labelsOpen && (
            <div className="space-y-4 border-t p-4">
              <label className="flex min-h-8 items-center gap-2 text-soft-foreground">
                <input type="checkbox" className="size-5 accent-primary" checked={geometry.showVertices} onChange={(e) => set({ showVertices: e.target.checked })} data-geometry-show-vertices="" />
                {t(isCircle ? "geometry.showCenter" : "geometry.showVertices")}
              </label>

              {geometry.showVertices && (
                <div>
                  <FieldLabel>{t(isCircle ? "geometry.center" : "geometry.vertices")}</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {geometry.vertices.map((letter, i) => (
                      <Input
                        key={i}
                        className="w-16 text-center"
                        value={letter}
                        maxLength={GEOMETRY_LIMITS.vertex}
                        aria-label={t("geometry.vertexNumber", { number: i + 1 })}
                        data-geometry-vertex={i}
                        onChange={(e) => set({ vertices: setAt(geometry.vertices, i, cleanLabel(e.target.value, GEOMETRY_LIMITS.vertex)) })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sides > 0 && (
                <div>
                  <FieldLabel hint={t("geometry.sidesHint")}>{t("geometry.sides")}</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {geometry.sides.map((label, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm text-soft-foreground">
                        <span className="w-9 shrink-0 font-medium">{sideName(i)}</span>
                        <Input
                          value={label}
                          maxLength={GEOMETRY_LIMITS.label}
                          aria-label={t("geometry.sideNamed", { name: sideName(i) })}
                          data-geometry-side={i}
                          onChange={(e) => set({ sides: setAt(geometry.sides, i, cleanLabel(e.target.value, GEOMETRY_LIMITS.label)) })}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {isCircle && (
                <>
                  <label className="flex min-h-8 items-center gap-2 text-soft-foreground">
                    <input type="checkbox" className="size-5 accent-primary" checked={geometry.radius} onChange={(e) => set({ radius: e.target.checked })} data-geometry-radius="" />
                    {t("geometry.showRadius")}
                  </label>
                  {geometry.radius && (
                    <label className="block">
                      <FieldLabel hint={t("geometry.sidesHint")}>{t("geometry.radiusLabel")}</FieldLabel>
                      <Input
                        className="w-40"
                        value={geometry.radiusLabel}
                        maxLength={GEOMETRY_LIMITS.label}
                        data-geometry-radius-label=""
                        onChange={(e) => set({ radiusLabel: cleanLabel(e.target.value, GEOMETRY_LIMITS.label) })}
                      />
                    </label>
                  )}
                </>
              )}

              {geometry.shape === "triangle" && geometry.triangle === "right" && (
                <label className="flex min-h-8 items-center gap-2 text-soft-foreground">
                  <input type="checkbox" className="size-5 accent-primary" checked={geometry.rightAngle} onChange={(e) => set({ rightAngle: e.target.checked })} data-geometry-right-angle="" />
                  {t("geometry.showRightAngle")}
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
