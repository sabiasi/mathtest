"use client";

import { Plus } from "lucide-react";
import { SegmentedControl } from "@/components/ui/form";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { TimelineEvent, TimelineQuestion } from "@/lib/storage/types";
import { TimelinePrint } from "../HistoryPrint";
import { RowControls, addButtonClass, move } from "./RowControls";

/**
 * Timeline: events from left to right, each with a date and a name. For each
 * one the teacher chooses what students must fill in: nothing, the date or
 * the event. A live preview shows the student paper.
 */
export function TimelineEditor({ question, onChange }: { question: TimelineQuestion; onChange: (question: TimelineQuestion) => void }) {
  const t = useT();
  const { events } = question;
  const setEvent = (id: string, changes: Partial<TimelineEvent>) =>
    onChange({ ...question, events: events.map((e) => (e.id === id ? { ...e, ...changes } : e)) });

  return (
    <div className="space-y-4" data-timeline-editor="">
      <p className="text-sm text-muted-foreground">{t("timeline.hint")}</p>
      <ol className="space-y-3">
        {events.map((event, index) => (
          <li key={event.id} className="rounded-xl border bg-muted/30 p-2.5" data-timeline-event="">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-6 shrink-0 text-right font-semibold text-soft-foreground tabular-nums">{index + 1}.</span>
              <RichTextInput
                singleLine
                className="w-36 shrink-0"
                value={event.date}
                ariaLabel={t("timeline.date", { number: index + 1 })}
                placeholder={t("timeline.datePlaceholder")}
                onChange={(date) => setEvent(event.id, { date })}
              />
              <RichTextInput
                singleLine
                className="min-w-40 flex-1"
                value={event.label}
                ariaLabel={t("timeline.label", { number: index + 1 })}
                placeholder={t("timeline.labelPlaceholder")}
                onChange={(label) => setEvent(event.id, { label })}
              />
              <RowControls
                index={index}
                count={events.length}
                min={LIMITS.timelineEvents.min}
                onMove={(by) => onChange({ ...question, events: move(events, index, by) })}
                onRemove={() => onChange({ ...question, events: events.filter((e) => e.id !== event.id) })}
              />
            </div>
            <div className="mt-2 ml-8 flex flex-wrap items-center gap-2 text-sm text-soft-foreground">
              {t("timeline.studentsFill")}
              <SegmentedControl
                label={t("timeline.studentsFill")}
                value={event.hide}
                onChange={(hide) => setEvent(event.id, { hide })}
                options={[
                  { value: "none", label: t("timeline.hideNone") },
                  { value: "date", label: t("timeline.hideDate") },
                  { value: "label", label: t("timeline.hideLabel") },
                ]}
              />
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={`${addButtonClass} ml-6`}
        disabled={events.length >= LIMITS.timelineEvents.max}
        onClick={() => onChange({ ...question, events: [...events, { id: newId(), date: [], label: [], hide: "label" }] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("timeline.add")}
      </button>
      <div aria-hidden="true">
        <p className="mb-1.5 text-sm text-muted-foreground">{t("oa.preview")}</p>
        <div className="paper sheet-font-normal overflow-x-auto rounded-lg border px-4 py-3">
          <TimelinePrint question={question} answerKey={false} />
        </div>
      </div>
    </div>
  );
}
