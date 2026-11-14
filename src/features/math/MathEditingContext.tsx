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
import type { TextMark } from "@/lib/richText";
import { startChem, typeIntoChem } from "./MathNode";
import type { MathfieldElement } from "./mathlive";
import { closeHistory } from "@tiptap/pm/history";

type MathEditing = {
  /** The rich-text box used last (null until the teacher clicks into one). */
  activeEditor: Editor | null;
  /** Called by a rich-text box when anything inside it gets focus. */
  reportFocus: (editor: Editor, target: EventTarget) => void;
  /** Called when a rich-text box goes away. */
  forget: (editor: Editor) => void;
  /** Inserts a LaTeX template at the right place (see below). */
  insert: (latex: string) => void;
  /**
   * Chemistry ("->", "(aq)", "Fe"…): typed into the chemistry formula the
   * cursor is in, or a new chemistry formula is started with it.
   */
  insertChem: (text: string, caretBack?: number) => void;
  /** Turns bold / italic / underline / word box on or off for the selected text. */
  toggleFormat: (mark: TextMark) => void;
  /** Runs a MathLive command in the formula being edited (e.g. "addRowAfter" in a matrix); false if no formula is. */
  runCommand: (command: string) => boolean;
  /** Inserts plain text at the cursor (e.g. "ძვ. წ." from the history toolbar). */
  /** `marks` (e.g. ["italic"]): the inserted text gets them; the cursor continues in plain text. */
  insertText: (text: string, caretBack?: number, marks?: TextMark[]) => void;
};

const MathEditingContext = createContext<MathEditing | null>(null);

/**
 * Starts a new undo step. Without it, a symbol inserted from the toolbar
 * right after typing is glued to that typing, and one Undo removes both.
 */
function newUndoStep(editor: Editor) {
  editor.view.dispatch(closeHistory(editor.state.tr));
}

export function MathEditingProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  // The formula box that had focus last, if the cursor was inside a formula.
  const lastMathfield = useRef<MathfieldElement | null>(null);
  // The chemistry text box that had focus last (if the cursor was in one).
  const lastChem = useRef<HTMLInputElement | null>(null);

  const reportFocus = useCallback((editor: Editor, target: EventTarget) => {
    setActiveEditor(editor);
    lastMathfield.current =
      target instanceof HTMLElement && target.tagName === "MATH-FIELD" ? (target as MathfieldElement) : null;
    lastChem.current = target instanceof HTMLInputElement && target.dataset.chem !== undefined ? target : null;
  }, []);

  // Clicking or tabbing into anything that isn't a question/answer box (or the
  // toolbar itself) means "not writing math now": the toolbar hides.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      // [data-keep-editing]: windows opened from the toolbar (e.g. the periodic table).
      if (target?.closest?.(".rich-text-input, [data-math-toolbar], [data-keep-editing]")) return;
      setActiveEditor(null);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
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
        newUndoStep(editor);
        editor.chain().focus().insertMath(latex).run();
      }
    },
    [activeEditor],
  );

  const insertText = useCallback(
    (text: string, caretBack = 0, marks?: TextMark[]) => {
      const editor = activeEditor;
      if (!editor || editor.isDestroyed) return;
      // "1121" + "წ." → "1121 წ.": a space goes between a word (or the end of
      // one: . , ; : ) “ ») and a new word or an opening quote / bracket.
      const { from } = editor.state.selection;
      const before = from > 1 ? editor.state.doc.textBetween(from - 1, from, "", " ") : "";
      const needsSpace = /[\p{L}\p{N}.,;:)“”»]/u.test(before) && /^[\p{L}\p{N}„«(]/u.test(text);
      newUndoStep(editor);
      if (marks?.length) {
        // e.g. an italic Latin name, then a plain space so typing goes on in normal text.
        editor
          .chain()
          .focus()
          .insertContent([
            ...(needsSpace ? [{ type: "text", text: " " }] : []),
            { type: "text", text, marks: marks.map((type) => ({ type })) },
            { type: "text", text: " " },
          ])
          .run();
        return;
      }
      // As a text node (not HTML), so characters like "<" stay as they are.
      editor.chain().focus().insertContent({ type: "text", text: needsSpace ? ` ${text}` : text }).run();
      // e.g. „“: put the cursor between the quotes.
      if (caretBack > 0) editor.commands.setTextSelection(editor.state.selection.from - caretBack);
    },
    [activeEditor],
  );

  const insertChem = useCallback(
    (text: string, caretBack = 0) => {
      const editor = activeEditor;
      if (!editor || editor.isDestroyed) return;
      const input = lastChem.current;
      if (input?.isConnected && editor.view.dom.contains(input)) typeIntoChem(input, text, caretBack);
      else startChem(editor, text, caretBack);
    },
    [activeEditor],
  );

  /** Runs a MathLive command in the formula that was being edited (matrix: add a row…). False if there is none. */
  const runCommand = useCallback(
    (command: string): boolean => {
      const editor = activeEditor;
      const mf = lastMathfield.current;
      if (!editor || editor.isDestroyed || !mf?.isConnected || !editor.view.dom.contains(mf)) return false;
      mf.focus();
      // MathLive lists its commands as a fixed set of names; ours come from the toolbar data.
      return mf.executeCommand(command as unknown as "addRowAfter");
    },
    [activeEditor],
  );

  const toggleFormat = useCallback(
    (mark: TextMark) => {
      const editor = activeEditor;
      if (!editor || editor.isDestroyed) return;
      editor.chain().focus().toggleMark(mark).run();
    },
    [activeEditor],
  );

  const value = useMemo(
    () => ({ activeEditor, reportFocus, forget, insert, insertText, insertChem, toggleFormat, runCommand }),
    [activeEditor, reportFocus, forget, insert, insertText, insertChem, toggleFormat, runCommand],
  );
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
