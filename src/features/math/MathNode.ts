"use client";

/**
 * The "formula" piece inside a rich-text box.
 *
 * TipTap (built on ProseMirror) manages the text, the cursor and undo. We
 * teach it one new kind of item: an inline `math` node that holds LaTeX and
 * is displayed with a MathLive <math-field>.
 *
 * The tricky part is the border between the two worlds — ProseMirror's text
 * cursor and MathLive's formula cursor. The code below hands the cursor
 * back and forth:
 *   - arrow keys at the edge of a formula move out into the text,
 *   - arrow keys in the text next to a formula move into it,
 *   - Backspace next to a formula first highlights it, a second press deletes it,
 *   - leaving an empty formula removes it.
 *
 * Chemistry formulas are the same node with LaTeX "\ce{…}" (mhchem). They
 * are edited in a plain text box instead ("H2SO4" — subscripts appear by
 * themselves), with a live preview drawn by MathLive.
 */
import { Node, type Editor, type NodeViewRendererProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { NodeView } from "@tiptap/pm/view";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { convertLatexToMarkup } from "mathlive";
import { chemLatex, chemSource } from "@/lib/chem";
import { configureMathfield, type MathfieldElement } from "./mathlive";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      /** Inserts a formula at the cursor and puts the cursor inside it. */
      insertMath: (latex?: string) => ReturnType;
      /** Inserts an empty chemistry formula (use startChem to also focus and fill it). */
      insertChem: () => ReturnType;
    };
  }
}

/** The <math-field> shown for the formula that starts at `pos`, if any. */
export function mathfieldAt(editor: Editor, pos: number): MathfieldElement | null {
  const dom = editor.view.nodeDOM(pos);
  return dom instanceof HTMLElement ? (dom.querySelector("math-field") as MathfieldElement | null) : null;
}

/** The text box of the chemistry formula that starts at `pos`, if any. */
function chemInputAt(editor: Editor, pos: number): HTMLInputElement | null {
  const dom = editor.view.nodeDOM(pos);
  return dom instanceof HTMLElement ? dom.querySelector<HTMLInputElement>("input[data-chem]") : null;
}

/**
 * Focuses a chemistry text box. It's hidden (display: none) until its chip
 * is "editing", and a hidden box can't take the focus — so show it first.
 */
function openChem(input: HTMLInputElement) {
  input.closest(".chem-node")?.classList.add("is-editing");
  input.focus();
}

/**
 * Starts a new chemistry formula at the cursor and types `text` into it.
 * Focus happens right away (ProseMirror draws the new chip during the
 * update), so nothing typed straight after the click goes astray.
 */
export function startChem(editor: Editor, text: string, caretBack = 0) {
  const pos = editor.state.selection.from;
  // No .focus() here: TipTap focuses the text a frame later, which would pull
  // the cursor back out of the new formula. The formula's own box takes it.
  editor.chain().insertChem().run();
  const input = chemInputAt(editor, pos);
  if (input) typeIntoChem(input, text, caretBack);
}

/** Types `text` at the cursor of a chemistry text box (as if typed), then moves the cursor back `caretBack`. */
export function typeIntoChem(input: HTMLInputElement, text: string, caretBack = 0) {
  openChem(input);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(text, start, end, "end");
  const caret = (input.selectionEnd ?? input.value.length) - caretBack;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Puts the keyboard cursor inside the formula at `pos`. */
export function focusMathfield(
  editor: Editor,
  pos: number,
  where: "start" | "end" | { insert: string },
) {
  // Wait one frame so the formula box exists on screen before focusing it.
  requestAnimationFrame(() => {
    // A chemistry formula: its text box.
    const input = chemInputAt(editor, pos);
    if (input) {
      openChem(input);
      if (where === "start") input.setSelectionRange(0, 0);
      else if (where === "end") input.setSelectionRange(input.value.length, input.value.length);
      return;
    }
    const mf = mathfieldAt(editor, pos);
    if (!mf) return;
    mf.focus();
    if (where === "start") mf.executeCommand("moveToMathfieldStart");
    else if (where === "end") mf.executeCommand("moveToMathfieldEnd");
    else if (where.insert) mf.insert(where.insert, { selectionMode: "placeholder", focus: true });
  });
}

/** Moves the text cursor to `pos` and gives the keyboard back to the text. */
function focusText(editor: Editor, pos: number) {
  const { state, view } = editor;
  const safe = Math.max(0, Math.min(pos, state.doc.content.size));
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, safe)));
  view.focus();
}

/**
 * Where the text cursor really is right now.
 *
 * ProseMirror updates its own record of the cursor a moment AFTER the browser
 * moves it, so when keys are pressed quickly (e.g. holding an arrow key)
 * `editor.state.selection` can be one step behind. Asking the browser's
 * selection directly is always up to date.
 */
