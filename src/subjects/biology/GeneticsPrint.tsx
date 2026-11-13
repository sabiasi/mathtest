"use client";

/**
 * Genetics on paper: genotypes (italic alleles, X and Y upright), the
 * Punnett square and the pedigree chart. Black on white only: affected =
 * filled black, carrier = half black, so it needs no colour.
 */
import { Fragment, type KeyboardEvent, type ReactNode } from "react";
import { useT } from "@/i18n/language";
import { cross, genotypeRatio, parseGenotype, phenotypeRatio, ratioText, type Allele, type Genotype } from "@/lib/genetics";
import { PEDIGREE_UNITS, layoutPedigree, personNumbers } from "@/lib/pedigree";
import type { PedigreePerson, PedigreeQuestion, PunnettQuestion } from "@/lib/storage/types";

// ---------------------------------------------------------------------------
// Genotypes
// ---------------------------------------------------------------------------

function AlleleView({ allele }: { allele: Allele }) {
  if (allele.kind === "Y") return <span>Y</span>;
  if (allele.kind === "X")
    return (
      <span>
        X<sup className="italic">{allele.letter}</sup>
      </span>
    );
  return <span className="italic">{allele.letter}</span>;
}

export function GenotypeView({ genotype }: { genotype: Genotype }) {
  return (
    <span className="genotype">
      {genotype.flatMap((locus, i) => locus.alleles.map((allele, j) => <AlleleView key={`${i}-${j}`} allele={allele} />))}
    </span>
  );
}

/** A gamete: one allele per gene. */
export function GameteView({ alleles }: { alleles: Allele[] }) {
  return (
    <span className="genotype">
      {alleles.map((allele, i) => (
        <AlleleView key={i} allele={allele} />
      ))}
    </span>
  );
}

/** Text the teacher typed: drawn as a genotype if it is one, else as it is. */
export function TypedGenotype({ text }: { text: string }) {
  const parsed = parseGenotype(text);
  return parsed.ok ? <GenotypeView genotype={parsed.genotype} /> : <span>{text}</span>;
}

// ---------------------------------------------------------------------------
// Punnett square
// ---------------------------------------------------------------------------

/**
 * The square. In the editor `onCell` makes cells clickable (given ↔ empty)
 * and every genotype is shown; on paper empty cells are blank boxes, filled
 * in on the answer key.
 */
