"use client";

/**
 * Classification on paper: a dichotomous key (numbered steps or a tree) and
 * an organism's taxonomy, domain → species, as a staircase.
 */
import { useT } from "@/i18n/language";
import { TREE_UNITS, coupletNumbers, keyTree, layoutKeyTree, wrapLines, type KeyTree } from "@/lib/dichotomous";
import type { DichotomousKeyQuestion, KeyLead, TaxonomyQuestion, TaxonomyRank } from "@/lib/storage/types";
import "./BiologyPrint.css";

// ---------------------------------------------------------------------------
// Dichotomous key
// ---------------------------------------------------------------------------

function LeadText({ lead, numbers, answerKey }: { lead: KeyLead; numbers: Map<string, number>; answerKey: boolean }) {
  if (lead.next) return <span>→ {numbers.get(lead.next) ?? "?"}</span>;
  if (lead.hide && !answerKey) return <span className="print-bio-blank is-wide" />;
  return lead.hide ? <b>{lead.organism}</b> : <span>{lead.organism}</span>;
}

/** The key as numbered steps: "1. Has wings?  yes → 2  no → spider". */
function KeyList({ question, answerKey }: { question: DichotomousKeyQuestion; answerKey: boolean }) {
  const t = useT();
  const numbers = coupletNumbers(question.couplets);
  return (
    <ol className="print-key-list">
      {question.couplets.map((c, i) => (
        <li key={c.id}>
          <span className="print-key-number">{i + 1}.</span>
          <span className="print-key-question">{c.question}</span>
          <span className="print-key-answers">
            <span>
              {t("key.yes")} <LeadText lead={c.yes} numbers={numbers} answerKey={answerKey} />
            </span>
            <span>
              {t("key.no")} <LeadText lead={c.no} numbers={numbers} answerKey={answerKey} />
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The key as a tree: questions in boxes, "yes" / "no" on the branches, organisms at the ends. */
function KeyTreeChart({ tree, answerKey }: { tree: KeyTree; answerKey: boolean }) {
  const t = useT();
  const { nodes, width, height } = layoutKeyTree(tree);
  const { questionW, organismW, organismH, line } = TREE_UNITS;
  const boxHeight = (node: KeyTree) => (node.kind === "organism" ? organismH : wrapLines(node.couplet.question).length * line + 12);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block font-sans" style={{ width: `min(100%, ${Math.round(width * 0.34)}mm)` }} role="img" aria-label={t("type.dichotomous-key")}>
      {nodes.map((n, i) => {
        if (!n.parent) return null;
        // The line runs centre to centre; the boxes (drawn later, white) cover its ends.
        const fromY = n.parent.y + 20;
        const toY = n.y - boxHeight(n.node) / 2;
        const midY = (fromY + toY) / 2;
        const midX = n.parent.x + ((n.x - n.parent.x) * (midY - n.parent.y)) / (n.y - n.parent.y);
        return (
          <g key={`line-${i}`}>
            <line x1={n.parent.x} y1={n.parent.y} x2={n.x} y2={n.y} stroke="#000" strokeWidth={1.2} />
            <rect x={midX - 13} y={midY - 7} width={26} height={12} fill="#fff" />
            <text x={midX} y={midY + 3} fontSize={9} textAnchor="middle" fill="#000" fontWeight={700}>
              {t(n.parent.answer === "yes" ? "key.yes" : "key.no")}
            </text>
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const h = boxHeight(n.node);
        if (n.node.kind === "question") {
          const lines = wrapLines(n.node.couplet.question);
          return (
            <g key={`node-${i}`}>
              <rect x={n.x - questionW / 2} y={n.y - h / 2} width={questionW} height={h} rx={4} fill="#fff" stroke="#000" strokeWidth={1.2} />
              {/* The question's number, just outside the top-left corner (inside it would cover the text). */}
              <text x={n.x - questionW / 2 - 3} y={n.y - h / 2 + 8} fontSize={8} textAnchor="end" fill="#000" fontWeight={700}>
                {n.node.number}
              </text>
              {lines.map((text, k) => (
                <text key={k} x={n.x} y={n.y - h / 2 + 15 + k * line} fontSize={9} textAnchor="middle" fill="#000">
                  {text}
                </text>
              ))}
            </g>
          );
        }
        const lead = n.node.lead;
        const show = !lead.hide || answerKey;
        return (
          <g key={`node-${i}`}>
            <rect x={n.x - organismW / 2} y={n.y - h / 2} width={organismW} height={h} rx={10} fill="#fff" stroke="#000" strokeWidth={1.2} />
            {show && (
              <text x={n.x} y={n.y + 3.5} fontSize={9.5} textAnchor="middle" fill="#000" fontWeight={lead.hide ? 700 : 400}>
                {lead.organism}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function KeyPrint({ question, answerKey }: { question: DichotomousKeyQuestion; answerKey: boolean }) {
  if (question.couplets.length === 0) return null;
  const tree = question.style === "tree" ? keyTree(question) : null;
  return <div className="print-bio-figure">{tree ? <KeyTreeChart tree={tree} answerKey={answerKey} /> : <KeyList question={question} answerKey={answerKey} />}</div>;
}

export const keyAnswer = (question: DichotomousKeyQuestion) =>
  question.couplets
    .flatMap((c) => [c.yes, c.no])
    .filter((l) => !l.next && l.hide)
    .map((l) => l.organism)
    .join(", ");

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

/** Latin names (genus, species) are printed in italics. */
const isLatin = (rank: TaxonomyRank, value: string) => (rank === "genus" || rank === "species") && /^[A-Za-z][A-Za-z .-]*$/.test(value.trim());

export function TaxonomyPrint({ question, answerKey }: { question: TaxonomyQuestion; answerKey: boolean }) {
  const t = useT();
  return (
    <div className="print-taxonomy">
      {question.organism && (
        <p className="print-taxonomy-organism">
          {t("tax.organism")} <b>{question.organism}</b>
        </p>
      )}
      <ol>
        {question.ranks.map((r, i) => (
          <li key={r.rank} style={{ marginLeft: `${i * 5}mm` }}>
            <span className="print-taxonomy-rank">{t(r.rank === "phylum" && question.plants ? "tax.division" : `tax.${r.rank}`)}:</span>
            {r.hide && !answerKey ? (
              <span className="print-bio-blank is-wide" />
            ) : (
              <span className={`${isLatin(r.rank, r.value) ? "italic" : ""} ${r.hide ? "font-bold" : ""}`}>{r.value}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export const taxonomyAnswer = (question: TaxonomyQuestion) =>
  question.ranks
    .filter((r) => r.hide)
    .map((r) => r.value)
    .join(", ");
