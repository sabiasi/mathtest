"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "motion/react";
import { useT } from "@/i18n/language";
import type { LabelStyle, Question } from "@/lib/storage/types";
import type { SubjectToolkit } from "@/subjects/types";
import { questionNumbers, sectionPoints } from "@/lib/questions";
import { QuestionCard } from "./QuestionCard";

/**
 * The list of question cards, reorderable with the arrows on each card, its
 * "⋯" menu, Alt+↑ / Alt+↓, or drag-and-drop (the ⋮⋮ handle).
 *
 * dnd-kit pieces:
 * - DndContext: watches the mouse / finger / keyboard and reports drags.
 * - SortableContext: knows the order of the items (by id).
 * - useSortable (inside QuestionCard): makes one card draggable.
 */
export function QuestionList({
  questions,
  labelStyle,
  toolkit,
  focusId,
  onReorder,
  onChange,
  onPatch,
  onDuplicate,
  onDelete,
  onMove,
  moveTick,
}: {
  questions: Question[];
  labelStyle: LabelStyle;
  /** The subject's tools: question types (for each card's dropdown) and diagrams. */
  toolkit: SubjectToolkit;
  focusId: string | null;
  onReorder: (questions: Question[]) => void;
  onChange: (question: Question) => void;
  onPatch: (id: string, patch: (question: Question) => Question) => void;
  onDuplicate: (question: Question) => void;
  onDelete: (question: Question, number: number) => void;
  /** Arrows, "⋯" menu, Alt+↑/↓: move a question to position `to` (0-based). */
  onMove: (question: Question, to: number) => void;
  /** Counts the moves made with arrows / menu / keys: only those animate the cards (not drag-and-drop). */
  moveTick: number;
}) {
  const t = useT();
  const numberOf = (id: string | number) => questions.findIndex((q) => q.id === id) + 1;
  // Printed question numbers (texts and poems have none).
  const numbers = questionNumbers(questions);
  const sections = sectionPoints(questions);
  const sensors = useSensors(
    // A drag starts only after moving 5px, so normal clicks still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = questions.findIndex((q) => q.id === active.id);
    const to = questions.findIndex((q) => q.id === over.id);
    onReorder(arrayMove(questions, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      // What screen readers say while moving a question (dnd-kit's default is English).
      accessibility={{
        screenReaderInstructions: { draggable: t("drag.instructions") },
        announcements: {
          onDragStart: ({ active }) => t("drag.start", { number: numberOf(active.id) }),
          onDragOver: ({ active, over }) =>
            over ? t("drag.over", { number: numberOf(active.id), position: numberOf(over.id) }) : undefined,
          onDragEnd: ({ active, over }) =>
            over ? t("drag.end", { number: numberOf(active.id), position: numberOf(over.id) }) : t("drag.cancel"),
          onDragCancel: () => t("drag.cancel"),
        },
      }}
    >
      <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <ol>
          {/* AnimatePresence keeps a deleted card on screen until its exit
              animation has finished. initial={false}: no animation on page load. */}
          <AnimatePresence initial={false}>
            {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              number={numbers.get(question.id) ?? null}
              sectionTotal={sections.get(question.id)}
              labelStyle={labelStyle}
              toolkit={toolkit}
              autoFocus={question.id === focusId}
              onChange={onChange}
              onPatch={(patch) => onPatch(question.id, patch)}
              onDuplicate={() => onDuplicate(question)}
              onDelete={() => onDelete(question, index + 1)}
              index={index}
              count={questions.length}
              moveTick={moveTick}
              onMove={(to) => onMove(question, to)}
            />
            ))}
          </AnimatePresence>
        </ol>
      </SortableContext>
    </DndContext>
  );
}
