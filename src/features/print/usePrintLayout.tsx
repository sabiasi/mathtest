"use client";

/**
 * Works out the printed pages for a test, in two measuring steps:
 *
 *   1. Measure how wide each multiple-choice option is, to choose
 *      4 / 3 / 2 / 1 option columns per question.
 *   2. Measure how tall each question block is, then let `paginate` pack
 *      them into A4 pages.
 *
 * Measuring happens in invisible copies placed off-screen with exactly the
 * same width and font size as on paper. Because WE decide the page breaks
 * (instead of the browser), the screen, the printer and the PDF all break
 * pages in exactly the same places.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { paginate, type Page } from "@/lib/paginate";
import type { Test } from "@/lib/storage/types";
import { RichTextView } from "@/features/math/RichTextView";
import { optionLabel, visibleOptions } from "@/lib/questions";
import { PrintHeader, rightColumnPercent, type OptionColumns, type PrintVersion } from "./PrintBlocks";
import { flowsOn, keepsWithNext, printBlocks } from "./blocks";
import { renderBlock } from "./pieces";

// --- Paper geometry, in millimetres (must match .sheet in globals.css) ---
export const PAGE = { width: 210, height: 297, padTop: 14, padX: 16, padBottom: 18 };
export const CONTENT_WIDTH = PAGE.width - 2 * PAGE.padX; // 178mm
export const CONTENT_HEIGHT = PAGE.height - PAGE.padTop - PAGE.padBottom; // 265mm
export const COLUMN_GAP = 8;
export const BLOCK_GAP = 5;
export const HEADER_GAP = 6;
const OPTION_GAP = 6;
const BODY_INDENT = 7; // the question number column (5mm) + gap (2mm)
const RIGHT_IMAGES_GAP = 3;

const PX_PER_MM = 96 / 25.4;
export const mmToPx = (mm: number) => mm * PX_PER_MM;

export function columnWidth(columns: 1 | 2) {
  return columns === 1 ? CONTENT_WIDTH : (CONTENT_WIDTH - COLUMN_GAP) / 2;
}

function chooseOptionColumns(count: number, widestPx: number, columns: 1 | 2, rightPercent: number): 1 | 2 | 3 | 4 {
  // Pictures on the right take part of the width away from the answers.
  const questionWidth = columnWidth(columns) - BODY_INDENT;
  const besidePictures = rightPercent > 0 ? (questionWidth * (100 - rightPercent)) / 100 - RIGHT_IMAGES_GAP : questionWidth;
  const available = mmToPx(besidePictures);
  const candidates: (1 | 2 | 3 | 4)[] = count === 4 ? [4, 2, 1] : count === 2 ? [2, 1] : count === 3 ? [3, 1] : [3, 2, 1];
  for (const n of candidates) {
    const cell = (available - (n - 1) * mmToPx(OPTION_GAP)) / n;
    if (widestPx <= cell) return n;
  }
  return 1;
}

/**
 * Reading texts: how many printed lines each paragraph has (its height ÷
 * the line height), so line numbers continue from paragraph to paragraph,
 * even across pages. Returns { block key: number of its first line }.
 */
function countPassageLines(root: HTMLElement): Record<string, number> {
  const starts: Record<string, number> = {};
  let currentText = "";
  let next = 1;
  root.querySelectorAll<HTMLElement>("[data-block]").forEach((block) => {
    const lines = block.querySelector<HTMLElement>("[data-passage-lines]");
    const key = block.dataset.block!;
    if (!lines) return;
    const textId = key.split("~")[0];
    if (textId !== currentText) {
      currentText = textId; // a new reading text starts again at line 1
      next = 1;
    }
    starts[key] = next;
    const lineHeight = parseFloat(getComputedStyle(lines).lineHeight) || 1;
    next += Math.max(1, Math.round(lines.getBoundingClientRect().height / lineHeight));
  });
  return starts;
}

/**
 * How much smaller a too-tall block is drawn (CSS `zoom`). The width stays
 * the same, so smaller letters also mean fewer lines: the real height ends up
 * a little under the page. Never below 0.5 (it must stay readable).
 */
export const shrinkToFit = (height: number, available: number) => Math.max(0.5, Math.floor((available / height) * 100) / 100);

