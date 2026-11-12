"use client";

import { ArrowLeft, Download, LoaderCircle, Printer, SearchX, Shuffle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { useLanguage, useT } from "@/i18n/language";
import { saveTest } from "@/lib/storage/testsRepository";
import type { PrintOptions, Test, VariantSettings } from "@/lib/storage/types";
import { useTest } from "@/lib/storage/useTests";
import { MAX_VARIANTS, buildVariants, newSeed, type Variant } from "@/lib/variants";
import { AnswerTable } from "./AnswerTable";
import { downloadPdf, pdfFileName } from "./downloadPdf";
import { PrintHeader, PrintQuestion, type PrintVersion } from "./PrintBlocks";
import { BLOCK_GAP, COLUMN_GAP, HEADER_GAP, PAGE, usePrintLayout } from "./usePrintLayout";

/** The /print/[id] page.  URL: ?version=student|key&variant=A…F|all */
export function PrintView() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const version: PrintVersion = params.get("version") === "key" ? "key" : "student";
  const variant = params.get("variant") ?? "A";
  const lookup = useTest(id);

  if (lookup.status === "loading") return <div className="h-72" aria-busy="true" />;
  if (lookup.status === "missing") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <SearchX className="size-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold">{t("editor.notFoundTitle")}</h1>
        <p className="mt-2 text-slate-600">{t("editor.notFoundText")}</p>
        <Link href="/" className={buttonClasses("secondary", "mt-6")}>
          {t("editor.backHome")}
        </Link>
      </div>
    );
  }
  return <PrintDocument test={lookup.test} version={version} variantParam={variant} />;
}

function PrintDocument({ test, version, variantParam }: { test: Test; version: PrintVersion; variantParam: string }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const options = test.printOptions;
  const zoom = useFitToWidth();

  // ---- Which variants to show ----
  const variants = useMemo(() => buildVariants(test), [test]);
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

  // ---- Changing things ----
  function setUrl(changes: { version?: PrintVersion; variant?: string }) {
    const next = new URLSearchParams({ version, variant: variantParam, ...changes });
    router.replace(`?${next}`, { scroll: false });
  }
  function setOptions(changes: Partial<PrintOptions>) {
    saveTest({ ...test, printOptions: { ...options, ...changes } });
  }
  function setVariants(changes: Partial<VariantSettings>) {
    saveTest({ ...test, variants: { ...test.variants, ...changes } });
  }
  function reshuffle() {
    if (window.confirm(t("variants.reshuffleConfirm"))) setVariants({ seed: newSeed() });
  }

  async function handlePdf() {
    setPdfBusy(true);
    setNotice(null);
    try {
      const variant = showAll ? "all" : current.label;
      await downloadPdf(test, version, variant, language, pdfFileName(testTitle, suffix));
    } catch {
      // No Chrome on the server (or another problem): use the print dialog instead.
      setNotice(t("print.pdfFallback"));
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div data-print-ready={ready ? "true" : "false"}>
      {/* ---- Top bar: stays visible while scrolling (screen only) ---- */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            href={`/editor/${test.id}`}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("print.back")}
          </Link>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => window.print()} className={buttonClasses("secondary")} disabled={!ready}>
              <Printer className="size-4" aria-hidden="true" />
              {t("print.print")}
            </button>
            <button type="button" onClick={handlePdf} className={buttonClasses("primary")} disabled={!ready || pdfBusy}>
              {pdfBusy ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {t(pdfBusy ? "print.pdfWorking" : "print.pdf")}
            </button>
          </div>
          {notice && <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        </div>
      </div>

      {/* ---- Options: scroll away with the page, so they don't cover the paper ---- */}
      <div className="border-b border-slate-200 bg-white print:hidden">
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
          </div>

          {/* Variants */}
          <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm">
            <Option label={t("variants.label")}>
              <SegmentedControl
                label={t("variants.count")}
                value={String(variants.length)}
                onChange={(v) => {
                  setVariants({ count: Number(v) });
                  if (Number(v) === 1) setUrl({ variant: "A" });
                }}
                options={Array.from({ length: MAX_VARIANTS }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
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
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  <Shuffle className="size-4" aria-hidden="true" />
                  {t("variants.reshuffle")}
                </button>
                <span className="text-slate-400">{t("variants.countHint")}</span>
              </>
            )}
          </div>
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

      {/* ---- The A4 sheets ---- */}
      <div className="print-sheets" style={{ zoom }}>
        {withTable && <AnswerTable variants={variants} test={test} blankAfter={test.variants.duplex} onReady={reportTableReady} />}
        {shown.map((variant, i) => (
          <PrintedVariant
            key={`${variant.label}-${version}`}
            variant={variant}
            label={enabled ? variant.label : null}
            version={version}
            // Double-sided printing: pad odd-length variants, except the very last one.
            blankAfter={showAll && test.variants.duplex && i < shown.length - 1}
            onReady={reportReady}
          />
        ))}
      </div>
    </div>
  );
}

/** One variant (or the only version): measured, split into pages, drawn as A4 sheets. */
function PrintedVariant({
  variant,
  label,
  version,
  blankAfter,
  onReady,
}: {
  variant: Variant;
  label: string | null;
  version: PrintVersion;
  blankAfter: boolean;
  onReady: (key: string, ready: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const test = variant.test;
  const { measurer, pages, optionColumns, ready } = usePrintLayout(test, version, language, label);

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

  const blockFor = (questionId: string) => {
    const index = test.questions.findIndex((q) => q.id === questionId);
    return (
      <PrintQuestion
        key={questionId}
        question={test.questions[index]}
        number={index + 1}
        test={test}
        version={version}
        optionColumns={optionColumns ?? {}}
      />
    );
  };

  return (
    <>
      {measurer}
      {!pages ? (
        <p className="py-16 text-center text-slate-500 print:hidden">{t("print.preparing")}</p>
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
            {test.questions.length === 0 && <p className="text-center text-slate-500">{t("print.empty")}</p>}
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
              <span>{t("print.page", { page: pageIndex + 1, pages: pages.length })}</span>
            </footer>
          </section>
        ))
      )}
      {/* For double-sided printing: an empty back page so the next variant starts on a new sheet. */}
      {blankAfter && pages && pages.length % 2 === 1 && <section className="sheet" aria-hidden="true" />}
    </>
  );
}

function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{label}:</span>
      {children}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-indigo-600"
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
