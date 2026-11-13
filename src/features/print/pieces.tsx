"use client";

/** Draws one printed block (see blocks.ts for how questions are split into blocks). */
import type { Test } from "@/lib/storage/types";
import { EssayLines, PassagePiece, PoemPiece } from "@/subjects/georgian/GeorgianPrint";
import { ESSAY_CHUNK, ESSAY_FIRST } from "@/subjects/georgian/text";
import { flowsOn, type PrintBlock } from "./blocks";
import { BLOCK_GAP } from "./usePrintLayout";
import { PrintQuestion, type OptionColumns, type PrintVersion } from "./PrintBlocks";

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
  let content;
  if (question.type === "passage") {
    content = <PassagePiece question={question} index={Number(piece.slice(1)) || 0} lineStart={context.lineStarts[block.key] ?? 1} />;
  } else if (question.type === "poem") {
    content = <PoemPiece question={question} index={Number(piece.slice(1)) || 0} />;
  } else if (question.type === "essay" && piece) {
    const index = Number(piece.slice(1));
    content = <EssayLines count={Math.min(ESSAY_CHUNK, question.lines - ESSAY_FIRST - index * ESSAY_CHUNK)} />;
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
    <div key={block.key} style={pull}>
      {content}
    </div>
  );
}
