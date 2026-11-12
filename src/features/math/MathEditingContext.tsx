"use client";

/**
 * Remembers which rich-text box the teacher is working in, so the math
 * toolbar (which lives elsewhere on the page) knows where to insert.
 *
 * React "context" = a value that any component inside the provider can read,
 * without passing it down through every component in between.
 */
import type { Editor } from "@tiptap/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MathfieldElement } from "./mathlive";

type MathEditing = {
  /** The rich-text box used last (null until the teacher clicks into one). */
  activeEditor: Editor | null;
  /** Called by a rich-text box when anything inside it gets focus. */
  reportFocus: (editor: Editor, target: EventTarget) => void;
  /** Called when a rich-text box goes away. */
  forget: (editor: Editor) => void;
  /** Inserts a LaTeX template at the right place (see below). */
  insert: (latex: string) => void;
};

const MathEditingContext = createContext<MathEditing | null>(null);

export function MathEditingProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  // The formula box that had focus last, if the cursor was inside a formula.
  const lastMathfield = useRef<MathfieldElement | null>(null);

  const reportFocus = useCallback((editor: Editor, target: EventTarget) => {
    setActiveEditor(editor);
    lastMathfield.current =
      target instanceof HTMLElement && target.tagName === "MATH-FIELD" ? (target as MathfieldElement) : null;
  }, []);

  const forget = useCallback((editor: Editor) => {
    setActiveEditor((current) => (current === editor ? null : current));
  }, []);

  const insert = useCallback(
    (latex: string) => {
      const editor = activeEditor;
      if (!editor || editor.isDestroyed) return;
      const mf = lastMathfield.current;
      if (mf?.isConnected && editor.view.dom.contains(mf)) {
        // The cursor is inside a formula: add the template there.
        mf.focus();
        mf.insert(latex, { selectionMode: "placeholder", focus: true });
      } else {
        // The cursor is in normal text: create a new formula with the template.
        editor.chain().focus().insertMath(latex).run();
      }
    },
    [activeEditor],
  );

  const value = useMemo(() => ({ activeEditor, reportFocus, forget, insert }), [activeEditor, reportFocus, forget, insert]);
  return <MathEditingContext.Provider value={value}>{children}</MathEditingContext.Provider>;
}

export function useMathEditing(): MathEditing {
  const value = useContext(MathEditingContext);
  if (!value) throw new Error("useMathEditing must be used inside <MathEditingProvider>");
  return value;
}

/** True once MathLive has loaded in the browser. */
export function useMathLiveReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    import("./mathlive").then(({ loadMathLive }) => loadMathLive()).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
