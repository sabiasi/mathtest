"use client";

/**
 * Ecology on paper: food chains / webs (boxes and arrows, empty boxes for
 * students) and ecological pyramids (bars that get narrower towards the top).
 * Black on white only.
 */
import { useId, type KeyboardEvent } from "react";
import { useT } from "@/i18n/language";
import { WEB_UNITS, layoutWeb, pyramidWidths, twoLines } from "@/lib/ecology";
import type { FoodWebQuestion, PyramidLevel, PyramidQuestion } from "@/lib/storage/types";
import "./BiologyPrint.css";

/**
 * The food web drawing. In the editor (`onSelect`) every name is shown, hidden
 * ones with a dashed box; on paper hidden boxes are empty (the key fills them).
 */
export function FoodWebChart({
  question,
  answerKey,
  selected,
  onSelect,
}: {
  question: FoodWebQuestion;
  answerKey: boolean;
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  const t = useT();
  const marker = `arrow-${useId().replace(/:/g, "")}`;
  const layout = layoutWeb(question);
  const { boxW, boxH } = WEB_UNITS;
  const editing = !!onSelect;
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="block font-sans"
      style={{ width: `min(100%, ${Math.round(layout.width * 0.36)}mm)` }}
      role={editing ? undefined : "img"}
      aria-label={editing ? undefined : t("type.food-web")}
      data-food-web=""
    >
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
        </marker>
      </defs>
      {layout.arrows.map((a) => (
        <line key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#000" strokeWidth={1.4} markerEnd={`url(#${marker})`} />
      ))}
      {question.organisms.map((o) => {
        const c = layout.centre.get(o.id)!;
        const showName = !o.hidden || answerKey || editing;
        const lines = twoLines(o.name);
        return (
          <g
            key={o.id}
            data-organism={o.name}
            {...(onSelect
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": o.name || "?",
                  "aria-pressed": selected === o.id,
                  onClick: () => onSelect(o.id),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(o.id);
                    }
                  },
                  style: { cursor: "pointer", outline: "none" },
                }
              : {})}
          >
            <rect
              x={c.x - boxW / 2}
              y={c.y - boxH / 2}
              width={boxW}
              height={boxH}
              rx={5}
              fill="#fff"
              stroke={selected === o.id ? "var(--ring)" : "#000"}
              strokeWidth={selected === o.id ? 2.6 : 1.3}
              strokeDasharray={editing && o.hidden ? "5 3" : undefined}
            />
            {showName &&
              lines.map((line, i) => (
                <text
                  key={i}
                  x={c.x}
                  y={c.y + (i - (lines.length - 1) / 2) * 12 + 4}
                  fontSize={lines.length > 1 ? 10 : 11}
                  fontWeight={o.hidden && answerKey && !editing ? 700 : 400}
                  textAnchor="middle"
                  fill="#000"
                >
                  {line}
                </text>
              ))}
          </g>
        );
      })}
    </svg>
  );
}

export function FoodWebPrint({ question, answerKey }: { question: FoodWebQuestion; answerKey: boolean }) {
  const t = useT();
  if (question.organisms.length === 0) return null;
  return (
    <div className="print-bio-figure">
      <FoodWebChart question={question} answerKey={answerKey} />
      {question.legend && <p className="print-bio-note">{t("web.legend")}</p>}
    </div>
  );
}

export const foodWebAnswer = (question: FoodWebQuestion) =>
  question.organisms
    .filter((o) => o.hidden)
    .map((o) => o.name)
    .join(", ");

/** One blank, or the answer on the key. */
function Fill({ text, hidden, answerKey }: { text: string; hidden: boolean; answerKey: boolean }) {
  if (!hidden) return <span>{text}</span>;
  return answerKey ? <b>{text}</b> : <span className="print-bio-blank" />;
}

/** An ecological pyramid: the bottom bar is the widest; each level's name and value (or blanks). */
export function PyramidPrint({ question, answerKey }: { question: PyramidQuestion; answerKey: boolean }) {
  const widths = pyramidWidths(question.levels.length);
  // Printed from the top (the narrowest) down.
  const rows = question.levels.map((level, i) => ({ level, width: widths[i] })).reverse();
  if (rows.length === 0) return null;
  return (
    <div className="print-pyramid">
      {rows.map(({ level, width }) => (
        <div key={level.id} className="print-pyramid-row">
          <span className="print-pyramid-level">{level.level}</span>
          <span className="print-pyramid-area">
            <span className="print-pyramid-bar" style={{ width: `${width}%` }}>
              <PyramidText level={level} answerKey={answerKey} />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function PyramidText({ level, answerKey }: { level: PyramidLevel; answerKey: boolean }) {
  const hideName = level.hide === "name" || level.hide === "both";
  const hideValue = level.hide === "value" || level.hide === "both";
  return (
    <>
      <Fill text={level.name} hidden={hideName} answerKey={answerKey} />
      {(level.value || hideValue) && (
        <>
          <span className="px-[1.5mm]">—</span>
          <Fill text={level.value} hidden={hideValue} answerKey={answerKey} />
        </>
      )}
    </>
  );
}

export const pyramidAnswer = (question: PyramidQuestion) =>
  question.levels
    .filter((l) => l.hide !== "none")
    .map((l) => [l.hide !== "value" ? l.name : "", l.hide !== "name" ? l.value : ""].filter(Boolean).join(" "))
    .join(", ");
