"use client";

/** A compact, read-only look at one generated question (with its answer), for the review step. */
import { Check } from "lucide-react";
import { RichTextView } from "@/features/math/RichTextView";
import { useT } from "@/i18n/language";
import { chemLatex } from "@/lib/chem";
import { formatPoints } from "@/lib/questions";
import type { Question } from "@/lib/storage/types";
import { tokenize, wordRefs, sameRef } from "@/lib/words";
import { cn } from "@/lib/utils";

export function AiQuestionPreview({ question }: { question: Question }) {
  const t = useT();
  const label = (text: string) => <span className="mr-1.5 text-sm font-semibold text-muted-foreground">{text}:</span>;
  let detail = null;
  switch (question.type) {
    case "multiple-choice":
      detail = (
        <ul className="mt-2 space-y-1">
          {question.options.map((option) => {
            const correct = option.id === question.correctOptionId;
            return (
              <li key={option.id} className={cn("flex items-start gap-2 rounded-lg px-2 py-1", correct && "bg-success-soft font-medium text-success-text")} data-correct={correct}>
                <Check className={cn("mt-1 size-4 shrink-0", !correct && "invisible")} aria-label={correct ? t("ai.correct") : undefined} aria-hidden={!correct} />
                <RichTextView value={option.text} />
              </li>
            );
          })}
        </ul>
      );
      break;
    case "true-false":
      detail = <p className="mt-2">{label(t("ai.answer"))}{t(question.correct === true ? "ai.true" : "ai.false")}</p>;
      break;
    case "short-answer":
      detail = <p className="mt-2">{label(t("ai.answer"))}<RichTextView value={question.answer} /></p>;
      break;
    case "open-answer":
      detail = <p className="mt-2 text-sm text-muted-foreground">{t("ai.lines", { count: question.lines })}</p>;
      break;
    case "matching":
      detail = (
        <ul className="mt-2 space-y-1">
          {question.pairs.map((pair) => (
            <li key={pair.id} className="flex flex-wrap gap-x-2">
              <RichTextView value={pair.left} /> <span className="text-muted-foreground">—</span> <RichTextView value={pair.right} />
            </li>
          ))}
          {question.extras.map((extra) => (
            <li key={extra.id} className="text-muted-foreground">
              ({t("ai.extra")}) <RichTextView value={extra.text} />
            </li>
          ))}
        </ul>
      );
      break;
    case "order":
      detail = (
        <ol className="mt-2 list-decimal space-y-1 pl-6">
          {question.items.map((entry) => (
            <li key={entry.id}><RichTextView value={entry.text} /></li>
          ))}
        </ol>
      );
      break;
    case "fill-blank": {
      const tokens = tokenize(question.body);
      const refs = wordRefs(tokens);
      detail = (
        <p className="mt-2 leading-relaxed whitespace-pre-wrap">
          {tokens.map((token, index) =>
            question.blanks.some((blank) => sameRef(blank, refs[index])) ? (
              <span key={index} className="rounded bg-success-soft px-1 font-medium text-success-text underline" data-blank="">{token.text}</span>
            ) : (
              <span key={index}>{token.text}</span>
            ),
          )}
        </p>
      );
      break;
    }
    case "given-find":
      detail = (
        <dl className="mt-2 space-y-1">
          <div>{label(t("ai.given"))}<RichTextView value={question.given} /></div>
          <div>{label(t("ai.find"))}<RichTextView value={question.find} /></div>
          <div>{label(t("ai.solution"))}<RichTextView value={question.solution} /></div>
          <div>{label(t("ai.answer"))}<RichTextView value={question.answer} /></div>
        </dl>
      );
      break;
    case "balance":
      detail = (
        <ul className="mt-2 space-y-1">
          {question.equations.map((equation) => (
            <li key={equation.id}><RichTextView value={[{ type: "math", latex: chemLatex(equation.balanced) }]} /></li>
          ))}
        </ul>
      );
      break;
  }
  return (
    <div className="text-[15px]">
      <p className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t(`type.${question.type}` as Parameters<typeof t>[0])}
        <span className="rounded-full bg-muted px-2 py-0.5 normal-case">{t("ai.points", { points: formatPoints(question.points) })}</span>
      </p>
      <div className="font-medium"><RichTextView value={question.text} /></div>
      {detail}
    </div>
  );
}
