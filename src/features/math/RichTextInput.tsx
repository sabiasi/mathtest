"use client";

/**
 * A text box where teachers can mix normal text with formulas.
 * Used for question text, multiple-choice options and short answers.
 */
import { Extension } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { docToRichText, richTextToDoc, type RichText } from "@/lib/richText";
import { useMathEditing } from "./MathEditingContext";
import { BoxMark } from "./BoxMark";
import { MathNode } from "./MathNode";

/** For one-line boxes (answer options): exactly one paragraph, Enter does nothing. */
const SingleLineDocument = Document.extend({ content: "paragraph" });
const NoEnter = Extension.create({
  name: "noEnter",
  addKeyboardShortcuts: () => ({ Enter: () => true, "Shift-Enter": () => true }),
});

export function RichTextInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  singleLine = false,
  autoFocus = false,
  className = "",
}: {
  /** The starting value. Later changes come from typing, reported via onChange. */
  value: RichText;
  onChange: (value: RichText) => void;
  placeholder: string;
  ariaLabel: string;
  singleLine?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const { reportFocus, forget } = useMathEditing();

  // The editor is created once; a ref lets it always call the newest onChange.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    immediatelyRender: false, // create it in the browser only (Next.js renders on the server first)
    extensions: [
      singleLine ? SingleLineDocument : Document,
      Paragraph,
      Text,
      UndoRedo,
      Placeholder.configure({ placeholder }),
      MathNode,
      // Formatting (⌘/Ctrl + B, I, U; the "word box" from the toolbar).
      Bold,
      Italic,
      Underline,
      BoxMark,
      ...(singleLine ? [NoEnter] : []),
    ],
    content: richTextToDoc(value),
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        role: "textbox",
        "aria-multiline": String(!singleLine),
        class: "rich-text-editor",
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(docToRichText(editor.getJSON())),
  });

  useEffect(() => {
    if (!editor) return;
    return () => forget(editor);
  }, [editor, forget]);

  return (
    <div
      className={`rich-text-input ${singleLine ? "is-single-line" : ""} ${className}`}
      // onFocus here also fires when a formula inside gets focus ("focus bubbling").
      onFocus={(event) => editor && reportFocus(editor, event.target)}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
