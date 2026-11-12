"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { inputClasses } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { QUESTION_TYPES, changeQuestionType } from "@/lib/questions";
import type { LabelStyle, Question, QuestionType } from "@/lib/storage/types";
import { MultipleChoiceEditor } from "./MultipleChoiceEditor";
import { OpenAnswerEditor } from "./OpenAnswerEditor";
import { PointsInput } from "./PointsInput";
import { ShortAnswerEditor } from "./ShortAnswerEditor";
import { TrueFalseEditor } from "./TrueFalseEditor";

export function QuestionCard({
  question,
  number,
  labelStyle,
  autoFocus,
  onChange,
  onDuplicate,
  onDelete,
}: {
  question: Question;
  number: number;
  labelStyle: LabelStyle;
  autoFocus: boolean;
  onChange: (question: Question) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  // useSortable connects this card to drag-and-drop (see QuestionList).
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });

  const iconButton = "rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-2xl border bg-white shadow-sm ${
        isDragging ? "relative z-10 border-indigo-400 shadow-xl ring-2 ring-indigo-400/40" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("questions.drag")}
          title={t("questions.drag")}
          className="cursor-grab touch-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
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
        <textarea
          rows={2}
          autoFocus={autoFocus}
          aria-label={t("questions.text")}
          value={question.text}
          placeholder={t(question.type === "true-false" ? "questions.statementPlaceholder" : "questions.textPlaceholder")}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          className={`${inputClasses} field-sizing-content min-h-16 resize-none`}
        />

        {question.type === "multiple-choice" && (
          <MultipleChoiceEditor question={question} labelStyle={labelStyle} onChange={onChange} />
        )}
        {question.type === "true-false" && <TrueFalseEditor question={question} onChange={onChange} />}
        {question.type === "short-answer" && <ShortAnswerEditor question={question} onChange={onChange} />}
        {question.type === "open-answer" && <OpenAnswerEditor question={question} onChange={onChange} />}
      </div>
    </li>
  );
}
