"use client";

import { ArrowLeft, Download, LoaderCircle, Printer, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { useLanguage, useT } from "@/i18n/language";
import { saveTest } from "@/lib/storage/testsRepository";
import type { PrintOptions, Test } from "@/lib/storage/types";
import { useTest } from "@/lib/storage/useTests";
import { downloadPdf, pdfFileName } from "./downloadPdf";
import { PrintHeader, PrintQuestion, type PrintVersion } from "./PrintBlocks";
import { BLOCK_GAP, COLUMN_GAP, HEADER_GAP, PAGE, usePrintLayout } from "./usePrintLayout";

/** The /print/[id] page. */
export function PrintView() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const version: PrintVersion = useSearchParams().get("version") === "key" ? "key" : "student";
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
  return <PrintDocument test={lookup.test} version={version} />;
}

function PrintDocument({ test, version }: { test: Test; version: PrintVersion }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const { measurer, pages, optionColumns, ready } = usePrintLayout(test, version, language);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const options = test.printOptions;

  // The browser tab title becomes the PDF's title (and the "Save as" name).
  const suffix = t(version === "key" ? "print.fileKey" : "print.fileStudent");
  const title = `${test.title || t("test.untitled")} — ${suffix}`;
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  const zoom = useFitToWidth();

  function setOptions(changes: Partial<PrintOptions>) {
    saveTest({ ...test, printOptions: { ...options, ...changes } });
  }

  async function handlePdf() {
    setPdfBusy(true);
    setNotice(null);
    try {
      await downloadPdf(test, version, language, pdfFileName(test.title || t("test.untitled"), suffix));
    } catch {
      // No Chrome on the server (or another problem): use the print dialog instead.
      setNotice(t("print.pdfFallback"));
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

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
    <div data-print-ready={ready ? "true" : "false"}>
      {/* ---- Controls (screen only) ---- */}
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

          <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Option label={t("print.version")}>
              <SegmentedControl<PrintVersion>
                label={t("print.version")}
                value={version}
                onChange={(v) => router.replace(`?version=${v}`, { scroll: false })}
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
          {notice && <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        </div>
      </div>

      {measurer}

      {/* ---- The A4 sheets ---- */}
      <div className="print-sheets" style={{ zoom }}>
        {!pages ? (
          <p className="py-16 text-center text-slate-500 print:hidden">{t("print.preparing")}</p>
        ) : (
          pages.map((page, pageIndex) => (
            <section key={pageIndex} className={`sheet sheet-font-${options.fontSize}`} aria-label={t("print.page", { page: pageIndex + 1, pages: pages.length })}>
              {pageIndex === 0 && (
                <div style={{ marginBottom: `${HEADER_GAP}mm` }}>
                  <PrintHeader test={test} version={version} />
                </div>
              )}
              {test.questions.length === 0 && <p className="text-center text-slate-500">{t("print.empty")}</p>}
              <div
                className="sheet-columns"
                style={{ gridTemplateColumns: `repeat(${options.columns}, minmax(0, 1fr))`, columnGap: `${COLUMN_GAP}mm` }}
              >
                {page.columns.map((keys, columnIndex) => (
                  <div key={columnIndex} className="flex flex-col" style={{ gap: `${BLOCK_GAP}mm` }}>
                    {keys.map(blockFor)}
                  </div>
                ))}
              </div>
              <footer className="sheet-footer" style={{ bottom: `${PAGE.padBottom / 2 - 2}mm` }}>
                <span>{test.title || t("test.untitled")}{version === "key" ? ` — ${t("print.key")}` : ""}</span>
                <span>{t("print.page", { page: pageIndex + 1, pages: pages.length })}</span>
              </footer>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Option({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{label}:</span>
      {children}
    </div>
  );
}

/**
 * A4 is ~794px wide. On narrow screens (phones) we shrink the sheets to fit,
 * using CSS `zoom` (screen only — print CSS resets it to 1).
 */
function useFitToWidth() {
  const [zoom, setZoom] = useState(1);
  const sheetPx = useRef((PAGE.width * 96) / 25.4);
  useEffect(() => {
    const update = () => setZoom(Math.min(1, (window.innerWidth - 24) / sheetPx.current));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return zoom;
}
