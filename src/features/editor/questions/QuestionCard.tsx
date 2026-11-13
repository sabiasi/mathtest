"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ClipboardEvent, type DragEvent } from "react";
import { inputClasses } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { RichTextInput } from "@/features/math/RichTextInput";
import type { MessageKey } from "@/i18n/dictionaries";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { addImage } from "@/lib/images/imageStore";
import { useImageError } from "@/features/plans/useImageError";
import { changeQuestionType, isTextBlock } from "@/lib/questions";
import type { Diagram, DiagramKind, LabelStyle, Question, QuestionImage, QuestionType } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { MapEditor } from "@/subjects/history/editors/MapEditor";
import { LabelDiagramEditor } from "@/subjects/biology/LabelDiagramEditor";
import { PedigreeEditor } from "@/subjects/biology/PedigreeEditor";
import { PunnettEditor } from "@/subjects/biology/PunnettEditor";
import { OrderEditor } from "@/subjects/history/editors/OrderEditor";
import { SourceEditor } from "@/subjects/history/editors/SourceEditor";
import { TimelineEditor } from "@/subjects/history/editors/TimelineEditor";
import { GivenFindEditor } from "@/subjects/physics/GivenFindEditor";
import { BalanceEditor } from "@/subjects/chemistry/BalanceEditor";
import { EssayEditor } from "@/subjects/georgian/editors/EssayEditor";
import { FindMistakeEditor } from "@/subjects/georgian/editors/FindMistakeEditor";
import { GrammarTableEditor } from "@/subjects/georgian/editors/GrammarTableEditor";
import { MarkWordsEditor } from "@/subjects/georgian/editors/MarkWordsEditor";
import { SentenceAnalysisEditor } from "@/subjects/georgian/editors/SentenceAnalysisEditor";
import { TextBlockEditor } from "@/subjects/georgian/editors/TextBlockEditor";
import { FillBlankEditor } from "./FillBlankEditor";
import { Input } from "@/components/ui/input";
import {
  CrosswordEditor,
  ListeningEditor,
  OddOneOutEditor,
  PictureMatchEditor,
  SectionEditor,
  SpeakingEditor,
  TransformationEditor,
  WordFormationEditor,
  WordSearchEditor,
} from "@/subjects/english/EnglishEditors";
import { InstructionMenu } from "./InstructionMenu";
import { MatchingEditor } from "./MatchingEditor";
import { DiagramDialog } from "@/subjects/physics/diagrams/DiagramDialog";
import { diagramSize } from "@/subjects/physics/diagrams/DiagramView";
import { newStructure } from "@/subjects/chemistry/structure/normalize";
import { newCircuit, newForceDiagram } from "@/subjects/physics/diagrams/normalize";
import type { SubjectToolkit } from "@/subjects/types";
import { MultipleChoiceEditor } from "./MultipleChoiceEditor";
import { OpenAnswerEditor } from "./OpenAnswerEditor";
import { PointsInput } from "./PointsInput";
import { ImageStrip, MediaBar } from "./QuestionMedia";
import { ShortAnswerEditor } from "./ShortAnswerEditor";
import { TrueFalseEditor } from "./TrueFalseEditor";

/** What the question box suggests writing, for types that need a different hint. */
const TEXT_PLACEHOLDERS: Partial<Record<QuestionType, MessageKey>> = {
  "true-false": "questions.statementPlaceholder",
  "given-find": "questions.problemPlaceholder",
  matching: "questions.matchingPlaceholder",
  order: "questions.orderPlaceholder",
  timeline: "questions.timelinePlaceholder",
  source: "questions.sourcePlaceholder",
  map: "questions.mapPlaceholder",
  "label-diagram": "questions.labelPlaceholder",
  punnett: "questions.punnettPlaceholder",
  pedigree: "questions.pedigreePlaceholder",
  passage: "questions.textBlockPlaceholder",
  poem: "questions.textBlockPlaceholder",
  "fill-blank": "questions.fillPlaceholder",
  "mark-words": "questions.markPlaceholder",
  "grammar-table": "questions.grammarPlaceholder",
  "find-mistake": "questions.mistakePlaceholder",
  "sentence-analysis": "questions.analysisPlaceholder",
  essay: "questions.essayPlaceholder",
  section: "questions.sectionPlaceholder",
  listening: "questions.listeningPlaceholder",
  speaking: "questions.speakingPlaceholder",
  transformation: "questions.englishPlaceholder",
  "word-formation": "questions.englishPlaceholder",
  "picture-match": "questions.englishPlaceholder",
  "odd-one-out": "questions.englishPlaceholder",
  crossword: "questions.englishPlaceholder",
  "word-search": "questions.englishPlaceholder",
  balance: "questions.balancePlaceholder",
};

