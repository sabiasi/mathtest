"use client";

/**
 * How the history questions look on paper (and in the answer key).
 * Black on white only — these are drawn inside .sheet / .paper.
 */
import { useImageUrl } from "@/components/QuestionImageView";
import { RichTextView } from "@/features/math/RichTextView";
import { useT } from "@/i18n/language";
import { optionLabel } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { LabelStyle, MapQuestion, OrderQuestion, SourceQuestion, TimelineQuestion } from "@/lib/storage/types";

// ---------------------------------------------------------------------------
// Chronological order
// ---------------------------------------------------------------------------

/** The events in the order shown on paper (shuffled by lib/variants.ts), empty ones left out. */
export function orderShown(question: OrderQuestion) {
  const items = question.items.filter((item) => !isRichTextEmpty(item.text));
  if (!question.shownOrder) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  return question.shownOrder.map((id) => byId.get(id)).filter((item) => item !== undefined);
}

/** The letters in the right order: ["გ", "ა", "დ", "ბ"]. */
export function orderAnswer(question: OrderQuestion, labelStyle: LabelStyle): string[] {
  const shown = orderShown(question);
  return question.items
    .filter((item) => !isRichTextEmpty(item.text))
    .map((item) => optionLabel(shown.findIndex((s) => s.id === item.id), labelStyle));
}

/**
 *   ა) …   ბ) …   გ) …   (shuffled)
 *   Answer: [ ] [ ] [ ] [ ]
 */
export function OrderPrint({ question, labelStyle, answerKey }: { question: OrderQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  const t = useT();
  const shown = orderShown(question);
  const answer = orderAnswer(question, labelStyle);
  return (
    <div>
      <ul className="print-options" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        {shown.map((item, index) => (
          <li key={item.id} className="print-option">
            <span className="print-option-label">{optionLabel(index, labelStyle)})</span>
            <RichTextView value={item.text} />
          </li>
        ))}
      </ul>
      <div className="print-boxes">
        <span>{t("print.answer")}</span>
        {answer.map((letter, index) => (
          <span key={index} className="print-box">
            {answerKey ? letter : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * Events evenly spaced on an arrow, names above and dates below. What
 * students must fill in is a blank line (filled in on the answer key).
 */
export function TimelinePrint({ question, answerKey }: { question: TimelineQuestion; answerKey: boolean }) {
  const events = question.events;
  if (events.length === 0) return null;
  const columns = { gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))` };
  const cell = (value: (typeof events)[number]["date"], hidden: boolean, below: boolean) =>
    hidden ? (
      <span className={`print-blank ${below ? "" : "is-above"}`}>{answerKey && <RichTextView value={value} className="print-key-text" />}</span>
    ) : (
      <RichTextView value={value} />
    );
  return (
    <div className="print-timeline">
      <div className="print-timeline-row is-labels" style={columns}>
        {events.map((e) => (
          <div key={e.id}>{cell(e.label, e.hide === "label", false)}</div>
        ))}
      </div>
      <div className="print-timeline-line" style={columns}>
        {events.map((e) => (
          <div key={e.id} className="print-timeline-tick" />
        ))}
      </div>
      <div className="print-timeline-row is-dates" style={columns}>
        {events.map((e) => (
          <div key={e.id}>{cell(e.date, e.hide === "date", true)}</div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

/** The quote in a frame with its source, then the questions about it with lines. */
export function SourcePrint({ question, labelStyle, answerKey }: { question: SourceQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  return (
    <div>
      <blockquote className="print-source">
        <RichTextView value={question.source} className="block" />
        {!isRichTextEmpty(question.sourceCaption) && (
          <footer className="print-source-caption">
            — <RichTextView value={question.sourceCaption} />
          </footer>
        )}
      </blockquote>
      <ol className="print-source-parts">
        {question.parts.map((part, index) => (
          <li key={part.id}>
            <p className="flex gap-[2mm]">
              <span className="print-option-label">{optionLabel(index, labelStyle)})</span>
              <RichTextView value={part.text} />
            </p>
            {answerKey && !isRichTextEmpty(part.answer) ? (
              <p className="print-source-answer">
                <RichTextView value={part.answer} className="print-key-text" />
              </p>
            ) : (
              Array.from({ length: part.lines }, (_, i) => <div key={i} className="print-line" />)
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

/** The map with numbered markers, an optional list of names, and numbered answer lines. */
export function MapPrint({ question, answerKey }: { question: MapQuestion; answerKey: boolean }) {
  const t = useT();
  const map = question.map;
  const url = useImageUrl(map?.imageId ?? "");
  if (!map) return null;
  const bank = [...question.markers.map((m) => m.answer.trim()).filter(Boolean)].sort((a, b) => a.localeCompare(b, "ka"));
  return (
    <div>
      <div className="print-map" style={{ width: `${question.mapWidth}%`, aspectRatio: `${map.width} / ${map.height}` }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored pictures (blob:/data: URLs)
          <img src={url} alt="" className="block h-full w-full" draggable={false} />
        ) : (
          <div className="h-full w-full bg-neutral-100" />
        )}
        {question.markers.map((marker, index) => (
          <span key={marker.id} className="print-map-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
            {index + 1}
          </span>
        ))}
      </div>
      {question.wordBank && bank.length > 0 && (
        <p className="print-word-bank">
          <span className="font-semibold">{t("map.wordBankTitle")}</span> {bank.join("  ·  ")}
        </p>
      )}
      <ol className="print-map-answers">
        {question.markers.map((marker, index) => (
          <li key={marker.id}>
            <span>{index + 1}.</span>
            <span className="print-answer-line">{answerKey && marker.answer && <span className="print-key-answer">{marker.answer}</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
