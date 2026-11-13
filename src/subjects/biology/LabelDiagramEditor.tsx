"use client";

import { ArrowDownWideNarrow, ImagePlus, ListPlus, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useImageError } from "@/features/plans/useImageError";
import type { Language } from "@/i18n/dictionaries";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { ACCEPTED_TYPES } from "@/lib/images/imageMath";
import { addImage } from "@/lib/images/imageStore";
import { LABEL_LIMITS, areaAspect, clampPosition, labelsForParts, numberTopToBottom, pictureSize, placeLabel } from "@/lib/labelDiagram";
import type { DiagramLabel, LabelDiagramQuestion } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { BIO_DRAWINGS, drawingUrl, getDrawing } from "./drawings";
import { LabelArea } from "./LabelDiagramView";

type Mode = LabelDiagramQuestion["mode"];
type Drag = { id: string; part: "point" | "label"; x: number; y: number };

/**
 * "Label the diagram": choose a built-in drawing (or upload a picture),
 * click on it to add a pointer line with a label, drag the point and the
 * label separately, and write each part's name for the answer key.
 */
export function LabelDiagramEditor({
  question,
  paperLanguage,
  onChange,
  onPatch,
}: {
  question: LabelDiagramQuestion;
  /** The language part names are added in (the paper's language). */
  paperLanguage: Language;
  onChange: (question: LabelDiagramQuestion) => void;
  onPatch: (patch: (question: LabelDiagramQuestion) => LabelDiagramQuestion) => void;
}) {
  const t = useT();
  const confirm = useConfirm();
  const imageError = useImageError();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { imageId, width, height } = await addImage(file);
      onPatch((q) => ({ ...q, picture: { kind: "upload", imageId, width, height }, labels: [] }));
      setChoosing(false);
    } catch (err) {
      setError(imageError(err));
    }
    setBusy(false);
  }

  /** A new picture: the old labels would point at the wrong places, so they go (after asking). */
  async function startChoosing() {
    if (question.labels.length > 0) {
      const ok = await confirm({ title: t("bio.changePicture"), message: t("bio.changeConfirm"), confirmLabel: t("dialog.continue") });
      if (!ok) return;
    }
    setChoosing(true);
  }

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept={ACCEPTED_TYPES.join(",")}
      hidden
      onChange={(e) => {
        void upload(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (!question.picture || choosing) {
    return (
      <div
        className="space-y-3 rounded-2xl border-2 border-dashed bg-muted/30 p-4"
        onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.stopPropagation(); // it's the diagram, not an extra picture for the question
          void upload(e.dataTransfer.files[0]);
        }}
        data-label-chooser=""
      >
        <p className="text-[15px] font-medium text-soft-foreground">{t("bio.chooseTitle")}</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BIO_DRAWINGS.map((drawing) => (
            <li key={drawing.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...question, picture: { kind: "builtin", drawing: drawing.id }, labels: [] });
                  setChoosing(false);
                }}
                className="flex h-full w-full flex-col items-center gap-1.5 rounded-xl border bg-card p-2 text-sm font-medium transition-colors hover:border-primary-soft-border hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                data-drawing={drawing.id}
              >
                <span className="paper flex h-20 w-full items-center justify-center rounded-lg p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- built-in SVG drawing */}
                  <img src={drawingUrl(drawing.id)} alt="" className="max-h-full max-w-full" />
                </span>
                {paperLanguage === "en" ? drawing.en : drawing.ka}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: "outline" })}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {t(busy ? "media.uploading" : "bio.upload")}
          </button>
          <span className="text-sm text-muted-foreground">{t("bio.uploadHint")}</span>
          {choosing && question.picture && (
            <button type="button" onClick={() => setChoosing(false)} className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto" })}>
              {t("dialog.cancel")}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-destructive-text">{error}</p>}
        {picker}
      </div>
    );
  }

  const picture = question.picture;
  const builtin = picture.kind === "builtin" ? getDrawing(picture.drawing) : null;
  const full = question.labels.length >= LABEL_LIMITS.labels;
  const setLabel = (id: string, changes: Partial<DiagramLabel>) =>
    onChange({ ...question, labels: question.labels.map((l) => (l.id === id ? { ...l, ...changes } : l)) });

  return (
    <div className="space-y-4" data-label-editor="">
      <p className="text-sm text-muted-foreground">{t("bio.hint")}</p>
      <LabelCanvas question={question} onChange={onChange} />
      {full && <p className="text-sm text-muted-foreground">{t("bio.limit", { count: LABEL_LIMITS.labels })}</p>}

      {question.labels.length > 0 && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {question.labels.map((label, index) => (
            <li key={label.id} className="flex items-center gap-2" data-label-row="">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
              <Input
                className="h-9 min-w-0 flex-1"
                value={label.answer}
                maxLength={100}
                placeholder={t("bio.answerPlaceholder")}
                aria-label={t("bio.answer", { number: index + 1 })}
                onChange={(e) => setLabel(label.id, { answer: e.target.value })}
              />
              <IconButton
                label={t("bio.remove")}
                tone="danger"
                className="p-1.5"
                onClick={() => onChange({ ...question, labels: question.labels.filter((l) => l.id !== label.id) })}
              >
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {builtin && (
          <button
            type="button"
            className={buttonVariants({ variant: "soft", size: "sm" })}
            onClick={() => {
              const parts = builtin.parts.map((p) => ({ x: p.x, y: p.y, name: paperLanguage === "en" ? p.en : p.ka }));
              const labels = labelsForParts(question.labels, parts, builtin.width, builtin.height, newId).slice(0, LABEL_LIMITS.labels);
              onChange({ ...question, labels });
            }}
            data-add-parts=""
          >
            <ListPlus className="size-4" aria-hidden="true" />
            {t("bio.addParts")}
          </button>
        )}
        {question.labels.length > 1 && (
          <button type="button" className={buttonVariants({ variant: "ghost", size: "sm" })} onClick={() => onChange({ ...question, labels: numberTopToBottom(question.labels) })}>
            <ArrowDownWideNarrow className="size-4" aria-hidden="true" />
            {t("bio.renumber")}
          </button>
        )}
        <button type="button" className={buttonVariants({ variant: "ghost", size: "sm" })} onClick={() => void startChoosing()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t("bio.changePicture")}
        </button>
      </div>

      <div className="space-y-3 rounded-xl bg-muted/50 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-soft-foreground">{t("bio.mode")}:</span>
          <SegmentedControl<Mode>
            label={t("bio.mode")}
            value={question.mode}
            onChange={(mode) => onChange({ ...question, mode })}
            options={(["boxes", "numbers", "match"] as const).map((mode) => ({ value: mode, label: t(`bio.mode.${mode}`) }))}
          />
        </div>
        <p className="text-muted-foreground">{t(`bio.modeHint.${question.mode}`)}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-soft-foreground">
          {question.mode !== "match" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-primary" checked={question.wordBank} onChange={(e) => onChange({ ...question, wordBank: e.target.checked })} />
              {t("bio.wordBank")}
            </label>
          )}
          <label className="flex min-w-60 items-center gap-2">
            {t("bio.width")}
            <input
              type="range"
              min={LABEL_LIMITS.width.min}
              max={LABEL_LIMITS.width.max}
              step={5}
              value={question.pictureWidth}
              onChange={(e) => onChange({ ...question, pictureWidth: Number(e.target.value) })}
              className="min-w-0 flex-1 accent-primary"
            />
            <span className="w-10 text-right tabular-nums">{question.pictureWidth}%</span>
          </label>
        </div>
        {(question.mode === "match" || question.wordBank) && (
          <ExtrasInput key={question.extras.join("\u0000")} extras={question.extras} onChange={(extras) => onChange({ ...question, extras })} />
        )}
      </div>
      {error && <p className="text-sm text-destructive-text">{error}</p>}
      {picker}
    </div>
  );
}

/** Extra wrong words, typed with commas; saved when the box is left. */
function ExtrasInput({ extras, onChange }: { extras: string[]; onChange: (extras: string[]) => void }) {
  const t = useT();
  const [text, setText] = useState(extras.join(", "));
  const commit = () => {
    const next = text.split(/[,;\n]/).map((w) => w.trim()).filter(Boolean).slice(0, 10);
    if (next.join("\u0000") !== extras.join("\u0000")) onChange(next);
  };
  return (
    <label className="block">
      <span className="mb-1 block text-soft-foreground">
        {t("bio.extras")} <span className="text-muted-foreground">({t("bio.extrasHint")})</span>
      </span>
      <Input className="h-9" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} onBlur={commit} data-extras-input="" />
    </label>
  );
}

/** The drawing area: click to add a label, drag a point or a label, arrow keys to nudge the selected one. */
function LabelCanvas({ question, onChange }: { question: LabelDiagramQuestion; onChange: (question: LabelDiagramQuestion) => void }) {
  const t = useT();
  const area = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const { width, height } = pictureSize(question.picture!);
  const aspect = areaAspect(width, height);
  const full = question.labels.length >= LABEL_LIMITS.labels;

  const toPercent = (clientX: number, clientY: number) => {
    const rect = area.current!.querySelector("[data-label-area]")!.getBoundingClientRect();
    return { x: clampPosition(((clientX - rect.left) / rect.width) * 100), y: clampPosition(((clientY - rect.top) / rect.height) * 100) };
  };
  const move = (label: DiagramLabel, part: Drag["part"], x: number, y: number): Partial<DiagramLabel> =>
    part === "point" ? { x, y } : { lx: x, ly: y };
  const update = (id: string, changes: Partial<DiagramLabel>) =>
    onChange({ ...question, labels: question.labels.map((l) => (l.id === id ? { ...l, ...changes } : l)) });

  function add(event: PointerEvent<HTMLDivElement>) {
    if (full || event.button !== 0) return;
    const { x, y } = toPercent(event.clientX, event.clientY);
    const label: DiagramLabel = { id: newId(), x, y, ...placeLabel(question.labels, x, y, aspect), answer: "" };
    onChange({ ...question, labels: [...question.labels, label] });
  }

  function onKey(event: KeyboardEvent, label: DiagramLabel, part: Drag["part"]) {
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const by = moves[event.key];
    if (!by) return;
    event.preventDefault();
    const [x, y] = part === "point" ? [label.x, label.y] : [label.lx, label.ly];
    update(label.id, move(label, part, clampPosition(x + by[0]), clampPosition(y + by[1])));
  }

  const handlers = (label: DiagramLabel, part: Drag["part"]) => ({
    onKeyDown: (e: KeyboardEvent) => onKey(e, label, part),
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const [x, y] = part === "point" ? [label.x, label.y] : [label.lx, label.ly];
      setDrag({ id: label.id, part, x, y });
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      if (drag?.id !== label.id || drag.part !== part) return;
      setDrag({ ...drag, ...toPercent(e.clientX, e.clientY) });
    },
    onPointerUp: () => {
      if (drag?.id === label.id && drag.part === part) update(label.id, move(label, part, drag.x, drag.y));
      setDrag(null);
    },
  });

  const dragged = drag ? { id: drag.id, ...(drag.part === "point" ? { x: drag.x, y: drag.y } : { lx: drag.x, ly: drag.y }) } : undefined;
  const at = (label: DiagramLabel) => (dragged?.id === label.id ? { ...label, ...dragged } : label);

  return (
    <div className="paper overflow-hidden rounded-xl border p-2">
      <div
        ref={area}
        className={cn("relative mx-auto touch-none select-none", full ? "cursor-default" : "cursor-crosshair")}
        // At most 30rem tall; the width follows from the area's shape.
        style={{ width: `min(100%, ${Math.round(30 * aspect * 10) / 10}rem)` }}
        onPointerDown={add}
        data-label-canvas=""
      >
        <LabelArea
          question={question}
          drag={dragged}
          renderLabel={(label, index) => {
            const l = at(label);
            return (
              <span key={label.id}>
                <button
                  type="button"
                  aria-label={t("bio.point", { number: index + 1 })}
                  className="absolute size-4 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-black bg-white outline-none focus-visible:ring-4 focus-visible:ring-ring"
                  style={{ left: `${l.x}%`, top: `${l.y}%` }}
                  data-label-point=""
                  {...handlers(label, "point")}
                />
                <button
                  type="button"
                  aria-label={t("bio.label", { number: index + 1 })}
                  className={cn(
                    "absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-1 border-2 border-black bg-white text-xs font-semibold text-black shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-ring active:cursor-grabbing",
                    question.mode === "boxes" ? "max-w-[9rem] min-w-12 rounded-md px-1.5 py-1" : "size-6 justify-center rounded-full",
                  )}
                  style={{ left: `${l.lx}%`, top: `${l.ly}%` }}
                  data-label-handle=""
                  {...handlers(label, "label")}
                >
                  <span>{index + 1}</span>
                  {question.mode === "boxes" && <span className="truncate font-normal text-neutral-600">{label.answer}</span>}
                </button>
              </span>
            );
          }}
        />
      </div>
    </div>
  );
}