function cursorPos(editor: Editor): number | null {
  const { view, state } = editor;
  if (!state.selection.empty) return null;
  const sel = view.dom.ownerDocument.getSelection();
  if (sel?.isCollapsed && sel.focusNode && view.dom.contains(sel.focusNode)) {
    try {
      return view.posAtDOM(sel.focusNode, sel.focusOffset);
    } catch {
      // fall through to ProseMirror's own record
    }
  }
  return state.selection.from;
}

/** The node right before / after the text cursor. */
function nodeNextToCursor(editor: Editor, side: "before" | "after") {
  const pos = cursorPos(editor);
  if (pos === null) return null;
  const $pos = editor.state.doc.resolve(pos);
  const node = side === "before" ? $pos.nodeBefore : $pos.nodeAfter;
  if (node?.type.name !== "math") return null;
  return { node, pos: side === "before" ? pos - node.nodeSize : pos };
}

function deleteMathAt(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (node?.type.name !== "math") return;
  editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
  focusText(editor, pos);
}

export const MathNode = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  atom: true, // the cursor can't go "into" it the ProseMirror way — MathLive handles inside
  selectable: true,

  addAttributes() {
    return { latex: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "span[data-math]", getAttrs: (el) => ({ latex: el.getAttribute("data-latex") ?? "" }) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { "data-math": "", "data-latex": HTMLAttributes.latex }];
  },

  addCommands() {
    return {
      insertMath:
        (latex = "") =>
        ({ editor, tr, dispatch }) => {
          const pos = tr.selection.from;
          if (dispatch) {
            tr.replaceSelectionWith(this.type.create({ latex: "" }));
            focusMathfield(editor, pos, { insert: latex });
          }
          return true;
        },
      insertChem:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.replaceSelectionWith(this.type.create({ latex: chemLatex("") }));
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Alt + =  — the same shortcut Microsoft Word uses for "insert equation".
      "Alt-=": ({ editor }) => editor.commands.insertMath(),

      ArrowRight: ({ editor }) => {
        const { selection } = editor.state;
        if (selection instanceof NodeSelection && selection.node.type.name === "math") {
          focusMathfield(editor, selection.from, "start");
          return true;
        }
        const next = nodeNextToCursor(editor, "after");
        if (!next) return false;
        focusMathfield(editor, next.pos, "start");
        return true;
      },

      ArrowLeft: ({ editor }) => {
        const { selection } = editor.state;
        if (selection instanceof NodeSelection && selection.node.type.name === "math") {
          focusMathfield(editor, selection.from, "end");
          return true;
        }
        const prev = nodeNextToCursor(editor, "before");
        if (!prev) return false;
        focusMathfield(editor, prev.pos, "end");
        return true;
      },

      // First Backspace highlights the formula; the second deletes it (default behaviour).
      Backspace: ({ editor }) => {
        const prev = nodeNextToCursor(editor, "before");
        if (!prev) return false;
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, prev.pos)));
        return true;
      },

      Delete: ({ editor }) => {
        const next = nodeNextToCursor(editor, "after");
        if (!next) return false;
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, next.pos)));
        return true;
      },
    };
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => (chemSource(props.node.attrs.latex) !== null ? chemNodeView(props) : mathNodeView(props));
  },
});

function mathNodeView({ node, getPos, editor }: NodeViewRendererProps): NodeView {
  {
    {
      let current = node;
      // Where this formula is in the document right now (null once it's gone).
      const position = () => {
        if (editor.isDestroyed) return null;
        try {
          const pos = getPos();
          return typeof pos === "number" ? pos : null;
        } catch {
          return null;
        }
      };

      const dom = document.createElement("span");
      dom.className = "math-node";
      dom.contentEditable = "false";

      const mf = document.createElement("math-field") as MathfieldElement;
      configureMathfield(mf);
      mf.value = node.attrs.latex;
      dom.append(mf);

      // Typing inside the formula → save the new LaTeX into the document.
      mf.addEventListener("input", () => {
        const pos = position();
        if (pos === null || mf.value === current.attrs.latex) return;
        editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "latex", mf.value));
      });

      // Arrow key at the edge of the formula → continue in the text.
      mf.addEventListener("move-out", (event) => {
        const pos = position();
        if (pos === null) return;
        event.preventDefault();
        const forward = event.detail.direction === "forward" || event.detail.direction === "downward";
        focusText(editor, forward ? pos + current.nodeSize : pos);
      });

      mf.addEventListener("keydown", (event) => {
        const pos = position();
        if (pos === null) return;
        // Backspace / Delete in an empty formula removes it.
        if ((event.key === "Backspace" || event.key === "Delete") && mf.value === "") {
          event.preventDefault();
          event.stopPropagation();
          deleteMathAt(editor, pos);
        }
        // Escape or Enter: done with this formula, continue typing text after it.
        if (event.key === "Escape" || event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          focusText(editor, pos + current.nodeSize);
        }
      }, { capture: true });

      // Leaving an empty formula removes it, so no empty boxes are left behind.
      mf.addEventListener("focusout", () => {
        setTimeout(() => {
          const pos = position();
          if (pos !== null && mf.value.trim() === "" && document.activeElement !== mf) {
            const n = editor.state.doc.nodeAt(pos);
            if (n?.type.name === "math") {
              editor.view.dispatch(editor.state.tr.delete(pos, pos + n.nodeSize));
            }
          }
        });
      });

      return {
        dom,
        update(updated) {
          if (updated.type !== current.type) return false;
          current = updated;
          if (mf.value !== updated.attrs.latex) mf.value = updated.attrs.latex;
          return true;
        },
        // Keys and clicks inside the formula belong to MathLive, not ProseMirror.
        stopEvent: (event) => event.target === mf,
        ignoreMutation: () => true,
        selectNode: () => dom.classList.add("is-selected"),
        deselectNode: () => dom.classList.remove("is-selected"),
      };
    }
  }
}

