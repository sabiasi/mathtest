"use client";

import { isDeviceTestId } from "@/lib/auth/teachingSubjects";
import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";

import { ArrowLeft, Copy, Download, LoaderCircle, Printer, SearchX, Shuffle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cloneElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/form";
import { LanguageOverride, useLanguage, useT } from "@/i18n/language";
import { findProblems } from "@/lib/checks";
import { saveTest } from "@/lib/storage/testsRepository";
import type { PrintOptions, Test, VariantSettings } from "@/lib/storage/types";
import { useTest } from "@/lib/storage/useTests";
import { isSampleId } from "@/samples/build";
import { useUseAsTemplate } from "@/features/samples/useTemplate";
import { MAX_VARIANTS, buildVariants, newSeed, type Variant } from "@/lib/variants";
import { getToolkit } from "@/subjects/registry";
import { printBlocks } from "./blocks";
import { renderBlock } from "./pieces";
import { TypographyProvider } from "./Typography";
import { AnswerTable } from "./AnswerTable";
import { GuestBanner } from "@/components/GuestBanner";
import { usePlan } from "@/features/plans/PlanProvider";
import { PremiumBadge } from "@/features/plans/PremiumBadge";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { BRAND } from "@/lib/plans/plans";
import { PdfError, downloadPdf, pdfFileName, waitForImages } from "./downloadPdf";
import { PrintHeader, type PrintVersion } from "./PrintBlocks";
import { usePaperHeader } from "./usePaperHeader";
import { BLOCK_GAP, COLUMN_GAP, HEADER_GAP, PAGE, usePrintLayout } from "./usePrintLayout";

/** The /print/[id] page.  URL: ?version=student|key&variant=A…F|all */
export function PrintView() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const version: PrintVersion = params.get("version") === "key" ? "key" : "student";
  const variant = params.get("variant") ?? "A";
  const lookup = useTest(id);
  const access = useTeachingSubjects();

  if (lookup.status === "loading") return <PrintSkeleton />;
  if (lookup.status === "missing") {
    return (
      <PageTransition className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          Icon={SearchX}
          title={t("editor.notFoundTitle")}
          text={t("editor.notFoundText")}
          actions={
            <Link href="/tests" className={buttonVariants({ variant: "outline" })}>
              {t("editor.backHome")}
            </Link>
          }
        />
      </PageTransition>
    );
  }
  const autoPrint = params.get("print") === "1";
  return (
    <PageTransition>
      {isSampleId(lookup.test.id) || isDeviceTestId(lookup.test.id) || !access.canEdit(lookup.test.subjectId) ? (
        <SampleDocument key={lookup.test.id} sample={lookup.test} version={version} variantParam={variant} autoPrint={autoPrint} />
      ) : (
        <PrintDocument test={lookup.test} version={version} variantParam={variant} autoPrint={autoPrint} />
      )}
    </PageTransition>
  );
}

/** A sample can be printed with any options, but they're kept only while the page is open (never saved). */
function SampleDocument({ sample, ...rest }: { sample: Test; version: PrintVersion; variantParam: string; autoPrint: boolean }) {
  const [test, setTest] = useState(sample);
  return <PrintDocument test={test} onSave={setTest} {...rest} />;
}

/** The print page's layout in grey shapes, while the test loads. */
export function PrintSkeleton() {
  return (
    <div aria-busy="true">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="ml-auto h-10 w-28" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-[210mm] px-3">
        <Skeleton className="aspect-[210/297] w-full rounded-sm" />
      </div>
    </div>
  );
}