export function QuestionCard({
  question,
  number,
  labelStyle,
  toolkit,
  sectionTotal,
  autoFocus,
  onChange,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  question: Question;
  /** null for reading texts and poems (they have no number). */
  number: number | null;
  labelStyle: LabelStyle;
  /** The subject's tools: question types and diagrams. */
  toolkit: SubjectToolkit;
  /** Sections: the sum of the points of the questions in it. */
  sectionTotal?: number;
  autoFocus: boolean;
  onChange: (question: Question) => void;
  onPatch: (patch: (question: Question) => Question) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const imageError = useImageError();
  // The paper's language (English tests are printed in English; everything else in Georgian).
  const paperLanguage = toolkit.print.language ?? "ka";
  // useSortable connects this card to drag-and-drop (see QuestionList).
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id, transition: { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" } });

  // ---- Pictures: upload, paste, drop ----
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const questionTypes = toolkit.questionTypes;
  const textBlock = isTextBlock(question);
  const [textVersion, setTextVersion] = useState(0);

  // ---- Diagrams (circuit, forces): drawn in a window, kept as data ----
  const [diagramEdit, setDiagramEdit] = useState<{ placementId: string | null; diagram: Diagram } | null>(null);

  function startDiagram(kind: DiagramKind) {
    const diagram =
      kind === "circuit"
        ? newCircuit()
        : kind === "structure"
          ? newStructure()
          : newForceDiagram({ gravity: t("forces.preset.gravityLabel"), normal: t("forces.preset.normalLabel") }, newId);
    setDiagramEdit({ placementId: null, diagram });
  }

  function saveDiagram(diagram: Diagram) {
    const editing = diagramEdit;
    setDiagramEdit(null);
    if (!editing) return;
    const size = diagramSize(diagram);
    if (editing.placementId) {
      onPatch((q) => ({ ...q, images: q.images.map((i) => (i.id === editing.placementId ? { ...i, ...size, diagram } : i)) }));
    } else {
      const placement: QuestionImage = {
        id: newId(),
        imageId: "",
        ...size,
        diagram,
        widthPercent: diagram.kind === "circuit" ? 45 : 35,
        position: "right",
        caption: "",
      };
      onPatch((q) => ({ ...q, images: [...q.images, placement] }));
    }
  }

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setMediaBusy(true);
    setMediaError(null);
    for (const file of files) {
      try {
        const { imageId, width, height } = await addImage(file);
        const placement: QuestionImage = {
          id: newId(),
          imageId,
          width,
          height,
          widthPercent: width > height ? 50 : 35, // a sensible start; easy to resize
          position: "above",
          caption: "",
        };
        onPatch((q) => ({ ...q, images: [...q.images, placement] }));
      } catch (error) {
        setMediaError(imageError(error));
      }
    }
    setMediaBusy(false);
  }

  function handlePaste(event: ClipboardEvent) {
    const files = [...event.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    // Copying text from Word ALSO puts a picture of that text on the clipboard.
    // So only treat it as a picture when there's no text — otherwise paste text.
    const hasText = event.clipboardData.getData("text/plain").trim() !== "";
    if (files.length === 0 || hasText) return;
    event.preventDefault();
    event.stopPropagation(); // don't let the text box paste it too
    void addFiles(files);
  }

  function handleDrop(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDropActive(false);
    void addFiles([...event.dataTransfer.files]);
  }

  return (
    // The outer <li> is what dnd-kit moves (transform) and what Motion grows /
    // shrinks when a question is added or deleted (height + opacity).
    <motion.li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      initial={{ height: 0, opacity: 0, overflow: "hidden" }}
      animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
      exit={{ height: 0, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className="relative"
    >
      {/* pb-4 = the gap to the next card (inside the li, so it shrinks with it) */}
      <div className="pb-4">
        <div
          onPasteCapture={handlePaste}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault(); // allows dropping here
            setDropActive(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
          }}
          onDrop={handleDrop}
          data-question-card=""
          className={cn(
            "relative rounded-2xl border bg-card shadow-sm transition-[box-shadow,border-color,scale] duration-200 ease-out-soft",
            isDragging && "scale-[1.015] border-ring/60 shadow-xl ring-2 ring-ring/30",
            dropActive && "ring-2 ring-ring",
          )}
        >
          {dropActive && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-primary-soft/90 text-brand">
              <ImagePlus className="mr-2 size-6" aria-hidden="true" />
              <span className="font-semibold">{t("media.dropHere")}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
            <IconButton
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              label={t("questions.drag")}
              className="cursor-grab touch-none p-1.5 active:cursor-grabbing pointer-coarse:p-2.5"
            >
              <GripVertical className="size-5" aria-hidden="true" />
            </IconButton>
            {/* Reading texts and poems aren't numbered questions. */}
            <span className="font-semibold text-foreground">
              {number === null ? t(`type.${question.type}`) : t("questions.number", { number })}
            </span>
            <select
              value={question.type}
              aria-label={t("questions.type")}
              onChange={(e) => onChange(changeQuestionType(question, e.target.value as QuestionType))}
              className={cn(inputClasses, "h-9 w-auto py-0 pr-8 pl-2.5 text-sm font-medium text-soft-foreground")}
            >
              {/* The subject's types — plus this question's own, if the subject doesn't offer it. */}
              {(questionTypes.includes(question.type) ? questionTypes : [...questionTypes, question.type]).map((type) => (
                <option key={type} value={type}>
                  {t(`type.${type}`)}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-1">
              {!textBlock && (
                <>
                  <PointsInput
                    value={question.points}
                    label={t("questions.points")}
                    onChange={(points) => onChange({ ...question, points })}
                  />
                  <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
                </>
              )}
              <IconButton onClick={onDuplicate} label={t("questions.duplicate")}>
                <Copy className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton onClick={onDelete} label={t("questions.delete")} tone="danger">
                <Trash2 className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {toolkit.instructionTemplates && (
              <InstructionMenu
                templates={toolkit.instructionTemplates}
                paperLanguage={paperLanguage}
                onPick={(template) => {
                  // The paper's language goes into the question; bilingual tests also keep the Georgian one.
                  const text = paperLanguage === "en" ? template.en : template.ka;
                  onChange({ ...question, text: [{ type: "text", text }], ...(toolkit.bilingual ? { instructionKa: template.ka } : {}) });
                  setTextVersion((v) => v + 1); // the text box shows the new text
                }}
              />
            )}
            <RichTextInput
              // A template replaces the text: a new key gives a fresh box with it.
              key={textVersion}
              value={question.text}
              autoFocus={autoFocus}
              ariaLabel={t("questions.text")}
              placeholder={t(TEXT_PLACEHOLDERS[question.type] ?? "questions.textPlaceholder")}
              onChange={(text) => onChange({ ...question, text })}
            />
            {toolkit.bilingual && (
              <Input
                lang="ka"
                className="h-9 text-sm"
                value={question.instructionKa ?? ""}
                maxLength={500}
                placeholder={t("questions.instructionKa")}
                aria-label={t("questions.instructionKa")}
                onChange={(e) => onChange({ ...question, instructionKa: e.target.value })}
                data-instruction-ka=""
              />
            )}

            <ImageStrip
              images={question.images}
              onChange={(images) => onChange({ ...question, images })}
              onEditDiagram={(image) => image.diagram && setDiagramEdit({ placementId: image.id, diagram: image.diagram })}
            />

            {question.type === "multiple-choice" && (
              <MultipleChoiceEditor question={question} labelStyle={labelStyle} onChange={onChange} />
            )}
            {question.type === "true-false" && <TrueFalseEditor question={question} onChange={onChange} />}
            {question.type === "short-answer" && <ShortAnswerEditor question={question} onChange={onChange} />}
            {question.type === "open-answer" && <OpenAnswerEditor question={question} onChange={onChange} />}
            {question.type === "given-find" && <GivenFindEditor question={question} onChange={onChange} />}
            {question.type === "matching" && <MatchingEditor question={question} templates={toolkit.matchingTemplates} onChange={onChange} />}
            {question.type === "order" && <OrderEditor question={question} onChange={onChange} />}
            {question.type === "timeline" && <TimelineEditor question={question} onChange={onChange} />}
            {question.type === "source" && <SourceEditor question={question} labelStyle={labelStyle} onChange={onChange} />}
            {question.type === "section" && <SectionEditor question={question} points={sectionTotal ?? 0} onChange={onChange} />}
            {question.type === "listening" && <ListeningEditor question={question} onChange={onChange} />}
            {question.type === "speaking" && <SpeakingEditor question={question} onChange={onChange} />}
            {question.type === "transformation" && <TransformationEditor question={question} onChange={onChange} />}
            {question.type === "word-formation" && <WordFormationEditor question={question} onChange={onChange} />}
            {question.type === "picture-match" && (
              <PictureMatchEditor question={question} onChange={onChange} onPatch={(patch) => onPatch((q) => (q.type === "picture-match" ? patch(q) : q))} />
            )}
            {question.type === "odd-one-out" && <OddOneOutEditor question={question} onChange={onChange} />}
            {question.type === "crossword" && <CrosswordEditor question={question} onChange={onChange} />}
            {question.type === "word-search" && <WordSearchEditor question={question} onChange={onChange} />}
            {question.type === "label-diagram" && (
              <LabelDiagramEditor
                question={question}
                paperLanguage={paperLanguage}
                onChange={onChange}
                onPatch={(patch) => onPatch((q) => (q.type === "label-diagram" ? patch(q) : q))}
              />
            )}
            {question.type === "punnett" && <PunnettEditor question={question} onChange={onChange} />}
            {question.type === "pedigree" && <PedigreeEditor question={question} onChange={onChange} />}
            {question.type === "map" && (
              <MapEditor
                question={question}
                picture={toolkit.markersOnPicture}
                onChange={onChange}
                onPatch={(patch) => onPatch((q) => (q.type === "map" ? patch(q) : q))}
              />
            )}

            {question.type === "passage" && <TextBlockEditor question={question} onChange={onChange} />}
            {question.type === "poem" && <TextBlockEditor question={question} onChange={onChange} />}
            {question.type === "fill-blank" && <FillBlankEditor question={question} onChange={onChange} />}
            {question.type === "mark-words" && <MarkWordsEditor question={question} onChange={onChange} />}
            {question.type === "grammar-table" && <GrammarTableEditor question={question} onChange={onChange} />}
            {question.type === "find-mistake" && <FindMistakeEditor question={question} onChange={onChange} />}
            {question.type === "sentence-analysis" && <SentenceAnalysisEditor question={question} onChange={onChange} />}
            {question.type === "essay" && <EssayEditor question={question} onChange={onChange} />}
            {question.type === "balance" && <BalanceEditor question={question} onChange={onChange} />}

            {!textBlock && (
            <MediaBar
              grid={question.grid}
              busy={mediaBusy}
              error={mediaError}
              onFiles={(files) => void addFiles(files)}
              onGridChange={(grid) => onChange({ ...question, grid })}
              diagrams={toolkit.diagrams}
              onNewDiagram={startDiagram}
            />
            )}
            <DiagramDialog
              diagram={diagramEdit?.diagram ?? null}
              isNew={diagramEdit?.placementId === null}
              onSave={saveDiagram}
              onClose={() => setDiagramEdit(null)}
            />
          </div>
        </div>
      </div>
    </motion.li>
  );
}
