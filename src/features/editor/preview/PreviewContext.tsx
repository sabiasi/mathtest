"use client";

/**
 * The live paper view ("ქაღალდზე ნახვა"): is it open, student or key, which
 * question is being edited (it is outlined on the paper), and the editor's
 * current test for it.
 *
 * Two contexts on purpose: the bar, the cards and the layout read only
 * `usePreviewControl()` (it changes when the view opens, closes or another
 * question is edited); the test changes on every key, and only the paper
 * view itself reads it (`usePreviewTest()`).
 */
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { PrintVersion } from "@/features/print/PrintBlocks";
import type { Test } from "@/lib/storage/types";

/** From this width the paper sits NEXT to the editor (split screen); below it, it covers the editor. */
export const SPLIT_QUERY = "(min-width: 64rem)";

type Control = {
  open: boolean;
  version: PrintVersion;
  /** True = wide window: the paper is beside the editor. */
  split: boolean;
  /** The question being edited ("header" = the test's title fields), or null. */
  activeId: string | null;
  toggle: () => void;
  close: () => void;
  setVersion: (version: PrintVersion) => void;
  setActiveId: (id: string | null) => void;
};

const ControlContext = createContext<Control | null>(null);
const TestContext = createContext<Test | null>(null);

function subscribe(onChange: () => void) {
  const query = window.matchMedia(SPLIT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function PreviewProvider({ test, children }: { test: Test; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState<PrintVersion>("student");
  const [activeId, setActiveId] = useState<string | null>(null);
  // The server (and the first paint) assume a narrow window.
  const split = useSyncExternalStore(subscribe, () => window.matchMedia(SPLIT_QUERY).matches, () => false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const control = useMemo<Control>(
    () => ({ open, version, split, activeId, toggle, close, setVersion, setActiveId }),
    [open, version, split, activeId, toggle, close],
  );
  return (
    <ControlContext.Provider value={control}>
      <TestContext.Provider value={test}>{children}</TestContext.Provider>
    </ControlContext.Provider>
  );
}

export function usePreviewControl(): Control {
  const value = useContext(ControlContext);
  if (!value) throw new Error("usePreviewControl must be used inside <PreviewProvider>");
  return value;
}

/** The editor's current test (with unsaved changes). Only the paper view reads it. */
export function usePreviewTest(): Test {
  const value = useContext(TestContext);
  if (!value) throw new Error("usePreviewTest must be used inside <PreviewProvider>");
  return value;
}
