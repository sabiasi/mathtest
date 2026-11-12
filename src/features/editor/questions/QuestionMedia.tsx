"use client";

/**
 * Pictures and the answer grid of one question, in the editor.
 */
import { Grid3x3, ImagePlus, LoaderCircle, Minus, Plus, X } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { GRID_CELL_MM, GridArea } from "@/components/GridArea";
import { QuestionImageView } from "@/components/QuestionImageView";
import { SegmentedControl } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { ACCEPTED_TYPES } from "@/lib/images/imageMath";
import { DEFAULT_GRID, GRID_LIMITS } from "@/lib/questions";
import type { AnswerGrid, QuestionImage } from "@/lib/storage/types";

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export function ImageStrip({
  images,
  onChange,
}: {
  images: QuestionImage[];
  onChange: (images: QuestionImage[]) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  if (images.length === 0) return null;

  const update = (id: string, changes: Partial<QuestionImage>) =>
    onChange(images.map((image) => (image.id === id ? { ...image, ...changes } : image)));

  return (
    <div ref={stripRef} className="flex flex-wrap items-start gap-3">
      {images.map((image) => (
        <EditableImage
          key={image.id}
          image={image}
          stripRef={stripRef}
          onChange={(changes) => update(image.id, changes)}
          onRemove={() => onChange(images.filter((i) => i.id !== image.id))}
        />
      ))}
    </div>
  );
}

function EditableImage({
  image,
  stripRef,
  onChange,
  onRemove,
}: {
  image: QuestionImage;
  stripRef: React.RefObject<HTMLDivElement | null>;
  onChange: (changes: Partial<QuestionImage>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  // While dragging the corner we show the new size right away and save it once at the end.
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const percent = dragPercent ?? image.widthPercent;
  const drag = useRef<{ startX: number; startPercent: number; stripWidth: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startPercent: image.widthPercent, stripWidth: stripRef.current?.clientWidth ?? 600 };
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const { startX, startPercent, stripWidth } = drag.current;
    const next = startPercent + ((event.clientX - startX) / stripWidth) * 100;
    setDragPercent(Math.round(Math.min(100, Math.max(10, next))));
  }
  function onPointerUp() {
    if (dragPercent !== null) onChange({ widthPercent: dragPercent });
    drag.current = null;
    setDragPercent(null);
  }

  return (
    <figure
      className="group relative rounded-lg border border-slate-200 bg-white p-2"
      // Shown at its printed width (but never too small to use the controls).
      style={{ width: `max(${percent}%, 13rem)` }}
    >
      <div className="relative">
        <QuestionImageView image={image} className="rounded" />
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label={t("media.resize")}
          title={t("media.resize")}
          className="absolute -right-1.5 -bottom-1.5 size-4 cursor-nwse-resize touch-none rounded-sm border-2 border-white bg-indigo-600 shadow"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("media.remove")}
          title={t("media.remove")}
          className="absolute top-1 right-1 rounded-md bg-white/90 p-1 text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-600"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <figcaption className="mt-2 space-y-2 text-xs text-slate-600">
        <SegmentedControl
          label={t("media.position")}
          value={image.position}
          onChange={(position) => onChange({ position })}
          options={[
            { value: "above", label: t("media.above") },
            { value: "right", label: t("media.right") },
          ]}
        />
        <label className="flex items-center gap-2">
          {t("media.size")}
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={percent}
            onChange={(e) => onChange({ widthPercent: Number(e.target.value) })}
            className="min-w-0 flex-1 accent-indigo-600"
          />
          <span className="w-9 text-right tabular-nums">{percent}%</span>
        </label>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// The bar under a question: "Add image" and the answer grid
// ---------------------------------------------------------------------------

export function MediaBar({
  grid,
  busy,
  error,
  onFiles,
  onGridChange,
}: {
  grid: AnswerGrid | null;
  busy: boolean;
  error: string | null;
  onFiles: (files: File[]) => void;
  onGridChange: (grid: AnswerGrid | null) => void;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {t(busy ? "media.uploading" : "media.addImage")}
          </button>
          <span className="text-xs text-slate-400">{t("media.addHint")}</span>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              onFiles([...(e.target.files ?? [])]);
              e.target.value = ""; // so choosing the same file again still works
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Grid3x3 className="size-4 text-slate-500" aria-hidden="true" />
          <span className="text-slate-600">{t("grid.label")}:</span>
          <SegmentedControl
            label={t("grid.label")}
            value={grid?.kind ?? "none"}
            onChange={(kind) =>
              onGridChange(kind === "none" ? null : { ...DEFAULT_GRID, ...grid, kind: kind as AnswerGrid["kind"] })
            }
            options={[
              { value: "none", label: t("grid.none") },
              { value: "squares", label: t("grid.squares") },
              { value: "coordinates", label: t("grid.coordinates") },
            ]}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {grid && <GridEditor grid={grid} onChange={onGridChange} />}
    </div>
  );
}

function GridEditor({ grid, onChange }: { grid: AnswerGrid; onChange: (grid: AnswerGrid) => void }) {
  const t = useT();
  const cm = (cells: number) => String((cells * GRID_CELL_MM) / 10).replace(".", ",");
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
      <div className="space-y-2 text-sm">
        <Stepper
          label={t("grid.cols")}
          value={grid.cols}
          min={GRID_LIMITS.minCols}
          max={GRID_LIMITS.maxCols}
          onChange={(cols) => onChange({ ...grid, cols })}
        />
        <Stepper
          label={t("grid.rows")}
          value={grid.rows}
          min={GRID_LIMITS.minRows}
          max={GRID_LIMITS.maxRows}
          onChange={(rows) => onChange({ ...grid, rows })}
        />
        <p className="text-xs text-slate-500">
          {t("grid.size", { cols: grid.cols, rows: grid.rows, w: cm(grid.cols), h: cm(grid.rows) })}
        </p>
      </div>
      <div className="min-w-0 flex-1 rounded-lg bg-slate-50 p-2">
        <GridArea grid={grid} className="mx-auto max-h-64 w-auto" />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const button =
    "flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="w-20 text-slate-600">{label}</span>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="−1">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="+1">
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
