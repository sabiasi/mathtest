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
import type { LabelStyle, Question } from "@/lib/storage/types";
import { QuestionCard } from "./QuestionCard";

/**
 * The list of question cards, reorderable by drag-and-drop.
 *
 * dnd-kit pieces:
 * - DndContext: watches the mouse / finger / keyboard and reports drags.
 * - SortableContext: knows the order of the items (by id).
 * - useSortable (inside QuestionCard): makes one card draggable.
 */
export function QuestionList({
  questions,
  labelStyle,
  focusId,
  onReorder,
  onChange,
  onDuplicate,
  onDelete,
}: {
  questions: Question[];
  labelStyle: LabelStyle;
  focusId: string | null;
  onReorder: (questions: Question[]) => void;
  onChange: (question: Question) => void;
  onDuplicate: (question: Question) => void;
  onDelete: (question: Question, number: number) => void;
}) {
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
    >
      <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              number={index + 1}
              labelStyle={labelStyle}
              autoFocus={question.id === focusId}
              onChange={onChange}
              onDuplicate={() => onDuplicate(question)}
              onDelete={() => onDelete(question, index + 1)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
