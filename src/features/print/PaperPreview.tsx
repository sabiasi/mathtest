"use client";

/**
 * A test drawn as real A4 pages, made smaller to fit its container — the
 * same drawing code as the print page. Used to look at a template or a
 * bank question before using it. Read-only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlan } from "@/features/plans/PlanProvider";
import { LanguageOverride } from "@/i18n/language";
import type { Test } from "@/lib/storage/types";
import { buildVariants } from "@/lib/variants";
import { cn } from "@/lib/utils";
import { getToolkit } from "@/subjects/registry";
import type { PrintVersion } from "./PrintBlocks";
import { PrintedVariant } from "./PrintView";
import { TypographyProvider } from "./Typography";
import { mmToPx, PAGE } from "./usePrintLayout";

export function PaperPreview({ test, version = "student", hideHeader = false, className }: { test: Test; version?: PrintVersion; hideHeader?: boolean; className?: string }) {
  const plan = usePlan();
  const toolkit = getToolkit(test.subjectId);
  const variant = useMemo(() => buildVariants(test, 1)[0], [test]);
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  const [ready, setReady] = useState(false);
  const onReady = useCallback((_key: string, value: boolean) => setReady(value), []);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const fit = () => setZoom(Math.min(1, Math.max(0.2, element.clientWidth / mmToPx(PAGE.width))));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} className={cn("paper-preview live-preview", hideHeader && "no-header", toolkit.print.className, className)} data-paper-preview={ready ? "ready" : "loading"}>
      <LanguageOverride language={toolkit.print.language ?? null}>
        <TypographyProvider georgian={toolkit.print.typography === "georgian"}>
          <PrintedVariant key={version} variant={variant} label={null} version={version} blankAfter={false} brandFooter={plan.ready && !plan.entitlements.features.noPdfFooter} onReady={onReady} zoom={zoom} />
        </TypographyProvider>
      </LanguageOverride>
    </div>
  );
}
