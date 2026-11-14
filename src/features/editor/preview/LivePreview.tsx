"use client";

/**
 * "ქაღალდზე ნახვა": the WHOLE test as printed A4 pages, next to the editor
 * (or over it on small screens), following every change.
 *
 * The pages are drawn by the print page's own `PrintedVariant` (same
 * measuring, page packing, subject print CSS, Georgian typography, paper
 * language and plan footer), so they can't drift from the print page or the
 * PDF. Variant A is shown. No PDF is made.
 *
 * Typing stays fast: the pages follow the test a moment after the last key
 * (DELAY_MS) and at low priority (useDeferredValue); the old pages stay on
 * screen while the new ones are measured.
 *
 * The question being edited is outlined on the paper and scrolled into view
 * inside this panel only (the editor never moves).
 */
import { Printer, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/form";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { usePlan } from "@/features/plans/PlanProvider";
import type { PrintVersion } from "@/features/print/PrintBlocks";
import { PrintedVariant } from "@/features/print/PrintView";
import { TypographyProvider } from "@/features/print/Typography";
import { mmToPx, PAGE } from "@/features/print/usePrintLayout";
import { LanguageOverride, useT } from "@/i18n/language";
import type { Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { buildVariants } from "@/lib/variants";
import { getToolkit } from "@/subjects/registry";
import { usePreviewControl, usePreviewTest } from "./PreviewContext";

/** How long after the last change the pages are redrawn. */
const DELAY_MS = 250;
/** Room around the sheets inside the panel. */
const SIDE_PX = 16;

/** `value`, but only after it has stopped changing for `delay` ms. */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function LivePreview() {
  const t = useT();
  const live = usePreviewTest();
  const { version, setVersion, close, split, activeId } = usePreviewControl();
  const test = useDeferredValue(useSettled(live, DELAY_MS));
  const plan = usePlan();
  const brandFooter = plan.ready && !plan.entitlements.features.noPdfFooter;
  const variant = useMemo(() => buildVariants(test, 1)[0], [test]);
  const label = test.variants.count > 1 ? variant.label : null;

  // The sheets are drawn smaller to fit the panel (never bigger than real size).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const fit = () => setZoom(Math.min(1, (box.clientWidth - 2 * SIDE_PX) / mmToPx(PAGE.width)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const [ready, setReady] = useState(false);
  const onReady = useCallback((_key: string, value: boolean) => setReady(value), []);

  // Show the question being edited: scroll THIS panel (never the page) until it is in view.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || !activeId || !ready) return;
    const target = activeId === "header" ? box.querySelector(".sheet") : box.querySelector("[data-editing]");
    if (!target) return;
    const area = box.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const margin = 24;
    if (rect.top >= area.top + margin && rect.bottom <= area.bottom - margin) return; // already visible
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tall = rect.height > area.height - 2 * margin;
    box.scrollBy({ top: tall || rect.top < area.top ? rect.top - area.top - margin : rect.bottom - area.bottom + margin, behavior: reduce ? "auto" : "smooth" });
  }, [activeId, ready, test]);

  return (
    <section
      aria-label={t("preview.title")}
      className={cn("flex h-full min-h-0 flex-col bg-muted/50", split ? "border-l" : "")}
      data-live-preview={split ? "side" : "full"}
      data-live-ready={ready ? "true" : "false"}
      data-live-version={version}
    >
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-2.5">
        <h2 className="mr-auto font-semibold text-foreground">{t("preview.title")}</h2>
        <SegmentedControl<PrintVersion>
          label={t("print.version")}
          value={version}
          onChange={setVersion}
          options={[
            { value: "student", label: t("preview.student") },
            { value: "key", label: t("print.key") },
          ]}
        />
        <Link href={`/print/${test.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Printer className="size-4" aria-hidden="true" />
          <span className="max-sm:sr-only">{t("preview.fullPrint")}</span>
        </Link>
        <IconButton label={t("preview.hide")} onClick={close}>
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
      {label && <p className="border-b bg-card px-4 py-1.5 text-sm text-muted-foreground">{t("preview.variantNote", { label })}</p>}
      <div ref={scrollRef} className="live-preview min-h-0 flex-1 overflow-y-auto overscroll-contain py-4" style={{ paddingInline: SIDE_PX }}>
        <Pages test={test} variant={variant} label={label} version={version} brandFooter={brandFooter} zoom={zoom} highlight={activeId} onReady={onReady} />
      </div>
    </section>
  );
}

function Pages({
  test,
  variant,
  label,
  version,
  brandFooter,
  zoom,
  highlight,
  onReady,
}: {
  test: Test;
  variant: ReturnType<typeof buildVariants>[number];
  label: string | null;
  version: PrintVersion;
  brandFooter: boolean;
  zoom: number;
  highlight: string | null;
  onReady: (key: string, ready: boolean) => void;
}) {
  const toolkit = getToolkit(test.subjectId);
  return (
    <div className={toolkit.print.className}>
      {/* The paper's language and typography, exactly like the print page. */}
      <LanguageOverride language={toolkit.print.language ?? null}>
        <TypographyProvider georgian={toolkit.print.typography === "georgian"}>
          <PrintedVariant
            key={version}
            variant={variant}
            label={label}
            version={version}
            blankAfter={false}
            brandFooter={brandFooter}
            onReady={onReady}
            zoom={zoom}
            highlight={highlight === "header" ? null : highlight}
          />
        </TypographyProvider>
      </LanguageOverride>
    </div>
  );
}
