"use client";

/**
 * Editors for the English blocks and question types. Teachers write their
 * own content; everything here is plain text (English), checked by the
 * browser's English spellcheck (the editor sets lang="en" for English tests).
 */
import { ImagePlus, LoaderCircle, Music, Plus, RefreshCw, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QuestionImageView } from "@/components/QuestionImageView";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel, SegmentedControl, inputClasses } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/features/editor/questions/QuestionMedia";
import { WordPicker } from "@/features/editor/questions/WordPicker";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { ACCEPTED_TYPES } from "@/lib/images/imageMath";
import { UnsupportedImageError, addImage } from "@/lib/images/imageStore";
import { buildCrossword, buildWordSearch } from "@/lib/puzzles";
import { LIMITS } from "@/lib/questions";
import {
  SECTION_KINDS,
  type CrosswordQuestion,
  type ListeningQuestion,
  type OddOneOutQuestion,
  type PictureMatchQuestion,
  type SectionQuestion,
  type SpeakingQuestion,
  type TransformationQuestion,
  type WordFormationQuestion,
  type WordSearchQuestion,
} from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { newSeed } from "@/lib/variants";
import { findRef, sameRef, tokenize } from "@/lib/words";
import { RowControls, addButtonClass, move } from "@/subjects/history/editors/RowControls";
import { CrosswordPrint, QrCode, WordSearchPrint } from "./EnglishPrint";

const list = (value: string) =>
  value
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);

