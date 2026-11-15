"use client";

import { useEffect, useRef } from "react";
import { hasUnsavedChanges, registerDraft, saveTest, SubjectAccessError } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/**
 * Saves the test automatically.
 *
 * "Debouncing": instead of saving on every key press, we wait until the
 * teacher pauses typing for `delay` milliseconds, then save once. Every new
 * change restarts the timer.
 *
 * The words typed during that wait are handed to the repository at once when:
 * - the teacher leaves the editor (another page of the app),
 * - the tab is hidden or closed (phones often never say "closed"),
 * - the browser is about to leave or reload the page,
 * - the teacher signs out (the repository asks, see registerDraft).
 *
 * For a guest that hand-over IS the save (browser storage is written at
 * once). For an account it only STARTS the upload, which a closing page may
 * cut off — so in that case the browser's own "leave this page?" question is
 * shown while anything is still unsaved.
 */
export function useAutosave(test: Test, dirty: boolean, markSaved: () => void, delay = 600) {
  // Refs hold the latest values for the "save right now" code below.
  const latest = useRef(test);
  const dirtyRef = useRef(dirty);
  const markSavedRef = useRef(markSaved);
  useEffect(() => {
    latest.current = test;
    dirtyRef.current = dirty;
    markSavedRef.current = markSaved;
  });

  // Save after a pause in typing.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try { saveTest(test); } catch (error) { if (error instanceof SubjectAccessError) return; throw error; }
      dirtyRef.current = false;
      markSaved();
    }, delay);
    return () => clearTimeout(timer); // a newer change arrived: restart the wait
  }, [test, dirty, delay, markSaved]);

  // Save right away when the page is left, hidden or closed, or on sign-out.
  useEffect(() => {
    /** Returns true when there was something to hand over. */
    const flush = () => {
      if (!dirtyRef.current) return false;
      try { saveTest(latest.current); } catch (error) { if (error instanceof SubjectAccessError) return false; throw error; }
      dirtyRef.current = false;
      return true;
    };
    // The editor stays open after these: stop the waiting timer too.
    const flushAndStay = () => {
      if (flush()) markSavedRef.current();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushAndStay();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      flushAndStay();
      // AuthProvider asks the same question; whichever listener runs first, the answer is right.
      if (hasUnsavedChanges()) event.preventDefault();
    };
    const forget = registerDraft(flushAndStay);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      forget();
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, []);
}
