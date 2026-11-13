"use client";

import { ImagePlus, LoaderCircle, MapPinned, RefreshCw, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useImageUrl } from "@/components/QuestionImageView";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { ACCEPTED_TYPES } from "@/lib/images/imageMath";
import { UnsupportedImageError, addImage } from "@/lib/images/imageStore";
import { LIMITS } from "@/lib/questions";
import type { MapMarker, MapQuestion } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Map question: upload a map, click on it to put numbered markers, drag a
 * marker to move it (or select it and use the arrow keys), and write the
 * name of each place for the answer key.
 */
export function MapEditor({
  question,
  onChange,
  onPatch,
  picture = false,
}: {
  question: MapQuestion;
  /** Wording for a picture to label (English "Label the picture") instead of a map. */
  picture?: boolean;
  onChange: (question: MapQuestion) => void;
  /** For the upload, which finishes later: applied to the newest version of the question. */
  onPatch: (patch: (question: MapQuestion) => MapQuestion) => void;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { imageId, width, height } = await addImage(file);
      // A new map: markers placed on the old one would point to the wrong places.
      onPatch((q) => ({ ...q, map: { imageId, width, height }, markers: q.map ? [] : q.markers }));
    } catch (err) {
      setError(t(err instanceof UnsupportedImageError ? "media.unsupported" : "media.failed"));
    }
    setBusy(false);
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

  if (!question.map) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-8 text-center"
        onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.stopPropagation(); // not a picture for the question: it's the map
          void upload(e.dataTransfer.files[0]);
        }}
        data-map-editor=""
      >
        <MapPinned className="size-8 text-brand" aria-hidden="true" />
        <p className="max-w-md text-[15px] text-soft-foreground">{t(picture ? "picture.empty" : "map.empty")}</p>
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: "outline" })}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
          {t(busy ? "media.uploading" : picture ? "picture.upload" : "map.upload")}
        </button>
        {error && <p className="text-sm text-destructive-text">{error}</p>}
        {picker}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-map-editor="">
      <p className="text-sm text-muted-foreground">{t("map.hint")}</p>
      <MapCanvas question={question} onChange={onChange} />

      {question.markers.length > 0 && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {question.markers.map((marker, index) => (
            <li key={marker.id} className="flex items-center gap-2" data-marker-row="">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
              <Input
                className="h-9 min-w-0 flex-1"
                value={marker.answer}
                maxLength={100}
                placeholder={t("map.answerPlaceholder")}
                aria-label={t("map.answer", { number: index + 1 })}
                onChange={(e) => onChange({ ...question, markers: question.markers.map((m) => (m.id === marker.id ? { ...m, answer: e.target.value } : m)) })}
              />
              <IconButton label={t("map.removeMarker")} tone="danger" className="p-1.5" onClick={() => onChange({ ...question, markers: question.markers.filter((m) => m.id !== marker.id) })}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-soft-foreground">
        <label className="flex min-w-60 items-center gap-2">
          {t("map.width")}
          <input
            type="range"
            min={LIMITS.mapWidth.min}
            max={LIMITS.mapWidth.max}
            step={5}
            value={question.mapWidth}
            onChange={(e) => onChange({ ...question, mapWidth: Number(e.target.value) })}
            className="min-w-0 flex-1 accent-primary"
          />
          <span className="w-10 text-right tabular-nums">{question.mapWidth}%</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-primary" checked={question.wordBank} onChange={(e) => onChange({ ...question, wordBank: e.target.checked })} />
          {t("map.wordBank")}
        </label>
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          {t("map.replace")}
        </button>
      </div>
      {error && <p className="text-sm text-destructive-text">{error}</p>}
      {picker}
    </div>
  );
}

/** The map with its markers: click to add, drag to move, arrow keys to nudge. */
function MapCanvas({ question, onChange }: { question: MapQuestion; onChange: (question: MapQuestion) => void }) {
  const t = useT();
  const map = question.map!;
  const url = useImageUrl(map.imageId);
  const box = useRef<HTMLDivElement>(null);
  // While dragging, the marker follows the pointer; it's saved once, on release.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const full = question.markers.length >= LIMITS.mapMarkers;

  const pointToPercent = (clientX: number, clientY: number) => {
    const rect = box.current!.getBoundingClientRect();
    return { x: round1(clamp(((clientX - rect.left) / rect.width) * 100)), y: round1(clamp(((clientY - rect.top) / rect.height) * 100)) };
  };
  const setMarker = (id: string, changes: Partial<MapMarker>) =>
    onChange({ ...question, markers: question.markers.map((m) => (m.id === id ? { ...m, ...changes } : m)) });

  function addAt(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).dataset.mapImage) return;
    if (full) return;
    const { x, y } = pointToPercent(event.clientX, event.clientY);
    onChange({ ...question, markers: [...question.markers, { id: newId(), x, y, answer: "" }] });
  }

  function onMarkerKey(event: KeyboardEvent, marker: MapMarker) {
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const by = moves[event.key];
    if (!by) return;
    event.preventDefault();
    setMarker(marker.id, { x: clamp(marker.x + by[0]), y: clamp(marker.y + by[1]) });
  }

  return (
    <div className="paper overflow-hidden rounded-xl border p-2">
      <div
        ref={box}
        className={cn("relative mx-auto touch-none select-none", full ? "cursor-default" : "cursor-crosshair")}
        // At most 28rem tall: the width follows from the map's shape, so the
        // box always has exactly the map's proportions (markers stay in place).
        style={{ aspectRatio: `${map.width} / ${map.height}`, width: `min(100%, ${round1((28 * map.width) / map.height)}rem)` }}
        onPointerDown={addAt}
        data-map-canvas=""
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored pictures (blob:/data: URLs)
          <img src={url} alt="" data-map-image="1" draggable={false} className="block h-full w-full object-contain" />
        ) : (
          <div data-map-image="1" className="h-full w-full bg-muted" />
        )}
        {question.markers.map((marker, index) => {
          const at = drag?.id === marker.id ? drag : marker;
          return (
            <button
              key={marker.id}
              type="button"
              aria-label={t("map.marker", { number: index + 1 })}
              data-marker=""
              onKeyDown={(e) => onMarkerKey(e, marker)}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({ id: marker.id, x: marker.x, y: marker.y });
              }}
              onPointerMove={(e) => drag?.id === marker.id && setDrag({ id: marker.id, ...pointToPercent(e.clientX, e.clientY) })}
              onPointerUp={() => {
                if (drag?.id === marker.id && (drag.x !== marker.x || drag.y !== marker.y)) setMarker(marker.id, { x: drag.x, y: drag.y });
                setDrag(null);
              }}
              className="map-marker absolute flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-black bg-white text-sm font-bold text-black shadow-md outline-none focus-visible:ring-4 focus-visible:ring-ring active:cursor-grabbing"
              style={{ left: `${at.x}%`, top: `${at.y}%` }}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