/** A short warning line (amber). */
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-warning-text" data-warning="">
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function SectionEditor({ question, points, onChange }: { question: SectionQuestion; points: number; onChange: (q: SectionQuestion) => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3" data-section-editor="">
      <label className="block">
        <FieldLabel>{t("section.kind")}</FieldLabel>
        <select className={cn(inputClasses, "w-56")} value={question.kind} onChange={(e) => onChange({ ...question, kind: e.target.value as SectionQuestion["kind"] })}>
          {SECTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`section.${kind}`)}
            </option>
          ))}
        </select>
      </label>
      <Field label={t("section.title")} hint={t("header.optional")} className="min-w-56 flex-1">
        <Input value={question.title} maxLength={200} placeholder={t(`section.${question.kind}`)} onChange={(e) => onChange({ ...question, title: e.target.value })} />
      </Field>
      <p className="pb-2 text-sm font-semibold text-brand" data-section-points="">
        {t("section.points", { points })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listening
// ---------------------------------------------------------------------------

export function ListeningEditor({ question, onChange }: { question: ListeningQuestion; onChange: (q: ListeningQuestion) => void }) {
  const t = useT();
  const [audio, setAudio] = useState<{ name: string; url: string } | null>(null);
  const linkOk = question.link === "" || /^https?:\/\/\S+$/i.test(question.link);
  // The file is only played here (not uploaded): forget it when leaving.
  useEffect(() => () => (audio ? URL.revokeObjectURL(audio.url) : undefined), [audio]);

  return (
    <div className="space-y-4" data-listening-editor="">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-64 flex-1 space-y-2">
          <Field label={t("listening.link")} hint={t("header.optional")}>
            <Input
              type="url"
              value={question.link}
              placeholder="https://…"
              maxLength={1000}
              onChange={(e) => onChange({ ...question, link: e.target.value.trim() })}
              data-listening-link=""
            />
          </Field>
          {!linkOk && <Warning>{t("listening.linkInvalid")}</Warning>}
          <p className="text-sm text-muted-foreground">{t("listening.linkHint")}</p>
          <label className="flex items-center gap-2 text-sm text-soft-foreground">
            <input type="checkbox" className="size-4 accent-primary" checked={question.showQr} onChange={(e) => onChange({ ...question, showQr: e.target.checked })} />
            {t("listening.showQr")}
          </label>
        </div>
        {question.showQr && question.link && linkOk && (
          <div className="paper rounded-lg border p-2" aria-hidden="true">
            <QrCode link={question.link} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-soft-foreground">
        {t("listening.playsLabel")}
        <SegmentedControl
          label={t("listening.playsLabel")}
          value={String(question.plays)}
          onChange={(v) => onChange({ ...question, plays: Number(v) as 1 | 2 | 3 })}
          options={[
            { value: "1", label: "1×" },
            { value: "2", label: "2×" },
            { value: "3", label: "3×" },
          ]}
        />
      </div>

      <div className="rounded-xl border bg-muted/40 p-3">
        <FieldLabel>
          <Music className="mr-1.5 inline size-4 align-[-2px] text-brand" aria-hidden="true" />
          {t("listening.file")}
        </FieldLabel>
        <input
          type="file"
          accept="audio/*"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setAudio({ name: file.name, url: URL.createObjectURL(file) });
          }}
        />
        {audio && (
          <audio controls src={audio.url} className="mt-2 w-full" />
        )}
        <p className="mt-1.5 text-sm text-muted-foreground">{t("listening.fileHint")}</p>
      </div>

      <Field label={t("listening.transcriptLabel")} hint={t("listening.transcriptHint")}>
        <Textarea rows={6} value={question.transcript} maxLength={LIMITS.passageChars} onChange={(e) => onChange({ ...question, transcript: e.target.value })} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speaking cards
// ---------------------------------------------------------------------------

export function SpeakingEditor({ question, onChange }: { question: SpeakingQuestion; onChange: (q: SpeakingQuestion) => void }) {
  const t = useT();
  const { cards } = question;
  const setCard = (id: string, changes: Partial<SpeakingQuestion["cards"][number]>) =>
    onChange({ ...question, cards: cards.map((c) => (c.id === id ? { ...c, ...changes } : c)) });
  return (
    <div className="space-y-4" data-speaking-editor="">
      <div className="flex flex-wrap items-center gap-2 text-sm text-soft-foreground">
        {t("speaking.perPage")}
        <SegmentedControl
          label={t("speaking.perPage")}
          value={String(question.perPage)}
          onChange={(v) => onChange({ ...question, perPage: v === "2" ? 2 : 4 })}
          options={[
            { value: "2", label: "2" },
            { value: "4", label: "4" },
          ]}
        />
        <span className="text-muted-foreground">{t("speaking.hint")}</span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => (
          <li key={card.id} className="space-y-2 rounded-xl border border-dashed bg-card p-3" data-speaking-card="">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-soft-foreground">{index + 1}.</span>
              <Input className="h-9 min-w-0 flex-1" value={card.title} maxLength={200} placeholder={t("speaking.cardTitle")} onChange={(e) => setCard(card.id, { title: e.target.value })} />
              <RowControls index={index} count={cards.length} min={1} onMove={(by) => onChange({ ...question, cards: move(cards, index, by) })} onRemove={() => onChange({ ...question, cards: cards.filter((c) => c.id !== card.id) })} />
            </div>
            <Textarea rows={4} value={card.prompts} maxLength={2000} placeholder={t("speaking.prompts")} onChange={(e) => setCard(card.id, { prompts: e.target.value })} />
          </li>
        ))}
      </ol>
      <button type="button" className={addButtonClass} disabled={cards.length >= LIMITS.cards} onClick={() => onChange({ ...question, cards: [...cards, { id: newId(), title: "", prompts: "" }] })}>
        <Plus className="size-4" aria-hidden="true" />
        {t("speaking.add")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grammar transformation
// ---------------------------------------------------------------------------

export function TransformationEditor({ question, onChange }: { question: TransformationQuestion; onChange: (q: TransformationQuestion) => void }) {
  const t = useT();
  const { items } = question;
  const setItem = (id: string, changes: Partial<TransformationQuestion["items"][number]>) =>
    onChange({ ...question, items: items.map((i) => (i.id === id ? { ...i, ...changes } : i)) });
  return (
    <div className="space-y-3" data-transformation-editor="">
      <p className="text-sm text-muted-foreground">{t("transform.hint")}</p>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="space-y-2 rounded-xl border bg-card p-3" data-transform-item="">
            <div className="flex items-center gap-2">
              <span className="w-6 text-right font-semibold text-soft-foreground">{index + 1}</span>
              <Input className="h-9 min-w-0 flex-1" value={item.original} maxLength={500} placeholder={t("transform.original")} aria-label={t("transform.original")} onChange={(e) => setItem(item.id, { original: e.target.value })} />
              <RowControls index={index} count={items.length} min={1} onMove={(by) => onChange({ ...question, items: move(items, index, by) })} onRemove={() => onChange({ ...question, items: items.filter((i) => i.id !== item.id) })} />
            </div>
            <div className="ml-8 grid gap-2 sm:grid-cols-[8rem_1fr_1fr_1fr]">
              <Input className="h-9 font-semibold uppercase" value={item.keyWord} maxLength={50} placeholder={t("transform.keyWord")} aria-label={t("transform.keyWord")} onChange={(e) => setItem(item.id, { keyWord: e.target.value })} />
              <Input className="h-9" value={item.before} maxLength={300} placeholder={t("transform.before")} aria-label={t("transform.before")} onChange={(e) => setItem(item.id, { before: e.target.value })} />
              <Input className="h-9 border-primary-soft-border" value={item.answer} maxLength={300} placeholder={t("transform.answer")} aria-label={t("transform.answer")} onChange={(e) => setItem(item.id, { answer: e.target.value })} />
              <Input className="h-9" value={item.after} maxLength={300} placeholder={t("transform.after")} aria-label={t("transform.after")} onChange={(e) => setItem(item.id, { after: e.target.value })} />
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={`${addButtonClass} ml-6`}
        disabled={items.length >= LIMITS.items}
        onClick={() => onChange({ ...question, items: [...items, { id: newId(), original: "", keyWord: "", before: "", after: "", answer: "" }] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("transform.add")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word formation
// ---------------------------------------------------------------------------

export function WordFormationEditor({ question, onChange }: { question: WordFormationQuestion; onChange: (q: WordFormationQuestion) => void }) {
  const t = useT();
  const { items } = question;
  const setItem = (id: string, changes: Partial<WordFormationQuestion["items"][number]>) =>
    onChange({ ...question, items: items.map((i) => (i.id === id ? { ...i, ...changes } : i)) });
  return (
    <div className="space-y-3" data-word-formation-editor="">
      <p className="text-sm text-muted-foreground">{t("wf.hint")}</p>
      <ol className="space-y-3">
        {items.map((item, index) => {
          const gap = item.gap && findRef(tokenize(item.sentence), item.gap) >= 0 ? item.gap : null;
          return (
            <li key={item.id} className="space-y-2 rounded-xl border bg-card p-3" data-wf-item="">
              <div className="flex items-center gap-2">
                <span className="w-6 text-right font-semibold text-soft-foreground">{index + 1}</span>
                <Input className="h-9 min-w-0 flex-1" value={item.sentence} maxLength={500} placeholder={t("wf.sentence")} aria-label={t("wf.sentence")} onChange={(e) => setItem(item.id, { sentence: e.target.value })} />
                <Input className="h-9 w-36 font-semibold uppercase" value={item.root} maxLength={50} placeholder={t("wf.root")} aria-label={t("wf.root")} onChange={(e) => setItem(item.id, { root: e.target.value })} />
                <RowControls index={index} count={items.length} min={1} onMove={(by) => onChange({ ...question, items: move(items, index, by) })} onRemove={() => onChange({ ...question, items: items.filter((i) => i.id !== item.id) })} />
              </div>
              <div className="ml-8">
                <WordPicker text={item.sentence} isChosen={(ref) => sameRef(gap, ref)} onPick={(ref) => setItem(item.id, { gap: sameRef(gap, ref) ? null : ref })} label={t("wf.pick")} />
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className={`${addButtonClass} ml-6`} disabled={items.length >= LIMITS.items} onClick={() => onChange({ ...question, items: [...items, { id: newId(), sentence: "", gap: null, root: "" }] })}>
        <Plus className="size-4" aria-hidden="true" />
        {t("wf.add")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vocabulary: pictures
// ---------------------------------------------------------------------------

export function PictureMatchEditor({
  question,
  onChange,
  onPatch,
}: {
  question: PictureMatchQuestion;
  onChange: (q: PictureMatchQuestion) => void;
  onPatch: (patch: (q: PictureMatchQuestion) => PictureMatchQuestion) => void;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    setBusy(true);
    setError(null);
    for (const file of files) {
      try {
        const { imageId, width, height } = await addImage(file);
        onPatch((q) => (q.pictures.length >= LIMITS.pictures ? q : { ...q, pictures: [...q.pictures, { id: newId(), imageId, width, height, answer: "" }] }));
      } catch (err) {
        setError(t(err instanceof UnsupportedImageError ? "media.unsupported" : "media.failed"));
      }
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4" data-picture-match-editor="">
      {question.pictures.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {question.pictures.map((picture, index) => (
            <li key={picture.id} className="space-y-1.5 rounded-xl border bg-card p-2" data-picture-item="">
              <div className="paper relative overflow-hidden rounded-md">
                <QuestionImageView image={{ ...picture, widthPercent: 100, position: "above", caption: "" }} />
                <IconButton label={t("media.remove")} tone="danger" className="absolute top-1 right-1 bg-card/90 p-1" onClick={() => onChange({ ...question, pictures: question.pictures.filter((p) => p.id !== picture.id) })}>
                  <X className="size-3.5" aria-hidden="true" />
                </IconButton>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-soft-foreground">{index + 1}</span>
                <Input
                  className="h-8 min-w-0 flex-1 text-sm"
                  value={picture.answer}
                  maxLength={100}
                  placeholder={t("pictures.word")}
                  aria-label={t("pictures.wordFor", { number: index + 1 })}
                  onChange={(e) => onChange({ ...question, pictures: question.pictures.map((p) => (p.id === picture.id ? { ...p, answer: e.target.value } : p)) })}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || question.pictures.length >= LIMITS.pictures} onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
          {t(busy ? "media.uploading" : "pictures.add")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            void upload([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <label className="flex items-center gap-2 text-sm text-soft-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={question.wordBank} onChange={(e) => onChange({ ...question, wordBank: e.target.checked })} />
          {t("pictures.wordBank")}
        </label>
      </div>
      {error && <p className="text-sm text-destructive-text">{error}</p>}
      {question.wordBank && (
        <Field label={t("fill.extras")} hint={t("fill.extrasHint")}>
          <Input defaultValue={question.extras.join(", ")} onBlur={(e) => onChange({ ...question, extras: list(e.target.value).slice(0, 10) })} />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Odd one out
// ---------------------------------------------------------------------------

export function OddOneOutEditor({ question, onChange }: { question: OddOneOutQuestion; onChange: (q: OddOneOutQuestion) => void }) {
  const t = useT();
  const { rows } = question;
  const setRow = (id: string, changes: Partial<OddOneOutQuestion["rows"][number]>) =>
    onChange({ ...question, rows: rows.map((r) => (r.id === id ? { ...r, ...changes } : r)) });
  return (
    <div className="space-y-3" data-odd-editor="">
      <p className="text-sm text-muted-foreground">{t("odd.hint")}</p>
      <ol className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2" data-odd-row="">
            <span className="w-6 text-right font-semibold text-soft-foreground">{index + 1}</span>
            {row.words.map((word, j) => (
              <span key={j} className="flex items-center">
                <Input
                  className={cn("h-9 w-28", row.odd === j && "border-destructive ring-1 ring-destructive")}
                  value={word}
                  maxLength={100}
                  aria-label={t("odd.word", { number: j + 1 })}
                  onChange={(e) => setRow(row.id, { words: row.words.map((w, k) => (k === j ? e.target.value : w)) })}
                />
                <button
                  type="button"
                  aria-pressed={row.odd === j}
                  title={t("odd.markOdd")}
                  onClick={() => setRow(row.id, { odd: row.odd === j ? null : j })}
                  className="ml-0.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent aria-pressed:bg-destructive-soft aria-pressed:text-destructive-text"
                >
                  ✕
                </button>
              </span>
            ))}
            <RowControls index={index} count={rows.length} min={1} onMove={(by) => onChange({ ...question, rows: move(rows, index, by) })} onRemove={() => onChange({ ...question, rows: rows.filter((r) => r.id !== row.id) })} />
          </li>
        ))}
      </ol>
      <button type="button" className={`${addButtonClass} ml-6`} disabled={rows.length >= LIMITS.items} onClick={() => onChange({ ...question, rows: [...rows, { id: newId(), words: ["", "", "", ""], odd: null }] })}>
        <Plus className="size-4" aria-hidden="true" />
        {t("odd.add")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crossword and word search
// ---------------------------------------------------------------------------

/** A live preview of the answer key (on white paper). */
function PuzzlePreview({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <div aria-hidden="true">
      <p className="mb-1.5 text-sm text-muted-foreground">{t("puzzle.preview")}</p>
      <div className="paper sheet-font-normal overflow-x-auto rounded-lg border p-3">{children}</div>
    </div>
  );
}

export function CrosswordEditor({ question, onChange }: { question: CrosswordQuestion; onChange: (q: CrosswordQuestion) => void }) {
  const t = useT();
  const { entries } = question;
  const puzzle = buildCrossword(entries, question.seed);
  const setEntry = (id: string, changes: Partial<CrosswordQuestion["entries"][number]>) =>
    onChange({ ...question, entries: entries.map((e) => (e.id === id ? { ...e, ...changes } : e)) });
  return (
    <div className="space-y-4" data-crossword-editor="">
      <ol className="space-y-2">
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2" data-crossword-entry="">
            <span className="w-6 text-right text-sm font-semibold text-soft-foreground">{index + 1}</span>
            <Input className="h-9 w-36 font-semibold" value={entry.word} maxLength={30} placeholder={t("puzzle.word")} aria-label={t("puzzle.word")} onChange={(e) => setEntry(entry.id, { word: e.target.value })} />
            <Input className="h-9 min-w-0 flex-1" value={entry.clue} maxLength={300} placeholder={t("puzzle.clue")} aria-label={t("puzzle.clue")} onChange={(e) => setEntry(entry.id, { clue: e.target.value })} />
            <RowControls index={index} count={entries.length} min={1} onMove={(by) => onChange({ ...question, entries: move(entries, index, by) })} onRemove={() => onChange({ ...question, entries: entries.filter((x) => x.id !== entry.id) })} />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={addButtonClass} disabled={entries.length >= LIMITS.puzzleWords} onClick={() => onChange({ ...question, entries: [...entries, { id: newId(), word: "", clue: "" }] })}>
          <Plus className="size-4" aria-hidden="true" />
          {t("puzzle.addWord")}
        </button>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...question, seed: newSeed() })} data-new-layout="">
          <RefreshCw className="size-4" aria-hidden="true" />
          {t("puzzle.newLayout")}
        </Button>
      </div>
      {puzzle.unplaced.length > 0 && <Warning>{t("puzzle.unplaced", { words: puzzle.unplaced.join(", ") })}</Warning>}
      {puzzle.placed.length > 0 && (
        <PuzzlePreview>
          <CrosswordPrint question={question} answerKey />
        </PuzzlePreview>
      )}
    </div>
  );
}

export function WordSearchEditor({ question, onChange }: { question: WordSearchQuestion; onChange: (q: WordSearchQuestion) => void }) {
  const t = useT();
  const puzzle = buildWordSearch(question.words, question.size, question.allDirections, question.seed);
  return (
    <div className="space-y-4" data-word-search-editor="">
      <Field label={t("puzzle.words")} hint={t("puzzle.wordsHint")}>
        <Textarea rows={3} defaultValue={question.words.join(", ")} onBlur={(e) => onChange({ ...question, words: list(e.target.value).slice(0, LIMITS.puzzleWords) })} data-word-search-words="" />
      </Field>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <Stepper label={t("puzzle.size")} value={question.size} min={LIMITS.wordSearchSize.min} max={LIMITS.wordSearchSize.max} onChange={(size) => onChange({ ...question, size })} />
        <label className="flex items-center gap-2 text-soft-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={question.allDirections} onChange={(e) => onChange({ ...question, allDirections: e.target.checked })} />
          {t("puzzle.allDirections")}
        </label>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...question, seed: newSeed() })}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t("puzzle.newLayout")}
        </Button>
      </div>
      {puzzle.unplaced.length > 0 && <Warning>{t("puzzle.unplacedSearch", { words: puzzle.unplaced.join(", ") })}</Warning>}
      {puzzle.found.length > 0 && (
        <PuzzlePreview>
          <WordSearchPrint question={question} answerKey />
        </PuzzlePreview>
      )}
    </div>
  );
}
