"use client";

/**
 * Geography on paper: the map-scale table and the climate chart. Labels
 * come from the dictionary; numbers use the decimal comma in Georgian.
 * Black on white only (hatching instead of colours).
 */
import { useId } from "react";
import { useLanguage, useT } from "@/i18n/language";
import type { Language } from "@/i18n/dictionaries";
import {
  climateAnswer,
  climateAxes,
  formatNumber,
  namedScale,
  numericScale,
  scaleAnswer,
  scaleBar,
  scaleRows,
  shortMonths,
  type DistanceUnit,
} from "@/lib/geography";
import { optionLabel } from "@/lib/questions";
import type { ClimateChartQuestion, LabelStyle, ScaleCalcQuestion } from "@/lib/storage/types";

type T = ReturnType<typeof useT>;

const unitName = (t: T, unit: DistanceUnit) => t(`scale.unit.${unit}`);

/** "1 სმ-ში 500 მ" / "1 cm = 500 m" */
function namedText(denominator: number, t: T, language: Language) {
  const named = namedScale(denominator);
  return t("scale.named", { value: formatNumber(named.value, language, 3), unit: unitName(t, named.unit) });
}

/** The answers of every row, as printed: "2 კმ", "6 სმ"… */
function rowAnswers(question: ScaleCalcQuestion, t: T, language: Language): string[] {
  return scaleRows(question).map((row) => {
    const value = formatNumber(scaleAnswer(row, question.denominator, question.realUnit), language, 3);
    return `${value} ${unitName(t, row.ask === "real" ? question.realUnit : "cm")}`;
  });
}

/** What the "write the scale in another form" part expects. */
function convertAnswer(question: ScaleCalcQuestion, t: T, language: Language) {
  return question.shown === "numeric" ? namedText(question.denominator, t, language) : numericScale(question.denominator, language);
}

/** A scale bar: 4 segments of exactly 1 cm (black / white), labelled 0, 500, 1000… */
export function ScaleBar({ denominator }: { denominator: number }) {
  const t = useT();
  const language = useLanguage();
  const bar = scaleBar(denominator);
  const width = bar.segments * 10;
  const unit = unitName(t, bar.unit);
  // Room on the right for the unit (≈ 2 mm per letter).
  const total = 4 + width + 3 + unit.length * 2.2 + 4;
  return (
    <svg className="print-scale-bar font-sans" width={`${total}mm`} height="10mm" viewBox={`0 0 ${total} 10`} aria-hidden="true">
      {Array.from({ length: bar.segments }, (_, i) => (
        <rect key={i} x={4 + i * 10} y={1} width={10} height={2} fill={i % 2 === 0 ? "#000" : "#fff"} stroke="#000" strokeWidth={0.25} />
      ))}
      {Array.from({ length: bar.segments + 1 }, (_, i) => (
        <text key={i} x={4 + i * 10} y={7.2} fontSize={2.8} textAnchor="middle" fill="#000">
          {formatNumber(i * bar.step, language, 3)}
        </text>
      ))}
      <text x={4 + width + 3} y={7.2} fontSize={2.8} fill="#000">
        {unit}
      </text>
    </svg>
  );
}