export function PunnettSquare({
  question,
  answerKey,
  onCell,
}: {
  question: PunnettQuestion;
  answerKey: boolean;
  onCell?: (key: string) => void;
}) {
  const result = cross(question.mother, question.father);
  if (!result.ok) return null;
  const { rows, cols, cells } = result.cross;
  const shown = new Set(question.shown);
  const editing = !!onCell;
  const gametesShown = editing || answerKey || !question.blankGametes;
  return (
    <table className={`print-punnett ${cols.length > 4 ? "is-large" : ""}`} data-punnett="">
      <thead>
        <tr>
          <th className="print-punnett-corner">
            <span>♀</span>
            <span>♂</span>
          </th>
          {cols.map((g, c) => (
            <th key={c} className="print-punnett-gamete">
              {gametesShown && <GameteView alleles={g.alleles} />}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((g, r) => (
          <tr key={r}>
            <th className="print-punnett-gamete">{gametesShown && <GameteView alleles={g.alleles} />}</th>
            {cols.map((_, c) => {
              const key = `${r}:${c}`;
              const given = shown.has(key);
              const content = given || answerKey || editing ? <GenotypeView genotype={cells[r][c]} /> : null;
              return (
                <td
                  key={c}
                  className={given ? "is-given" : answerKey && !editing ? "is-answer" : editing ? "is-blank" : ""}
                  onClick={onCell ? () => onCell(key) : undefined}
                  data-cell={key}
                >
                  {editing ? (
                    <button type="button" className="h-full w-full cursor-pointer" aria-pressed={given}>
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PunnettPrint({ question, answerKey }: { question: PunnettQuestion; answerKey: boolean }) {
  const t = useT();
  const result = cross(question.mother, question.father);
  if (!result.ok) return null;
  return (
    <div className="print-genetics">
      {question.showParents && (
        <p className="print-genetics-parents">
          <span className="font-semibold">P:</span> ♀ <GenotypeView genotype={result.mother} /> <span className="px-[1.5mm]">×</span> ♂{" "}
          <GenotypeView genotype={result.father} />
        </p>
      )}
      <PunnettSquare question={question} answerKey={answerKey} />
      {question.askRatios && (
        <div className="print-genetics-ratios">
          <RatioLine label={t("genetics.genotypeRatio")} answer={answerKey ? ratioText(genotypeRatio(result.cross)) : null} />
          <RatioLine label={t("genetics.phenotypeRatio")} answer={answerKey ? ratioText(phenotypeRatio(result.cross, question.traits)) : null} />
        </div>
      )}
    </div>
  );
}

function RatioLine({ label, answer }: { label: string; answer: string | null }) {
  return (
    <div className="flex items-end gap-[2mm]">
      <span>{label}</span>
      <span className="print-answer-line" style={{ maxWidth: "none" }}>
        {answer && <span className="print-key-answer">{answer}</span>}
      </span>
    </div>
  );
}

/** For the answer table: "1 AA : 2 Aa : 1 aa · 3 A_ : 1 aa". */
export function punnettAnswer(question: PunnettQuestion): string {
  const result = cross(question.mother, question.father);
  if (!result.ok) return "";
  return `${ratioText(genotypeRatio(result.cross))} · ${ratioText(phenotypeRatio(result.cross, question.traits))}`;
}

// ---------------------------------------------------------------------------
// Pedigree
// ---------------------------------------------------------------------------

const S = PEDIGREE_UNITS.symbol / 2;

/** One person's symbol: □ male, ○ female, ◇ unknown; filled = affected, left half filled = carrier. */
export function PedigreeSymbol({ person, x, y, size = S }: { person: Pick<PedigreePerson, "sex" | "status" | "deceased">; x: number; y: number; size?: number }) {
  const s = size;
  const fill = person.status === "affected" ? "#000" : "#fff";
  const outline =
    person.sex === "male" ? (
      <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill={fill} stroke="#000" strokeWidth={1.2} />
    ) : person.sex === "female" ? (
      <circle cx={x} cy={y} r={s} fill={fill} stroke="#000" strokeWidth={1.2} />
    ) : (
      <path d={`M ${x} ${y - s * 1.2} L ${x + s * 1.2} ${y} L ${x} ${y + s * 1.2} L ${x - s * 1.2} ${y} Z`} fill={fill} stroke="#000" strokeWidth={1.2} />
    );
  // A carrier: the left half black.
  const half =
    person.status !== "carrier" ? null : person.sex === "male" ? (
      <rect x={x - s} y={y - s} width={s} height={s * 2} fill="#000" />
    ) : person.sex === "female" ? (
      <path d={`M ${x} ${y - s} A ${s} ${s} 0 0 0 ${x} ${y + s} Z`} fill="#000" />
    ) : (
      <path d={`M ${x} ${y - s * 1.2} L ${x - s * 1.2} ${y} L ${x} ${y + s * 1.2} Z`} fill="#000" />
    );
  return (
    <>
      {outline}
      {half}
      {person.deceased && <line x1={x - s * 1.5} y1={y + s * 1.5} x2={x + s * 1.5} y2={y - s * 1.5} stroke="#000" strokeWidth={1.2} />}
    </>
  );
}

/** SVG text for a genotype: italic allele letters, X/Y upright with a raised allele. */
function GenotypeTspans({ text }: { text: string }): ReactNode {
  const parsed = parseGenotype(text);
  if (!parsed.ok) return text;
  return parsed.genotype.flatMap((locus, i) =>
    locus.alleles.map((allele, j) =>
      allele.kind === "Y" ? (
        <tspan key={`${i}${j}`}>Y</tspan>
      ) : allele.kind === "X" ? (
        <Fragment key={`${i}${j}`}>
          <tspan>X</tspan>
          <tspan fontStyle="italic" fontSize="70%" baselineShift="super">
            {allele.letter}
          </tspan>
        </Fragment>
      ) : (
        <tspan key={`${i}${j}`} fontStyle="italic">
          {allele.letter}
        </tspan>
      ),
    ),
  );
}

/**
 * The chart. The editor passes `selected` / `onSelect` (and every answer is
 * shown there); on paper `answerKey` decides whether answer boxes are filled.
 */
export function PedigreeChart({
  question,
  answerKey,
  selected,
  onSelect,
}: {
  question: PedigreeQuestion;
  answerKey: boolean;
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  const t = useT();
  const hasText = question.people.some((p) => p.text || p.ask);
  const layout = layoutPedigree(question, hasText);
  const numbers = personNumbers(question);
  // Printed size: 0.55 mm per unit (a symbol ≈ 9 mm), never wider than the column.
  const widthMm = Math.round(layout.width * 0.55);
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      // font-sans: SVG text doesn't reliably pick up the page's font stack (Latin letters fell back to a serif font).
      className="block font-sans"
      style={{ width: `min(100%, ${widthMm}mm)` }}
      role={onSelect ? undefined : "img"}
      aria-label={onSelect ? undefined : t("type.pedigree")}
      data-pedigree=""
    >
      {layout.lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#000" strokeWidth={1.1} />
      ))}
      {layout.generations.map((g) => (
        <text key={g.label} x={4} y={g.y + 3} fontSize={8.5} fontWeight={700} fill="#000">
          {g.label}
        </text>
      ))}
      {question.people.map((person) => {
        const at = layout.centre.get(person.id)!;
        const below = at.y + S;
        const number = numbers.get(person.id)?.split("-")[1];
        const showAnswer = answerKey || !!onSelect;
        return (
          <g
            key={person.id}
            data-person={numbers.get(person.id)}
            {...(onSelect
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": numbers.get(person.id),
                  "aria-pressed": selected === person.id,
                  onClick: () => onSelect(person.id),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    onSelect(person.id);
                  },
                  style: { cursor: "pointer", outline: "none" },
                }
              : {})}
          >
            {onSelect && <rect x={at.x - 17} y={at.y - 13} width={34} height={hasText ? 52 : 34} fill="transparent" />}
            {selected === person.id && <rect x={at.x - 15} y={at.y - 13} width={30} height={26} rx={4} fill="none" stroke="var(--ring)" strokeWidth={2} strokeDasharray="3 2" />}
            <PedigreeSymbol person={person} x={at.x} y={at.y} />
            {question.numbers && number && (
              <text x={at.x} y={below + 8} fontSize={6.5} textAnchor="middle" fill="#000">
                {number}
              </text>
            )}
            {person.ask ? (
              <>
                <rect x={at.x - 14} y={below + 11} width={28} height={12} fill="#fff" stroke="#000" strokeWidth={0.8} />
                {showAnswer && person.answer && (
                  <text x={at.x} y={below + 20} fontSize={7.5} fontWeight={700} textAnchor="middle" fill="#000">
                    <GenotypeTspans text={person.answer} />
                  </text>
                )}
              </>
            ) : (
              person.text && (
                <text x={at.x} y={below + 20} fontSize={7.5} textAnchor="middle" fill="#000">
                  <GenotypeTspans text={person.text} />
                </text>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** What the symbols mean (only those used in this chart). */
export function PedigreeLegend({ question }: { question: PedigreeQuestion }) {
  const t = useT();
  const used = (test: (p: PedigreePerson) => boolean) => question.people.some(test);
  const items: { key: string; person: Pick<PedigreePerson, "sex" | "status" | "deceased">; label: string }[] = [
    { key: "m", person: { sex: "male", status: "unaffected", deceased: false }, label: t("pedigree.male") },
    { key: "f", person: { sex: "female", status: "unaffected", deceased: false }, label: t("pedigree.female") },
    ...(used((p) => p.status === "affected")
      ? [
          { key: "am", person: { sex: "male" as const, status: "affected" as const, deceased: false }, label: t("pedigree.affectedMale") },
          { key: "af", person: { sex: "female" as const, status: "affected" as const, deceased: false }, label: t("pedigree.affectedFemale") },
        ]
      : []),
    ...(used((p) => p.status === "carrier") ? [{ key: "c", person: { sex: "female" as const, status: "carrier" as const, deceased: false }, label: t("pedigree.carrier") }] : []),
    ...(used((p) => p.sex === "unknown") ? [{ key: "u", person: { sex: "unknown" as const, status: "unaffected" as const, deceased: false }, label: t("pedigree.unknown") }] : []),
    ...(used((p) => p.deceased) ? [{ key: "d", person: { sex: "male" as const, status: "unaffected" as const, deceased: true }, label: t("pedigree.deceased") }] : []),
  ];
  return (
    <div className="print-pedigree-legend">
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-[1.5mm]">
          <svg viewBox="-12 -12 24 24" style={{ width: "4.5mm", height: "4.5mm" }} aria-hidden="true">
            <PedigreeSymbol person={item.person} x={0} y={0} size={7} />
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function PedigreePrint({ question, answerKey }: { question: PedigreeQuestion; answerKey: boolean }) {
  if (question.people.length === 0) return null;
  return (
    <div className="print-genetics">
      <PedigreeChart question={question} answerKey={answerKey} />
      {question.legend && <PedigreeLegend question={question} />}
    </div>
  );
}

/** For the answer table: "II-3 Aa, III-1 aa". */
export function pedigreeAnswer(question: PedigreeQuestion): string {
  const numbers = personNumbers(question);
  return question.people
    .filter((p) => p.ask)
    .sort((a, b) => a.gen - b.gen || a.slot - b.slot)
    .map((p) => `${numbers.get(p.id)} ${p.answer || "?"}`)
    .join(", ");
}

