"use client";

/**
 * Pictures and the answer grid of one question, in the editor.
 */
import { Grid3x3, Hexagon, ImagePlus, LoaderCircle, Minus, MoveUpRight, Pencil, Plus, X, Zap, type LucideIcon } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { GRID_CELL_MM, GridArea } from "@/components/GridArea";
import { QuestionImageView } from "@/components/QuestionImageView";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { ACCEPTED_TYPES } from "@/lib/images/imageMath";
import { DEFAULT_GRID, GRID_LIMITS } from "@/lib/questions";
import type { AnswerGrid, DiagramKind, QuestionImage } from "@/lib/storage/types";

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export function ImageStrip({
  images,
  onChange,
  onEditDiagram,
}: {
  images: QuestionImage[];
  onChange: (images: QuestionImage[]) => void;
  /** Opens a diagram (circuit, forces) in its drawing window. */
  onEditDiagram: (image: QuestionImage) => void;
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
          onEdit={image.diagram ? () => onEditDiagram(image) : undefined}
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
  onEdit,
}: {
  image: QuestionImage;
  stripRef: React.RefObject<HTMLDivElement | null>;
  onChange: (changes: Partial<QuestionImage>) => void;
  onRemove: () => void;
  /** Only for diagrams: open the drawing window. */
  onEdit?: () => void;
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
      className="group relative rounded-xl border bg-card p-2 shadow-xs"
      // Shown at its printed width (but never too small to use the controls).
      style={{ width: `max(${percent}%, 13rem)` }}
    >
      <div className="relative">
        <div className="paper overflow-hidden rounded-md">
          <QuestionImageView image={image} />
        </div>
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label={t("media.resize")}
          title={t("media.resize")}
          className="absolute -right-1.5 -bottom-1.5 size-4 cursor-nwse-resize touch-none rounded-sm border-2 border-white bg-primary shadow transition-transform hover:scale-125 pointer-coarse:size-7"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("media.remove")}
          title={t("media.remove")}
          className="absolute top-1 right-1 rounded-md bg-white/90 p-1.5 text-neutral-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 pointer-coarse:p-2.5"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            data-edit-diagram=""
            className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover pointer-coarse:py-2"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {t("diagram.edit")}
          </button>
        )}
      </div>
      <figcaption className="mt-2 space-y-2 text-sm text-muted-foreground">
        <Input
          className="h-8 text-sm"
          value={image.caption}
          maxLength={300}
          placeholder={t("media.captionPlaceholder")}
          aria-label={t("media.caption")}
          onChange={(e) => onChange({ caption: e.target.value })}
          data-image-caption=""
        />
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
            className="min-w-0 flex-1 accent-primary"
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

const DIAGRAM_ICONS: Record<DiagramKind, LucideIcon> = { circuit: Zap, forces: MoveUpRight, structure: Hexagon };

export function MediaBar({
  grid,
  busy,
  error,
  onFiles,
  onGridChange,
  diagrams,
  onNewDiagram,
}: {
  grid: AnswerGrid | null;
  busy: boolean;
  error: string | null;
  onFiles: (files: File[]) => void;
  onGridChange: (grid: AnswerGrid | null) => void;
  /** The subject's drawing tools (physics: circuit, forces). */
  diagrams: readonly DiagramKind[];
  onNewDiagram: (kind: DiagramKind) => void;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 border-t border-dashed pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {t(busy ? "media.uploading" : "media.addImage")}
          </button>
          <span className="text-sm text-muted-foreground">{t("media.addHint")}</span>
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

        {diagrams.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {diagrams.map((kind) => {
              const Icon = DIAGRAM_ICONS[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onNewDiagram(kind)}
                  data-new-diagram={kind}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(`diagram.new.${kind}`)}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Grid3x3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-soft-foreground">{t("grid.label")}:</span>
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

      {error && <p className="text-sm text-destructive-text">{error}</p>}
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
        <p className="text-sm text-muted-foreground">
          {t("grid.size", { cols: grid.cols, rows: grid.rows, w: cm(grid.cols), h: cm(grid.rows) })}
        </p>
      </div>
      <div className="paper min-w-0 flex-1 rounded-lg border p-2">
        <GridArea grid={grid} className="mx-auto max-h-64 w-auto" />
      </div>
    </div>
  );
}

export function Stepper({
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
  const t = useT();
  const button = buttonVariants({ variant: "outline", size: "icon-sm" });
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="w-20 text-soft-foreground">{label}</span>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t("common.decrease")}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t("common.increase")}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