export function ScaleCalcPrint({ question, answerKey }: { question: ScaleCalcQuestion; answerKey: boolean }) {
  const t = useT();
  const language = useLanguage();
  const rows = scaleRows(question);
  const answers = rowAnswers(question, t, language);
  const real = unitName(t, question.realUnit);
  const cm = unitName(t, "cm");
  const given = (value: number, unit: string) => `${formatNumber(value, language, 3)} ${unit}`;
  const blank = (answer: string) => (answerKey ? <b>{answer}</b> : null);

  return (
    <div>
      <div className="print-scale-given">
        <span className="font-semibold">{t("scale.given")}</span>
        {question.shown === "linear" ? (
          <ScaleBar denominator={question.denominator} />
        ) : (
          <span>{question.shown === "numeric" ? numericScale(question.denominator, language) : namedText(question.denominator, t, language)}</span>
        )}
      </div>
      {rows.length > 0 && (
        <table className="print-scale-table">
          <thead>
            <tr>
              <th>№</th>
              <th>{t("scale.mapColumn")}</th>
              <th>{t("scale.realColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td className={row.ask === "map" ? "is-blank" : undefined}>{row.ask === "real" ? given(row.value, cm) : blank(answers[i])}</td>
                <td className={row.ask === "real" ? "is-blank" : undefined}>{row.ask === "map" ? given(row.value, real) : blank(answers[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {question.askConvert && (
        <p className="print-scale-convert">
          <span>{t(question.shown === "numeric" ? "scale.convertNamed" : "scale.convertNumeric")}</span>
          <span className="print-answer-line">{answerKey && <span className="print-key-answer">{convertAnswer(question, t, language)}</span>}</span>
        </p>
      )}
    </div>
  );
}

/** The scale question's answers for the variants' answer table. */
export function ScaleCalcAnswer({ question }: { question: ScaleCalcQuestion }) {
  const t = useT();
  const language = useLanguage();
  const parts = rowAnswers(question, t, language).map((answer, i) => `${i + 1}) ${answer}`);
  if (question.askConvert) parts.push(convertAnswer(question, t, language));
  return <>{parts.join("; ") || "—"}</>;
}

// ---------------------------------------------------------------------------
// Climate chart
// ---------------------------------------------------------------------------

/** Plot area inside the 160 × 88 drawing (same units as the viewBox). */
const PLOT = { left: 15, right: 145, top: 7, bottom: 76 };

/** The chart itself (SVG): grid, hatched precipitation bars, temperature line with dots. */
export function ClimateChart({ question }: { question: ClimateChartQuestion }) {
  const t = useT();
  const language = useLanguage();
  const pattern = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const axes = climateAxes(question.temperature, question.precipitation);
  const height = PLOT.bottom - PLOT.top;
  const slot = (PLOT.right - PLOT.left) / 12;
  const yT = (value: number) => PLOT.bottom - ((value - axes.tMin) / (axes.tMax - axes.tMin)) * height;
  const yP = (value: number) => PLOT.bottom - (value / axes.pMax) * height;
  const xMid = (i: number) => PLOT.left + slot * (i + 0.5);
  const months = shortMonths(language);
  const points = question.temperature.map((v, i) => `${xMid(i).toFixed(2)},${yT(v).toFixed(2)}`).join(" ");

  return (
    <svg className="print-climate-chart font-sans" viewBox="0 0 160 88" role="img" aria-label={question.place || t("type.climate-chart")}>
      <defs>
        <pattern id={pattern} patternUnits="userSpaceOnUse" width={1.6} height={1.6} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={1.6} stroke="#000" strokeWidth={0.45} />
        </pattern>
      </defs>
      {/* Grid lines and the two scales */}
      {Array.from({ length: axes.lines + 1 }, (_, i) => {
        const y = PLOT.bottom - (i / axes.lines) * height;
        const temperature = axes.tMin + i * axes.tStep;
        return (
          <g key={i}>
            <line x1={PLOT.left} x2={PLOT.right} y1={y} y2={y} stroke="#999" strokeWidth={temperature === 0 && axes.tMin < 0 ? 0.45 : 0.2} />
            <text x={PLOT.left - 1.5} y={y + 1} fontSize={2.8} textAnchor="end" fill="#000">
              {formatNumber(temperature, language)}
            </text>
            <text x={PLOT.right + 1.5} y={y + 1} fontSize={2.8} fill="#000">
              {formatNumber(i * axes.pStep, language)}
            </text>
          </g>
        );
      })}
      <text x={PLOT.left - 1.5} y={PLOT.top - 3} fontSize={2.8} textAnchor="end" fontWeight={600} fill="#000">
        °C
      </text>
      <text x={PLOT.right + 1.5} y={PLOT.top - 3} fontSize={2.8} fontWeight={600} fill="#000">
        {language === "ka" ? "მმ" : "mm"}
      </text>
      {/* Precipitation bars (from 0) */}
      {question.precipitation.map((p, i) =>
        p > 0 ? (
          <rect key={i} x={xMid(i) - slot * 0.32} y={yP(p)} width={slot * 0.64} height={PLOT.bottom - yP(p)} fill={`url(#${pattern})`} stroke="#000" strokeWidth={0.3} />
        ) : null,
      )}
      {/* Axes */}
      <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} stroke="#000" strokeWidth={0.35} />
      <line x1={PLOT.right} x2={PLOT.right} y1={PLOT.top} y2={PLOT.bottom} stroke="#000" strokeWidth={0.35} />
      <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} stroke="#000" strokeWidth={0.35} />
      {/* Temperature */}
      <polyline points={points} fill="none" stroke="#000" strokeWidth={0.6} strokeLinejoin="round" />
      {question.temperature.map((v, i) => (
        <circle key={i} cx={xMid(i)} cy={yT(v)} r={0.9} fill="#000" />
      ))}
      {months.map((month, i) => (
        <text key={i} x={xMid(i)} y={PLOT.bottom + 4.5} fontSize={2.8} textAnchor="middle" fill="#000">
          {month}
        </text>
      ))}
    </svg>
  );
}

/** Legend under the chart: hatched box = precipitation, line with a dot = temperature. */
function ClimateLegend() {
  const t = useT();
  const pattern = `legend-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className="print-climate-legend">
      <span>
        <svg width="6mm" height="4mm" viewBox="0 0 6 4" aria-hidden="true">
          <defs>
            <pattern id={pattern} patternUnits="userSpaceOnUse" width={1.6} height={1.6} patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={1.6} stroke="#000" strokeWidth={0.45} />
            </pattern>
          </defs>
          <rect x={0.3} y={0.3} width={5.4} height={3.4} fill={`url(#${pattern})`} stroke="#000" strokeWidth={0.3} />
        </svg>
        {t("climate.precipitation")}
      </span>
      <span>
        <svg width="8mm" height="4mm" viewBox="0 0 8 4" aria-hidden="true">
          <line x1={0} y1={2} x2={8} y2={2} stroke="#000" strokeWidth={0.6} />
          <circle cx={4} cy={2} r={0.9} fill="#000" />
        </svg>
        {t("climate.temperature")}
      </span>
    </div>
  );
}

export function ClimateChartPrint({ question, labelStyle, answerKey }: { question: ClimateChartQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  const t = useT();
  const language = useLanguage();
  const months = shortMonths(language);
  return (
    <div>
      {question.place.trim() && <p className="print-climate-title">{question.place}</p>}
      <ClimateChart question={question} />
      <ClimateLegend />
      {question.table && (
        <table className="print-climate-table">
          <tbody>
            <tr>
              <th />
              {months.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
            <tr>
              <th>°C</th>
              {question.temperature.map((v, i) => (
                <td key={i}>{formatNumber(v, language, 1)}</td>
              ))}
            </tr>
            <tr>
              <th>{language === "ka" ? "მმ" : "mm"}</th>
              {question.precipitation.map((v, i) => (
                <td key={i}>{formatNumber(v, language, 1)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
      {question.tasks.length > 0 && (
        <ol className="print-climate-tasks">
          {question.tasks.map((task, i) => (
            <li key={task}>
              <span className="min-w-0">
                {optionLabel(i, labelStyle)}) {t(`climate.task.${task}`)}
              </span>
              <span className="print-answer-line">{answerKey && <span className="print-key-answer">{climateAnswer(question, task, language)}</span>}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The climate questions' answers for the variants' answer table. */
export function ClimateAnswer({ question, labelStyle }: { question: ClimateChartQuestion; labelStyle: LabelStyle }) {
  const language = useLanguage();
  return <>{question.tasks.map((task, i) => `${optionLabel(i, labelStyle)}) ${climateAnswer(question, task, language)}`).join("; ") || "—"}</>;
}