export function usePrintLayout(test: Test, version: PrintVersion, language: string, variant: string | null) {
  // Fonts (Georgian, math) can finish loading late and change sizes:
  // count those events so we measure again when it happens.
  const [fontEpoch, setFontEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setFontEpoch((n) => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);

  // A "signature" of everything that affects the layout. When it changes, we re-measure.
  const signature = JSON.stringify([test.questions, test.printOptions, test.labelStyle, test.title, test.schoolName,
    test.subject, test.grade, test.date, test.timeLimitMinutes, test.instructions, version, language, variant, fontEpoch]);

  const probeRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [optionColumns, setOptionColumns] = useState<{ signature: string; value: OptionColumns } | null>(null);
  const [pages, setPages] = useState<{ signature: string; value: Page[]; lineStarts: Record<string, number>; shrink: Record<string, number> } | null>(null);
  const { columns, fontSize } = test.printOptions;

  // Step 1: option widths → option columns.
  useEffect(() => {
    if (optionColumns?.signature === signature) return;
    let alive = true;
    void probeRef.current?.offsetWidth; // make the browser lay it out (and start loading fonts)
    document.fonts.ready.then(() => {
      const root = probeRef.current;
      if (!alive || !root) return;
      const value: OptionColumns = {};
      root.querySelectorAll<HTMLElement>("[data-qid]").forEach((group) => {
        const widths = [...group.children].map((el) => el.getBoundingClientRect().width);
        const question = test.questions.find((q) => q.id === group.dataset.qid);
        const rightPercent = question ? rightColumnPercent(question) : 0;
        value[group.dataset.qid!] = chooseOptionColumns(widths.length, Math.max(0, ...widths), columns, rightPercent);
      });
      setOptionColumns({ signature, value });
    });
    return () => {
      alive = false;
    };
  }, [signature, optionColumns?.signature, columns, test.questions]);

  // Step 2: block heights → pages.
  useEffect(() => {
    if (optionColumns?.signature !== signature || pages?.signature === signature) return;
    let alive = true;
    void measureRef.current?.offsetWidth;
    document.fonts.ready.then(() => {
      const root = measureRef.current;
      if (!alive || !root) return;
      const header = root.querySelector<HTMLElement>("[data-header]")!;
      // Paragraphs and essay lines that continue the block before them are
      // drawn without a gap (see pieces.tsx), so they need none here either.
      const list = printBlocks(test.questions, version);
      const flowing = new Set(list.filter(flowsOn).map((b) => b.key));
      const keepers = new Set(list.filter(keepsWithNext).map((b) => b.key));
      // 2px of safety for rounding differences between screen and print.
      const columnHeight = mmToPx(CONTENT_HEIGHT) - 2;
      // A question is never split, so one that is taller than a whole page
      // (e.g. a long task list on a two-column paper with large letters) is
      // drawn smaller until it fits, instead of running under the footer.
      const shrink: Record<string, number> = {};
      const firstPageTop = header.getBoundingClientRect().height + mmToPx(HEADER_GAP);
      const blocks = [...root.querySelectorAll<HTMLElement>("[data-block]")].map((el, index) => {
        const key = el.dataset.block!;
        let height = el.getBoundingClientRect().height;
        // The very first block sits under the test header, so it has less room.
        const room = index === 0 ? columnHeight - firstPageTop : columnHeight;
        if (height > room) {
          shrink[key] = shrinkToFit(height, room);
          height = room;
        }
        return { key, height, gap: flowing.has(key) ? 0 : undefined, keepWithNext: keepers.has(key) };
      });
      const value = paginate({
        blocks,
        columnHeight,
        columns,
        gap: mmToPx(BLOCK_GAP),
        firstPageTop,
      });
      setPages({ signature, value, lineStarts: countPassageLines(root), shrink });
    });
    return () => {
      alive = false;
    };
  }, [signature, optionColumns, pages?.signature, columns, test.questions, version]);

  // While re-measuring (e.g. a font finished loading), keep showing the previous
  // pages instead of flashing an empty screen. `ready` says the pages are up to date.
  const currentColumns = optionColumns?.signature === signature ? optionColumns.value : null;
  const ready = pages?.signature === signature;

  // The invisible copies used for measuring.
  const hidden = "pointer-events-none invisible absolute top-0 -left-[10000px]";
  const measurer: ReactNode = (
    <div aria-hidden="true" className={`sheet-font-${fontSize}`}>
      <div ref={probeRef} className={hidden}>
        {test.questions.map((q) =>
          q.type === "multiple-choice" ? (
            <div key={q.id} data-qid={q.id}>
              {visibleOptions(q).map((option, index) => (
                // Inline style: our .print-option CSS says display:flex (full width); here we
                // need each option's natural width. Inline styles beat stylesheet rules.
                <span
                  key={option.id}
                  className="print-option whitespace-nowrap"
                  style={{ display: "inline-flex", width: "max-content" }}
                >
                  <span className="print-option-label">{optionLabel(index, test.labelStyle)})</span>
                  <RichTextView value={option.text} />
                </span>
              ))}
            </div>
          ) : null,
        )}
      </div>
      {currentColumns && (
        <div ref={measureRef} className={hidden}>
          <div data-header="" style={{ width: `${CONTENT_WIDTH}mm` }}>
            <PrintHeader test={test} version={version} variant={variant} />
          </div>
          <div style={{ width: `${columnWidth(columns)}mm` }}>
            {printBlocks(test.questions, version).map((block) => (
              <div key={block.key} data-block={block.key}>
                {renderBlock(block, { test, version, optionColumns: currentColumns, lineStarts: {} })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return {
    measurer,
    pages: pages?.value ?? null,
    lineStarts: pages?.lineStarts ?? {},
    shrink: pages?.shrink ?? {},
    optionColumns: currentColumns ?? optionColumns?.value ?? null,
    ready,
  };
}