function PrintDocument({
  test,
  version,
  variantParam,
  autoPrint = false,
  onSave = saveTest,
}: {
  test: Test;
  version: PrintVersion;
  variantParam: string;
  /** ?print=1 (the "Print" button on a sample card): open the print dialog once the pages are ready. */
  autoPrint?: boolean;
  /** Where changed options go: the saved test, or (samples) only this page. */
  onSave?: (test: Test) => unknown;
}) {
  const t = useT();
  const confirm = useConfirm();
  const language = useLanguage();
  const router = useRouter();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const options = test.printOptions;
  const toolkit = getToolkit(test.subjectId);
  const zoom = useFitToWidth();
  const upgrade = useUpgrade();

  // ---- What the plan allows (the PDF server checks this again) ----
  const plan = usePlan();
  const paperHeader = usePaperHeader();
  // While the plan loads, don't hide anything yet (avoids a flicker for Premium teachers).
  const maxVariants = plan.ready ? plan.entitlements.limits.maxVariants : MAX_VARIANTS;
  const brandFooter = plan.ready && !plan.entitlements.features.noPdfFooter;
  const variantsLimited = test.variants.count > maxVariants;

  // ---- Which variants to show ----
  const variants = useMemo(() => buildVariants(test, maxVariants), [test, maxVariants]);
  const enabled = variants.length > 1;
  const showAll = enabled && variantParam === "all";
  const current = variants.find((v) => v.label === variantParam) ?? variants[0];
  const shown = showAll ? variants : [current];
  const withTable = showAll && version === "key";

  // ---- "Ready" = every section has finished laying out its pages ----
  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({});
  const reportReady = useCallback(
    (key: string, ready: boolean) => setReadyMap((m) => (m[key] === ready ? m : { ...m, [key]: ready })),
    [],
  );
  const reportTableReady = useCallback((ready: boolean) => reportReady("table", ready), [reportReady]);
  const sectionKeys = [...(withTable ? ["table"] : []), ...shown.map((v) => v.label)];
  const ready = sectionKeys.every((key) => readyMap[key]);

  // ---- Names: tab title, PDF title and file name ----
  const versionName = t(version === "key" ? "print.fileKey" : "print.fileStudent");
  const variantName = showAll ? t("variants.allFile") : enabled ? t("variants.name", { label: current.label }) : null;
  const suffix = [variantName, versionName].filter(Boolean).join(" — ");
  const testTitle = test.title || t("test.untitled");
  useEffect(() => {
    const previous = document.title;
    document.title = `${testTitle} — ${suffix}`;
    return () => {
      document.title = previous;
    };
  }, [testTitle, suffix]);

  // ---- ?print=1: print as soon as everything is laid out (once) ----
  const printed = useRef(false);
  useEffect(() => {
    if (!autoPrint || !ready || printed.current) return;
    printed.current = true;
    void waitForImages().then(() => window.print());
  }, [autoPrint, ready]);
  const sample = isSampleId(test.id);
  const makeCopy = useUseAsTemplate();

  // ---- Changing things ----
  function setUrl(changes: { version?: PrintVersion; variant?: string }) {
    const next = new URLSearchParams({ version, variant: variantParam, ...changes });
    router.replace(`?${next}`, { scroll: false });
  }
  function setOptions(changes: Partial<PrintOptions>) {
    onSave({ ...test, printOptions: { ...options, ...changes } });
  }
  function setVariants(changes: Partial<VariantSettings>) {
    onSave({ ...test, variants: { ...test.variants, ...changes } });
  }
  async function reshuffle() {
    const ok = await confirm({
      title: t("variants.reshuffle"),
      message: t("variants.reshuffleConfirm"),
      confirmLabel: t("dialog.continue"),
    });
    if (!ok) return;
    setVariants({ seed: newSeed() });
    toast.success(t("toast.reshuffled"));
  }

  async function handlePdf() {
    setPdfBusy(true);
    setNotice(null);
    try {
      const variant = showAll ? "all" : current.label;
      await downloadPdf(test, version, variant, language, pdfFileName(testTitle, suffix), paperHeader);
      toast.success(t("toast.pdfReady"));
    } catch (error) {
      const status = error instanceof PdfError ? error.status : 0;
      if (status === 429) {
        // Too many PDFs in a short time (protection against abuse): say how long to wait.
        const minutes = Math.max(1, Math.ceil(((error as PdfError).retryAfterSeconds ?? 60) / 60));
        setNotice(t("print.pdfTooMany", { minutes }));
      } else if (status === 503) {
        setNotice(t("print.pdfBusy"));
      } else if (status === 413) {
        setNotice(t("print.pdfTooBig"));
      } else {
        // No Chrome on the server (or another problem): use the print dialog instead.
        setNotice(t("print.pdfFallback"));
        window.print();
      }
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div data-print-ready={ready ? "true" : "false"}>
      {/* ---- Top bar: stays visible while scrolling (screen only) ---- */}
      <div className="sticky top-0 z-20 border-b bg-card/85 shadow-sm backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            href={`/editor/${test.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("print.back")}
          </Link>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => waitForImages().then(() => window.print())} disabled={!ready}>
              <Printer className="size-4" aria-hidden="true" />
              {t("print.print")}
            </Button>
            <Button onClick={handlePdf} disabled={!ready || pdfBusy}>
              {pdfBusy ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {t(pdfBusy ? "print.pdfWorking" : "print.pdf")}
            </Button>
          </div>
          {sample && (
            <div className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-primary-soft-border bg-primary-soft/60 px-3 py-2" data-sample-notice="">
              <p className="min-w-60 flex-1 text-sm text-soft-foreground">{t("sample.printNotice")}</p>
              <Button size="sm" onClick={() => void makeCopy(test)}>
                <Copy className="size-4" aria-hidden="true" />
                {t("sample.useTemplate")}
              </Button>
            </div>
          )}
          {notice && (
            <p className="w-full rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-text">
              {notice}
            </p>
          )}
          {brandFooter && (
            <p className="w-full text-right text-sm text-muted-foreground" data-footer-hint="">
              {t("print.brandHint", { name: BRAND.name })}{" "}
              <button type="button" onClick={() => upgrade("footer")} className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline">
                {t("print.brandRemove")}
                <PremiumBadge compact />
              </button>
            </p>
          )}
        </div>
      </div>

      {/* ---- Options: scroll away with the page, so they don't cover the paper ---- */}
      <div className="border-b bg-card print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          {/* Paper options */}
          <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Option label={t("print.version")}>
              <SegmentedControl<PrintVersion>
                label={t("print.version")}
                value={version}
                onChange={(v) => setUrl({ version: v })}
                options={[
                  { value: "student", label: t("print.student") },
                  { value: "key", label: t("print.key") },
                ]}
              />
            </Option>
            <Option label={t("print.fontSize")}>
              <SegmentedControl
                label={t("print.fontSize")}
                value={options.fontSize}
                onChange={(fontSize) => setOptions({ fontSize })}
                options={[
                  { value: "normal", label: t("print.fontNormal") },
                  { value: "large", label: t("print.fontLarge") },
                ]}
              />
            </Option>
            <Option label={t("print.points")}>
              <SegmentedControl
                label={t("print.points")}
                value={options.showPoints ? "show" : "hide"}
                onChange={(v) => setOptions({ showPoints: v === "show" })}
                options={[
                  { value: "show", label: t("print.show") },
                  { value: "hide", label: t("print.hide") },
                ]}
              />
            </Option>
            <Option label={t("print.columns")}>
              <SegmentedControl
                label={t("print.columns")}
                value={String(options.columns)}
                onChange={(v) => setOptions({ columns: v === "2" ? 2 : 1 })}
                options={[
                  { value: "1", label: t("print.oneColumn") },
                  { value: "2", label: t("print.twoColumns") },
                ]}
              />
            </Option>
            {/* English tests: Georgian instructions under the English ones (younger students). */}
            {toolkit.bilingual && (
              <Checkbox checked={options.bilingual} onChange={(bilingual) => setOptions({ bilingual })} label={t("print.bilingual")} />
            )}
          </div>

          {/* Variants */}
          <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-sm">
            <Option label={t("variants.label")}>
              <SegmentedControl
                label={t("variants.count")}
                value={String(variants.length)}
                onChange={(v) => {
                  // More than the plan allows: explain Premium, change nothing.
                  if (Number(v) > maxVariants) return upgrade("variants");
                  setVariants({ count: Number(v) });
                  if (Number(v) === 1) setUrl({ variant: "A" });
                }}
                options={Array.from({ length: MAX_VARIANTS }, (_, i) => ({
                  value: String(i + 1),
                  label:
                    i + 1 > maxVariants ? (
                      <span className="inline-flex items-center gap-1">
                        {i + 1}
                        <PremiumBadge compact />
                      </span>
                    ) : (
                      String(i + 1)
                    ),
                }))}
              />
            </Option>
            {enabled && (
              <>
                <Checkbox
                  checked={test.variants.shuffleQuestions}
                  onChange={(shuffleQuestions) => setVariants({ shuffleQuestions })}
                  label={t("variants.shuffleQuestions")}
                />
                <Checkbox
                  checked={test.variants.shuffleOptions}
                  onChange={(shuffleOptions) => setVariants({ shuffleOptions })}
                  label={t("variants.shuffleOptions")}
                />
                <button
                  type="button"
                  onClick={reshuffle}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-brand transition-colors hover:bg-primary-soft"
                >
                  <Shuffle className="size-4" aria-hidden="true" />
                  {t("variants.reshuffle")}
                </button>
                <span className="text-muted-foreground">{t("variants.countHint")}</span>
              </>
            )}
          </div>
          {variantsLimited && (
            <p className="w-full text-sm text-muted-foreground" data-variants-limited="">
              {t("variants.limited", { count: test.variants.count, max: maxVariants })}{" "}
              <button type="button" onClick={() => upgrade("variants")} className="font-semibold text-brand underline-offset-2 hover:underline">
                {t("plan.learnMore")}
              </button>
            </p>
          )}
          {enabled && (
            <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Option label={t("variants.show")}>
                <SegmentedControl
                  label={t("variants.show")}
                  value={showAll ? "all" : current.label}
                  onChange={(variant) => setUrl({ variant })}
                  options={[
                    ...variants.map((v) => ({ value: v.label, label: v.label })),
                    { value: "all", label: t("variants.all") },
                  ]}
                />
              </Option>
              {showAll && (
                <span title={t("variants.duplexHint")}>
                  <Checkbox
                    checked={test.variants.duplex}
                    onChange={(duplex) => setVariants({ duplex })}
                    label={t("variants.duplex")}
                  />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <GuestBanner className="mx-auto mt-4 max-w-5xl px-4 sm:px-6" />
      <ProblemsBanner test={test} />

      {/* ---- The A4 sheets ----
          The subject's class (e.g. "subject-math") lets src/subjects/<id>/print.css
          style its paper. The invisible measuring copies sit inside too, so
          pages are measured with the same styles they're printed with. */}
      <div className={`print-sheets ${toolkit.print.className}`} style={{ zoom }}>
        {/* The paper's language: English tests print "Name", "Answer"… in English. */}
        <LanguageOverride language={toolkit.print.language ?? null}>
        <TypographyProvider georgian={toolkit.print.typography === "georgian"}>
        {withTable && <AnswerTable variants={variants} test={test} blankAfter={test.variants.duplex} onReady={reportTableReady} />}
        {shown.map((variant, i) => (
          <PrintedVariant
            key={`${variant.label}-${version}`}
            variant={variant}
            label={enabled ? variant.label : null}
            version={version}
            // Double-sided printing: pad odd-length variants, except the very last one.
            blankAfter={showAll && test.variants.duplex && i < shown.length - 1}
            brandFooter={brandFooter}
            onReady={reportReady}
          />
        ))}
        </TypographyProvider>
        </LanguageOverride>
      </div>
    </div>
  );
}

/**
 * One variant (or the only version): measured, split into pages, drawn as A4 sheets.
 * Also used by the editor's live paper view (features/editor/preview/LivePreview.tsx).
 */
export function PrintedVariant({
  variant,
  label,
  version,
  blankAfter,
  brandFooter,
  onReady,
  zoom,
  highlight = null,
}: {
  variant: Variant;
  label: string | null;
  version: PrintVersion;
  blankAfter: boolean;
  /** Free plan: "Made with MathTest" in the footer of every page. */
  brandFooter: boolean;
  onReady: (key: string, ready: boolean) => void;
  /** Live paper view: the sheets drawn smaller (the invisible measuring copy keeps the real size). */
  zoom?: number;
  /** Live paper view: the question being edited, outlined on the paper (never printed). */
  highlight?: string | null;
}) {
  const t = useT();
  const language = useLanguage();
  const test = variant.test;
  const { measurer, pages, optionColumns, lineStarts, shrink, ready } = usePrintLayout(test, version, language, label);

  useEffect(() => {
    onReady(variant.label, ready);
  }, [ready, onReady, variant.label]);
  useEffect(() => () => onReady(variant.label, false), [onReady, variant.label]);

  const footerName = [
    test.title || t("test.untitled"),
    label && t("variants.name", { label }),
    version === "key" && t("print.key"),
  ]
    .filter(Boolean)
    .join(" — ");

  const blocks = new Map(printBlocks(test.questions, version).map((block) => [block.key, block]));
  const blockFor = (key: string, indexInColumn: number) => {
    const block = blocks.get(key);
    if (!block) return null;
    const active = highlight !== null && block.question.id === highlight ? { "data-editing": "" } : {};
    const drawn = renderBlock(block, { test, version, optionColumns: optionColumns ?? {}, lineStarts }, indexInColumn === 0);
    // Taller than a whole page: drawn smaller so it fits (see usePrintLayout).
    return shrink[key] ? (
      <div key={key} style={{ zoom: shrink[key] }} data-shrunk="" {...active}>
        {drawn}
      </div>
    ) : highlight !== null ? (
      cloneElement(drawn, active)
    ) : (
      drawn
    );
  };

  const sheets = (
    <>
      {!pages ? (
        <p className="flex items-center justify-center gap-2 py-16 text-muted-foreground print:hidden">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          {t("print.preparing")}
        </p>
      ) : (
        pages.map((page, pageIndex) => (
          <section
            key={pageIndex}
            className={`sheet sheet-font-${test.printOptions.fontSize}`}
            aria-label={t("print.page", { page: pageIndex + 1, pages: pages.length })}
          >
            {pageIndex === 0 && (
              <div style={{ marginBottom: `${HEADER_GAP}mm` }}>
                <PrintHeader test={test} version={version} variant={label} />
              </div>
            )}
            {test.questions.length === 0 && <p className="text-center text-neutral-500">{t("print.empty")}</p>}
            <div
              className="sheet-columns"
              style={{
                gridTemplateColumns: `repeat(${test.printOptions.columns}, minmax(0, 1fr))`,
                columnGap: `${COLUMN_GAP}mm`,
              }}
            >
              {page.columns.map((keys, columnIndex) => (
                <div key={columnIndex} className="flex flex-col" style={{ gap: `${BLOCK_GAP}mm` }}>
                  {keys.map(blockFor)}
                </div>
              ))}
            </div>
            <footer className="sheet-footer" style={{ bottom: `${PAGE.padBottom / 2 - 2}mm` }}>
              <span>{footerName}</span>
              {brandFooter && (
                <span className="sheet-brand" data-brand-footer="">
                  {t("print.madeWith", { name: BRAND.website ? `${BRAND.name} · ${BRAND.website}` : BRAND.name })}
                </span>
              )}
              <span>{t("print.page", { page: pageIndex + 1, pages: pages.length })}</span>
            </footer>
          </section>
        ))
      )}
      {/* For double-sided printing: an empty back page so the next variant starts on a new sheet. */}
      {blankAfter && pages && pages.length % 2 === 1 && <section className="sheet" aria-hidden="true" />}
    </>
  );

  return (
    <>
      {measurer}
      {/* Only the live view wraps the sheets: on the print page they must stay siblings (.sheet:last-child). */}
      {zoom === undefined ? sheets : <div style={{ zoom }}>{sheets}</div>}
    </>
  );
}

/** "Before printing, please check: …" — empty questions, missing answers. */
function ProblemsBanner({ test }: { test: Test }) {
  const t = useT();
  const problems = findProblems(test);
  if (problems.length === 0) return null;
  return (
    <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6 print:hidden">
      <div className="rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-warning-text">
        <p className="flex items-center gap-2 font-semibold">
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
          {t("checks.title")}
        </p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-9 text-[15px]">
          {problems.slice(0, 8).map((p, i) => (
            <li key={i}>{t(`checks.${p.kind}`, { number: p.number })}</li>
          ))}
          {problems.length > 8 && <li>…</li>}
        </ul>
        <Link href={`/editor/${test.id}`} className="mt-2 ml-9 inline-block font-semibold underline underline-offset-2">
          {t("checks.fix")}
        </Link>
      </div>
    </div>
  );
}

function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      {children}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-soft-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}

/**
 * A4 is ~794px wide. On narrow screens (phones) we shrink the sheets to fit,
 * using CSS `zoom` (screen only — print CSS resets it to 1).
 */
function useFitToWidth() {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const sheetPx = (PAGE.width * 96) / 25.4;
    const update = () => setZoom(Math.min(1, (window.innerWidth - 24) / sheetPx));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return zoom;
}
