"use client";

/**
 * Remembers which rich-text box the teacher is working in, so the math
 * toolbar (which lives elsewhere on the page) knows where to insert.
 *
 * React "context" = a value that any component inside the provider can read,
 * without passing it down through every component in between.
 */
import type { Editor } from "@tiptap/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { rememberEditing } from "@/features/editor/keepVisible";
import { TEXT_MARKS, type TextMark } from "@/lib/richText";
import { startChem, typeIntoChem } from "./MathNode";
import type { MathfieldElement } from "./mathlive";
import { closeHistory } from "@tiptap/pm/history";

type MathEditing = {
  /** The rich-text box used last (null until the teacher clicks into one). */
  activeEditor: Editor | null;
  /** True while the cursor is inside a formula or a chemistry formula (bold, italic… don't apply there). */
  inFormula: boolean;
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

  const [inFormula, setInFormula] = useState(false);

  const reportFocus = useCallback((editor: Editor, target: EventTarget) => {
    setActiveEditor(editor);
    lastMathfield.current =
      target instanceof HTMLElement && target.tagName === "MATH-FIELD" ? (target as MathfieldElement) : null;
    lastChem.current = target instanceof HTMLInputElement && target.dataset.chem !== undefined ? target : null;
    setInFormula(lastMathfield.current !== null || lastChem.current !== null);
    // The page keeps THIS box clear of the toolbar, also while the keyboard
    // focus is on the toolbar itself (its search box, its resize handle).
    rememberEditing(editor.view.dom.closest<HTMLElement>(".rich-text-input") ?? editor.view.dom);
  }, []);

  // Clicking or tabbing into anything that isn't a question/answer box (or the
  // toolbar itself) means "not writing math now": the toolbar hides.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      // [data-keep-editing]: windows opened from the toolbar (e.g. the periodic table).
      if (target?.closest?.(".rich-text-input, [data-math-toolbar], [data-keep-editing]")) return;
      setActiveEditor(null);
      setInFormula(false);
      rememberEditing(null);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  const forget = useCallback((editor: Editor) => {
    setActiveEditor((current) => (current === editor ? null : current));
    if (editor.view.dom.contains(lastMathfield.current) || editor.view.dom.contains(lastChem.current)) setInFormula(false);
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
      // Inside a formula there is no text to format: its letters follow the rules of maths.
      if (!editor || editor.isDestroyed || inFormula) return;
      editor.chain().focus().toggleMark(mark).run();
    },
    [activeEditor, inFormula],
  );

  const value = useMemo(
    () => ({ activeEditor, inFormula, reportFocus, forget, insert, insertText, insertChem, toggleFormat, runCommand }),
    [activeEditor, inFormula, reportFocus, forget, insert, insertText, insertChem, toggleFormat, runCommand],
  );
  return <MathEditingContext.Provider value={value}>{children}</MathEditingContext.Provider>;
}

export function useMathEditing(): MathEditing {
  const value = useContext(MathEditingContext);
  if (!value) throw new Error("useMathEditing must be used inside <MathEditingProvider>");
  return value;
}

const NO_FORMATS: ReadonlySet<TextMark> = new Set();
const noSubscription = () => () => {};

/**
 * Which formatting (bold, italic, underline, word box) is ON where the
 * teacher is typing — read from the editor itself, never from a separate
 * "was the button clicked" flag, so it is always true:
 *
 *  - only a cursor (nothing selected): the formatting the NEXT typed letter
 *    will get — the marks around the cursor, or the ones just switched on /
 *    off with a button or ⌘/Ctrl + B, I, U ("stored marks");
 *  - a selection: ON only when ALL the selected text has it. A selection
 *    that is partly bold shows the button OFF, and a click then makes all of
 *    it bold (the same rule as Word); a second click removes it.
 *
 * It follows every change of the editor (typing, arrow keys, clicks, undo /
 * redo, shortcuts) and of the box being edited; nothing is active when no
 * box is, or while the cursor is inside a formula.
 */
export function useActiveFormats(): ReadonlySet<TextMark> {
  const { activeEditor, inFormula } = useMathEditing();
  const editor = activeEditor && !activeEditor.isDestroyed && !inFormula ? activeEditor : null;
  const subscribe = useCallback(
    (changed: () => void) => {
      if (!editor) return () => {};
      // "transaction" = anything that happened in the box: typing, moving the
      // cursor, selecting, formatting, undo and redo.
      editor.on("transaction", changed);
      return () => {
        editor.off("transaction", changed);
      };
    },
    [editor],
  );
  // A short text like "bold,underline": React re-draws only when it changes.
  const snapshot = useSyncExternalStore(
    editor ? subscribe : noSubscription,
    () => (editor && !editor.isDestroyed ? TEXT_MARKS.filter((mark) => editor.isActive(mark)).join(",") : ""),
    () => "",
  );
  return useMemo(() => (snapshot ? new Set(snapshot.split(",") as TextMark[]) : NO_FORMATS), [snapshot]);
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