/**
 * A chemistry formula: shows the drawn formula; click it to type the
 * chemistry in a small text box ("2H2 + O2 -> 2H2O") with a live preview.
 */
function chemNodeView({ node, getPos, editor }: NodeViewRendererProps): NodeView {
  let current = node;
  const position = () => {
    if (editor.isDestroyed) return null;
    try {
      const pos = getPos();
      return typeof pos === "number" ? pos : null;
    } catch {
      return null;
    }
  };

  const dom = document.createElement("span");
  dom.className = "math-node chem-node";
  dom.contentEditable = "false";

  const input = document.createElement("input");
  input.dataset.chem = "";
  input.className = "chem-input";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.setAttribute("aria-label", document.documentElement.lang === "en" ? "Chemical formula" : "ქიმიური ფორმულა");
  input.placeholder = "H2SO4";
  input.value = chemSource(node.attrs.latex) ?? "";

  const preview = document.createElement("span");
  preview.className = "chem-preview";
  const draw = () => {
    preview.innerHTML = input.value.trim() ? convertLatexToMarkup(chemLatex(input.value)) : "";
    input.size = Math.max(5, input.value.length + 1);
  };
  draw();
  dom.append(input, preview);

  // Clicking the drawn formula opens the text box.
  preview.addEventListener("mousedown", (event) => {
    event.preventDefault();
    openChem(input);
    input.setSelectionRange(input.value.length, input.value.length);
  });
  input.addEventListener("focus", () => dom.classList.add("is-editing"));

  input.addEventListener("input", () => {
    draw();
    const pos = position();
    const latex = chemLatex(input.value);
    if (pos === null || latex === current.attrs.latex) return;
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "latex", latex));
  });

  input.addEventListener("keydown", (event) => {
    const pos = position();
    if (pos === null) return;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length;
    if ((event.key === "Backspace" || event.key === "Delete") && input.value === "") {
      event.preventDefault();
      deleteMathAt(editor, pos);
    } else if (event.key === "Escape" || event.key === "Enter" || (event.key === "ArrowRight" && atEnd)) {
      event.preventDefault();
      focusText(editor, pos + current.nodeSize);
    } else if (event.key === "ArrowLeft" && atStart) {
      event.preventDefault();
      focusText(editor, pos);
    }
  });

  // Leaving: show the drawn formula again; an empty one is removed.
  input.addEventListener("focusout", () => {
    dom.classList.remove("is-editing");
    setTimeout(() => {
      const pos = position();
      if (pos !== null && input.value.trim() === "" && document.activeElement !== input) {
        const n = editor.state.doc.nodeAt(pos);
        if (n?.type.name === "math") editor.view.dispatch(editor.state.tr.delete(pos, pos + n.nodeSize));
      }
    });
  });

  return {
    dom,
    update(updated: ProseMirrorNode) {
      if (updated.type !== current.type || chemSource(updated.attrs.latex) === null) return false;
      current = updated;
      // Don't fight the teacher's typing: only refresh when not editing.
      if (document.activeElement !== input && chemLatex(input.value) !== updated.attrs.latex) {
        input.value = chemSource(updated.attrs.latex) ?? "";
        draw();
      }
      return true;
    },
    stopEvent: (event: Event) => dom.contains(event.target as globalThis.Node),
    ignoreMutation: () => true,
    selectNode: () => dom.classList.add("is-selected"),
    deselectNode: () => dom.classList.remove("is-selected"),
  };
}
