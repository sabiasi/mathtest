"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ClipboardEvent, type DragEvent } from "react";
import { inputClasses } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { UnsupportedImageError, addImage } from "@/lib/images/imageStore";
import { QUESTION_TYPES, changeQuestionType } from "@/lib/questions";
import type { LabelStyle, Question, QuestionImage, QuestionType } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
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
    useSortable({ id: question.id, transition: { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" } });

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
    // The outer <li> is what dnd-kit moves (transform) and what Motion grows /
    // shrinks when a question is added or deleted (height + opacity).
    <motion.li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      initial={{ height: 0, opacity: 0, overflow: "hidden" }}
      animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
      exit={{ height: 0, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className="relative"
    >
      {/* pb-4 = the gap to the next card (inside the li, so it shrinks with it) */}
      <div className="pb-4">
        <div
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
          data-question-card=""
          className={cn(
            "relative rounded-2xl border bg-card shadow-sm transition-[box-shadow,border-color,scale] duration-200 ease-out-soft",
            isDragging && "scale-[1.015] border-ring/60 shadow-xl ring-2 ring-ring/30",
            dropActive && "ring-2 ring-ring",
          )}
        >
          {dropActive && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-primary-soft/90 text-brand">
              <ImagePlus className="mr-2 size-6" aria-hidden="true" />
              <span className="font-semibold">{t("media.dropHere")}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
            <IconButton
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              label={t("questions.drag")}
              className="cursor-grab touch-none p-1.5 active:cursor-grabbing pointer-coarse:p-2.5"
            >
              <GripVertical className="size-5" aria-hidden="true" />
            </IconButton>
            <span className="font-semibold text-foreground">{t("questions.number", { number })}</span>
            <select
              value={question.type}
              aria-label={t("questions.type")}
              onChange={(e) => onChange(changeQuestionType(question, e.target.value as QuestionType))}
              className={cn(inputClasses, "h-9 w-auto py-0 pr-8 pl-2.5 text-sm font-medium text-soft-foreground")}
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
              <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
              <IconButton onClick={onDuplicate} label={t("questions.duplicate")}>
                <Copy className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton onClick={onDelete} label={t("questions.delete")} tone="danger">
                <Trash2 className="size-4" aria-hidden="true" />
              </IconButton>
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
        </div>
      </div>
    </motion.li>
  );
}
