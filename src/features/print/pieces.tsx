"use client";

/** Draws one printed block (see blocks.ts for how questions are split into blocks). */
import { useT } from "@/i18n/language";
import type { EssayQuestion, Test } from "@/lib/storage/types";
import { EssayLines, PassagePiece, PoemPiece } from "@/subjects/georgian/GeorgianPrint";
import { ESSAY_CHUNK, ESSAY_FIRST } from "@/subjects/georgian/text";
import { ListeningPrint, SectionPrint, SpeakingPage, TranscriptPiece } from "@/subjects/english/EnglishPrint";
import { formatPoints, sectionPoints } from "@/lib/questions";
import { flowsOn, type PrintBlock } from "./blocks";
import { BLOCK_GAP } from "./usePrintLayout";
import { PrintQuestion, type OptionColumns, type PrintVersion } from "./PrintBlocks";
import { RichTextView } from "@/features/math/RichTextView";
import { isRichTextEmpty } from "@/lib/richText";
import { CodonTablePrint } from "@/subjects/biology/MolecularPrint";

export type BlockContext = {
  test: Test;
  version: PrintVersion;
  optionColumns: OptionColumns;
  /** Reading texts: the number of the first printed line of each paragraph block. */
  lineStarts: Record<string, number>;
};

/**
 * Draws one block. `firstInColumn`: at the top of a column a continuation
 * keeps its place; elsewhere it's pulled up over the column's gap so the text
 * flows on (the page packer counts no gap for it either: usePrintLayout).
 */
export function renderBlock(block: PrintBlock, context: BlockContext, firstInColumn = true) {
  const { question, piece } = block;
  const pull = !firstInColumn && flowsOn(block) ? { marginTop: `-${BLOCK_GAP}mm` } : undefined;
  const index = Number(piece.slice(1)) || 0;
  let content;
  if (question.type === "passage") {
    content = <PassagePiece question={question} index={index} lineStart={context.lineStarts[block.key] ?? 1} />;
  } else if (question.type === "poem") {
    content = <PoemPiece question={question} index={index} />;
  } else if (question.type === "section") {
    content = (
      <SectionPrint
        question={question}
        points={sectionPoints(context.test.questions).get(question.id) ?? 0}
        showPoints={context.test.printOptions.showPoints}
      />
    );
  } else if (question.type === "listening") {
    content = piece ? <TranscriptPiece question={question} index={index} /> : <ListeningPrint question={question} />;
  } else if (question.type === "codon-table") {
    // Reference material: no number, no points; an optional title above it.
    content = (
      <div className="print-question">
        {!isRichTextEmpty(question.text) && <RichTextView value={question.text} className="print-text" />}
        <CodonTablePrint question={question} />
      </div>
    );
  } else if (question.type === "speaking") {
    content = <SpeakingPage question={question} page={index} />;
  } else if (question.type === "essay" && piece) {
    content = (
      <EssayMoreLines
        question={question}
        number={block.number ?? 0}
        count={Math.min(ESSAY_CHUNK, question.lines - ESSAY_FIRST - index * ESSAY_CHUNK)}
        showPoints={context.test.printOptions.showPoints}
      />
    );
  } else {
    content = (
      <PrintQuestion
        question={question}
        number={block.number ?? 0}
        test={context.test}
        version={context.version}
        optionColumns={context.optionColumns}
      />
    );
  }
  return (
    <div key={block.key} style={pull} data-print-block={block.key}>
      {content}
    </div>
  );
}

/**
 * More writing lines of an essay (after the first ones). They sit in the same
 * columns as the question (the number and the points are there, invisible),
 * so every line of the essay has the same width.
 */
function EssayMoreLines({ question, number, count, showPoints }: { question: EssayQuestion; number: number; count: number; showPoints: boolean }) {
  const t = useT();
  const points = formatPoints(question.points);
  return (
    <div className="print-question">
      <div className="flex items-start gap-[2mm]">
        <span className="print-number invisible" aria-hidden="true">
          {number}.
        </span>
        <div className="min-w-0 flex-1">
          <EssayLines count={count} />
        </div>
        {showPoints && (
          <span className="print-points invisible" aria-hidden="true">
            ({t(question.points === 1 ? "print.pointsOne" : "print.pointsMany", { points })})
          </span>
        )}
      </div>
    </div>
  );
}
