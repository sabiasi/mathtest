"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { useState, type ClipboardEvent, type DragEvent } from "react";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { UnsupportedImageError, addImage } from "@/lib/images/imageStore";
import { QUESTION_TYPES, changeQuestionType } from "@/lib/questions";
import type { LabelStyle, Question, QuestionImage, QuestionType } from "@/lib/storage/types";
import { MultipleChoiceEditor } from "./MultipleChoiceEditor";
import { OpenAnswerEditor } from "./OpenAnswerEditor";
import { PointsInput } from "./PointsInput";
import { ImageStrip, MediaBar } from "./QuestionMedia";
import { ShortAnswerEditor } from "./ShortAnswerEditor";
import { TrueFalseEditor } from "./TrueFalseEditor";

export function QuestionCard({
  question,
  number,
  labelStyle,
  autoFocus,
  onChange,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  question: Question;
  number: number;
  labelStyle: LabelStyle;
  autoFocus: boolean;
  onChange: (question: Question) => void;
  onPatch: (patch: (question: Question) => Question) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  // useSortable connects this card to drag-and-drop (see QuestionList).
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });

  const iconButton = "rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 pointer-coarse:p-3";

  // ---- Pictures: upload, paste, drop ----
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setMediaBusy(true);
    setMediaError(null);
    for (const file of files) {
      try {
        const { imageId, width, height } = await addImage(file);
        const placement: QuestionImage = {
          id: newId(),
          imageId,
          width,
          height,
          widthPercent: width > height ? 50 : 35, // a sensible start; easy to resize
          position: "above",
        };
        onPatch((q) => ({ ...q, images: [...q.images, placement] }));
      } catch (error) {
        setMediaError(t(error instanceof UnsupportedImageError ? "media.unsupported" : "media.failed"));
      }
    }
    setMediaBusy(false);
  }

  function handlePaste(event: ClipboardEvent) {
    const files = [...event.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    // Copying text from Word ALSO puts a picture of that text on the clipboard.
    // So only treat it as a picture when there's no text — otherwise paste text.
    const hasText = event.clipboardData.getData("text/plain").trim() !== "";
    if (files.length === 0 || hasText) return;
    event.preventDefault();
    event.stopPropagation(); // don't let the text box paste it too
    void addFiles(files);
  }

  function handleDrop(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDropActive(false);
    void addFiles([...event.dataTransfer.files]);
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onPasteCapture={handlePaste}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault(); // allows dropping here
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
      }}
      onDrop={handleDrop}
      className={`relative rounded-2xl border bg-white shadow-sm ${
        isDragging ? "z-10 border-indigo-400 shadow-xl ring-2 ring-indigo-400/40" : "border-slate-200"
      } ${dropActive ? "ring-2 ring-indigo-500" : ""}`}
    >
      {dropActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-indigo-50/90 text-indigo-700">
          <ImagePlus className="mr-2 size-6" aria-hidden="true" />
          <span className="font-semibold">{t("media.dropHere")}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("questions.drag")}
          title={t("questions.drag")}
          className="cursor-grab touch-none rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing pointer-coarse:p-2.5"
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </button>
        <span className="font-semibold text-slate-900">{t("questions.number", { number })}</span>
        <select
          value={question.type}
          aria-label={t("questions.type")}
          onChange={(e) => onChange(changeQuestionType(question, e.target.value as QuestionType))}
          className="rounded-lg border border-slate-300 bg-white py-1.5 pr-8 pl-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 focus:border-indigo-500 focus:outline-none"
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`type.${type}`)}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <PointsInput
            value={question.points}
            label={t("questions.points")}
            onChange={(points) => onChange({ ...question, points })}
          />
          <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
          <button type="button" onClick={onDuplicate} aria-label={t("questions.duplicate")} title={t("questions.duplicate")} className={iconButton}>
            <Copy className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t("questions.delete")}
            title={t("questions.delete")}
            className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <RichTextInput
          value={question.text}
          autoFocus={autoFocus}
          ariaLabel={t("questions.text")}
          placeholder={t(question.type === "true-false" ? "questions.statementPlaceholder" : "questions.textPlaceholder")}
          onChange={(text) => onChange({ ...question, text })}
        />

        <ImageStrip images={question.images} onChange={(images) => onChange({ ...question, images })} />

        {question.type === "multiple-choice" && (
          <MultipleChoiceEditor question={question} labelStyle={labelStyle} onChange={onChange} />
        )}
        {question.type === "true-false" && <TrueFalseEditor question={question} onChange={onChange} />}
        {question.type === "short-answer" && <ShortAnswerEditor question={question} onChange={onChange} />}
        {question.type === "open-answer" && <OpenAnswerEditor question={question} onChange={onChange} />}

        <MediaBar
          grid={question.grid}
          busy={mediaBusy}
          error={mediaError}
          onFiles={(files) => void addFiles(files)}
          onGridChange={(grid) => onChange({ ...question, grid })}
        />
      </div>
    </li>
  );
}
