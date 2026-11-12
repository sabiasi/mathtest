"use client";

import { useEffect, useRef } from "react";
import { saveTest } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/**
 * Saves the test automatically.
 *
 * "Debouncing": instead of saving on every key press, we wait until the
 * teacher pauses typing for `delay` milliseconds, then save once. Every new
 * change restarts the timer.
 *
 * We also save immediately when the page is closed or the teacher leaves
 * the editor, so the last few keystrokes are never lost.
 */
export function useAutosave(test: Test, dirty: boolean, markSaved: () => void, delay = 600) {
  // Refs hold the latest values for the "save on leave" code below.
  const latest = useRef(test);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    latest.current = test;
    dirtyRef.current = dirty;
  });

  // Save after a pause in typing.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      saveTest(test);
      dirtyRef.current = false;
      markSaved();
    }, delay);
    return () => clearTimeout(timer); // a newer change arrived: restart the wait
  }, [test, dirty, delay, markSaved]);

  // Save right away when the tab closes or the editor goes away.
  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current) {
        saveTest(latest.current);
        dirtyRef.current = false;
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
}
