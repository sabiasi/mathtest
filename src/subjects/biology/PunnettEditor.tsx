"use client";

import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { cross, genotypeRatio, parseGenotype, phenotypeRatio, ratioText, type Genotype } from "@/lib/genetics";
import type { PunnettQuestion } from "@/lib/storage/types";
import { PunnettSquare } from "./GeneticsPrint";

/** Ready-made crosses (one click fills in both parents). */
const EXAMPLES: [string, string][] = [
  ["Aa", "Aa"],
  ["Aa", "aa"],
  ["AaBb", "AaBb"],
  ["XAXa", "XAY"],
  ["XAXa", "XaY"],
];

/**
 * Punnett square: type the parents' genotypes; the square is built
 * automatically. Click a cell to give it to the students already filled in
 * (the others are empty boxes for them to complete).
 */
export function PunnettEditor({ question, onChange }: { question: PunnettQuestion; onChange: (question: PunnettQuestion) => void }) {
  const t = useT();
  const result = cross(question.mother, question.father);
  const mother = parseGenotype(question.mother);
  const father = parseGenotype(question.father);
  const cellKeys = result.ok ? result.cross.rows.flatMap((_, r) => result.cross.cols.map((__, c) => `${r}:${c}`)) : [];
  // Trait names: one row per gene (taken from the mother, else the father).
  const genes: Genotype = mother.ok ? mother.genotype : father.ok ? father.genotype : [];

  const toggle = (key: string) =>
    onChange({ ...question, shown: question.shown.includes(key) ? question.shown.filter((k) => k !== key) : [...question.shown, key] });
  const setTrait = (gene: string, changes: Partial<{ dominant: string; recessive: string }>) =>
    onChange({ ...question, traits: { ...question.traits, [gene]: { ...{ dominant: "", recessive: "" }, ...question.traits[gene], ...changes } } });

  let error: string | null = null;
  if (!result.ok) {
    if ((result.error === "mother" || result.error === "father") && result.parse && !result.parse.ok) {
      error = t(`genetics.error.${result.parse.error}` as MessageKey, { who: t(result.error === "mother" ? "genetics.mother" : "genetics.father"), detail: result.parse.detail ?? "" });
    } else error = t(`genetics.error.${result.error}` as MessageKey);
  }

  return (
    <div className="space-y-4" data-punnett-editor="">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-soft-foreground">♀ {t("genetics.mother")}</span>
          <Input
            value={question.mother}
            maxLength={20}
            spellCheck={false}
            lang="en"
            className="font-mono"
            onChange={(e) => onChange({ ...question, mother: e.target.value, shown: [] })}
            data-mother=""
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-soft-foreground">♂ {t("genetics.father")}</span>
          <Input
            value={question.father}
            maxLength={20}
            spellCheck={false}
            lang="en"
            className="font-mono"
            onChange={(e) => onChange({ ...question, father: e.target.value, shown: [] })}
            data-father=""
          />
        </label>
      </div>
      <p className="text-sm text-muted-foreground">{t("genetics.howToType")}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{t("genetics.examples")}</span>
        {EXAMPLES.map(([m, f]) => (
          <button
            key={`${m}${f}`}
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm", className: "font-mono" })}
            onClick={() => onChange({ ...question, mother: m, father: f, shown: [] })}
          >
            {m} × {f}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-text" role="alert" data-genetics-error="">
          {error}
        </p>
      ) : (
        result.ok && (
          <>
            <p className="text-sm text-muted-foreground">{t("genetics.cellsHint")}</p>
            <div className="paper overflow-x-auto rounded-xl border p-3">
              <PunnettSquare question={question} answerKey={false} onCell={toggle} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonVariants({ variant: "ghost", size: "sm" })} onClick={() => onChange({ ...question, shown: [] })}>
                {t("genetics.allEmpty")}
              </button>
              <button type="button" className={buttonVariants({ variant: "ghost", size: "sm" })} onClick={() => onChange({ ...question, shown: cellKeys })}>
                {t("genetics.allFilled")}
              </button>
            </div>
            <dl className="grid gap-1 rounded-xl bg-muted/50 p-3 text-sm" data-ratios="">
              <div>
                <dt className="inline text-muted-foreground">{t("genetics.genotypeRatio")} </dt>
                <dd className="inline font-medium">{ratioText(genotypeRatio(result.cross))}</dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">{t("genetics.phenotypeRatio")} </dt>
                <dd className="inline font-medium">{ratioText(phenotypeRatio(result.cross, question.traits))}</dd>
              </div>
            </dl>
          </>
        )
      )}

      {genes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-soft-foreground">
            {t("genetics.traits")} <span className="font-normal text-muted-foreground">({t("genetics.traitsHint")})</span>
          </p>
          {genes.map((locus) => (
            <div key={locus.gene} className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-sm">
              <span className="font-semibold italic">{locus.gene.toUpperCase()}</span>
              <Input
                className="h-9"
                maxLength={40}
                value={question.traits[locus.gene]?.dominant ?? ""}
                placeholder={t("genetics.dominantPlaceholder")}
                aria-label={t("genetics.dominant", { allele: locus.gene.toUpperCase() })}
                onChange={(e) => setTrait(locus.gene, { dominant: e.target.value })}
              />
              <span className="font-semibold italic">{locus.gene}</span>
              <Input
                className="h-9"
                maxLength={40}
                value={question.traits[locus.gene]?.recessive ?? ""}
                placeholder={t("genetics.recessivePlaceholder")}
                aria-label={t("genetics.recessive", { allele: locus.gene })}
                onChange={(e) => setTrait(locus.gene, { recessive: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-soft-foreground">
        {(
          [
            ["showParents", "genetics.showParents"],
            ["blankGametes", "genetics.blankGametes"],
            ["askRatios", "genetics.askRatios"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-primary" checked={question[field]} onChange={(e) => onChange({ ...question, [field]: e.target.checked })} />
            {t(label)}
          </label>
        ))}
      </div>
    </div>
  );
}
