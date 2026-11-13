"use client";

/**
 * "Label the diagram" on paper (and the same drawing area in the editor):
 * the picture in the middle, a line from each point to its label, and the
 * labels as empty boxes or numbers. Black on white only (it sits inside
 * .sheet / .paper), so it prints the same on black-and-white printers.
 */
import type { ReactNode } from "react";
import { useImageUrl } from "@/components/QuestionImageView";
import { useT } from "@/i18n/language";
import { PICTURE_BOX, areaAspect, labelLetters, pictureSize, printedBank } from "@/lib/labelDiagram";
import { optionLabel } from "@/lib/questions";
import type { DiagramLabel, LabelDiagramQuestion, LabelStyle } from "@/lib/storage/types";
import { drawingUrl } from "./drawings";
import "./LabelDiagramView.css";

/** The SVG's coordinate system: 1000 units wide, as tall as the area's shape. */
const UNITS = 1000;

/** The picture of a question: a built-in drawing or an uploaded picture. */
export function DiagramPicture({ picture }: { picture: NonNullable<LabelDiagramQuestion["picture"]> }) {
  if (picture.kind === "builtin") return <PictureImg url={drawingUrl(picture.drawing)} />;
  return <UploadedPicture imageId={picture.imageId} />;
}

function UploadedPicture({ imageId }: { imageId: string }) {
  const url = useImageUrl(imageId);
  return url ? <PictureImg url={url} /> : <div className="h-full w-full bg-neutral-100" />;
}

function PictureImg({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- built-in SVG drawings and stored pictures (data:/blob: URLs)
  return <img src={url} alt="" draggable={false} className="block h-full w-full object-contain" data-diagram-picture="" />;
}

/** The lines from the points to the labels, with a dot at each point. */
export function LabelLines({ labels, aspect, drag }: { labels: DiagramLabel[]; aspect: number; drag?: Partial<DiagramLabel> & { id: string } }) {
  const height = UNITS / aspect;
  const sx = (v: number) => (v / 100) * UNITS;
  const sy = (v: number) => (v / 100) * height;
  return (
    <svg viewBox={`0 0 ${UNITS} ${height}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {labels.map((label) => {
        const l = drag?.id === label.id ? { ...label, ...drag } : label;
        return (
          <g key={label.id}>
            <line x1={sx(l.x)} y1={sy(l.y)} x2={sx(l.lx)} y2={sy(l.ly)} stroke="#000" strokeWidth={2.4} />
            <circle cx={sx(l.x)} cy={sy(l.y)} r={5} fill="#000" />
          </g>
        );
      })}
    </svg>
  );
}

/** The drawing area: picture, lines and whatever is put at each label (`renderLabel`). */
export function LabelArea({
  question,
  renderLabel,
  drag,
  children,
}: {
  question: LabelDiagramQuestion;
  renderLabel: (label: DiagramLabel, index: number) => ReactNode;
  drag?: Partial<DiagramLabel> & { id: string };
  children?: ReactNode;
}) {
  if (!question.picture) return null;
  const { width, height } = pictureSize(question.picture);
  const aspect = areaAspect(width, height);
  return (
    <div className="relative" style={{ aspectRatio: String(aspect) }} data-label-area="">
      <div
        className="absolute"
        style={{ left: `${PICTURE_BOX.left}%`, top: `${PICTURE_BOX.top}%`, width: `${PICTURE_BOX.width}%`, height: `${PICTURE_BOX.height}%` }}
      >
        <DiagramPicture picture={question.picture} />
      </div>
      {children}
      <LabelLines labels={question.labels} aspect={aspect} drag={drag} />
      {question.labels.map((label, index) => renderLabel(label, index))}
    </div>
  );
}

/** The paper (student version or answer key). */
export function LabelDiagramPrint({ question, labelStyle, answerKey }: { question: LabelDiagramQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  const t = useT();
  if (!question.picture) return null;
  const bank = printedBank(question);
  const letters = question.mode === "match" ? labelLetters(question, labelStyle) : [];
  const position = (label: DiagramLabel) => ({ left: `${label.lx}%`, top: `${label.ly}%` });

  return (
    <div className="print-label-diagram">
      <div style={{ width: `${question.pictureWidth}%`, margin: "0 auto" }}>
        <LabelArea
          question={question}
          renderLabel={(label, index) =>
            question.mode === "boxes" ? (
              <span key={label.id} className="print-label-box" style={position(label)} data-print-label="">
                <span className="print-label-box-number">{index + 1}</span>
                {answerKey && label.answer && <span className="print-key-answer-inline">{label.answer}</span>}
              </span>
            ) : (
              <span key={label.id} className="print-label-number" style={position(label)} data-print-label="">
                {index + 1}
              </span>
            )
          }
        />
      </div>

      {/* The word box: alphabetical, or lettered (and shuffled per variant) for matching */}
      {(question.mode === "match" || question.wordBank) && bank.length > 0 && (
        <div className="print-label-bank">
          {question.mode === "match" ? (
            <ol className="print-label-bank-lettered">
              {bank.map((word, i) => (
                <li key={`${i}-${word}`}>
                  <span className="font-semibold">{optionLabel(i, labelStyle)})</span> {word}
                </li>
              ))}
            </ol>
          ) : (
            <p>
              <span className="font-semibold">{t("bio.wordBankTitle")}</span> {bank.join("  ·  ")}
            </p>
          )}
        </div>
      )}

      {question.mode === "numbers" && (
        <ol className="print-map-answers">
          {question.labels.map((label, index) => (
            <li key={label.id}>
              <span>{index + 1}.</span>
              <span className="print-answer-line">{answerKey && label.answer && <span className="print-key-answer">{label.answer}</span>}</span>
            </li>
          ))}
        </ol>
      )}

      {question.mode === "match" && (
        <div className="print-boxes">
          {question.labels.map((label, index) => (
            <span key={label.id} className="print-box-pair">
              {index + 1}–<span className="print-box">{answerKey ? letters[index] : ""}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** For the answer table (all variants): "1 ბირთვი, 2 …" or "1ბ 2ა …". */
export function labelDiagramAnswer(question: LabelDiagramQuestion, labelStyle: LabelStyle): string {
  if (question.mode === "match") return labelLetters(question, labelStyle).map((letter, i) => `${i + 1}${letter || "?"}`).join(" ");
  return question.labels.map((label, i) => `${i + 1} ${label.answer || "?"}`).join(", ");
}
