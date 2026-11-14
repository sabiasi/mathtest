"use client";

import { convertLatexToMarkup } from "mathlive";
import { ChevronDown, ChevronUp, FlaskConical, Keyboard, Rows2, Rows4, Search, Sigma, X } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveFormats, useMathEditing } from "@/features/math/MathEditingContext";
import { chosenStyle, orderedStyles } from "./toolbarStyles";
import { useLanguage, useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { buttonKey, type SubjectToolkit, type ToolbarButton } from "@/subjects/types";
import { allButtons, searchButtons } from "./toolbarSearch";
import { COMPACT_HEIGHT, EXPANDED_HEIGHT, fitHeight, KEY_STEP, maxHeight, MIN_HEIGHT, presetOf, readSize, ROW, writeSize, type ToolbarSize } from "./toolbarSize";

// Clicking a toolbar button must NOT move the keyboard focus away from the
// text box — otherwise we'd lose track of where the cursor was.
// (Radix Tabs would normally switch tabs on mouse-down; preventing it there
// means we switch in onClick instead — see the tab buttons below.)
const keepFocus = (event: MouseEvent) => event.preventDefault();

/** A formatting button that is ON (the text at the cursor is bold…): filled, in both themes. */
const formatOn = "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm aria-pressed:hover:bg-primary-hover aria-pressed:hover:text-primary-foreground";
/** …and one that can't be used right now (the cursor is inside a formula). */
const formatOff = "aria-disabled:cursor-default aria-disabled:opacity-45 aria-disabled:hover:bg-transparent aria-disabled:hover:text-soft-foreground";

/** The small buttons that choose the toolbar's size. */
const sizeButton =
  "flex size-8 items-center justify-center rounded-md text-soft-foreground transition-colors hover:bg-card hover:text-foreground aria-pressed:bg-card aria-pressed:text-brand aria-pressed:shadow-xs pointer-coarse:size-9";

/** The big "Σ Formula" / "Chemical formula" buttons. */
const primaryButton =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary-hover motion-safe:active:scale-[0.97]";

/** Bold / italic / underline / word box: on every subject's toolbar (also ⌘/Ctrl + B, I, U). */
const FORMAT_BUTTONS: (ToolbarButton & { className: string })[] = [
  { latex: "", display: "B", format: "bold", ka: "მუქი (⌘/Ctrl + B)", en: "Bold (⌘/Ctrl + B)", className: "font-bold" },
  { latex: "", display: "I", format: "italic", ka: "დახრილი (⌘/Ctrl + I)", en: "Italic (⌘/Ctrl + I)", className: "font-serif italic" },
  { latex: "", display: "U", format: "underline", ka: "ხაზგასმული (⌘/Ctrl + U)", en: "Underline (⌘/Ctrl + U)", className: "underline" },
  {
    latex: "",
    display: "▭",
    format: "box",
    ka: "ჩარჩოში ჩასმა: მონიშნეთ სიტყვები და დააჭირეთ",
    en: "Word box: select the words, then click",
    className: "",
  },
];

/** The remembered writing style of a tab (e.g. units), or null. */
function readStyle(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Little formulas for the buttons, drawn once and reused (tabs are switched often). */
const markupCache = new Map<string, string>();
function markup(latex: string): string {
  let html = markupCache.get(latex);
  if (html === undefined) {
    html = convertLatexToMarkup(latex);
    markupCache.set(latex, html);
  }
  return html;
}

/** What a click does (browser tests use it): format | command | chem | text | math. */
const kindOf = (button: ToolbarButton) =>
  button.format ? "format" : button.command ? "command" : button.chem !== undefined ? "chem" : button.text !== undefined ? "text" : "math";

/**
 * The toolbar shown while a question box is being edited. What's on it
 * comes from the test's subject toolkit (src/subjects). Like Word's equation
 * tools: tabs of symbols (most used first), a search box ("ფესვი", "alpha"…)
 * and a list of typing shortcuts.
 *
 * The teacher decides how much of the window it takes (toolbarSize.ts): the
 * symbols can be hidden (the top row — formula button, B I U, search — stays),
 * shown in a compact or an expanded size, or dragged to any height with the
 * handle under the toolbar (also ↑ ↓ on the keyboard). Symbols that don't fit
 * scroll INSIDE the panel; the buttons themselves never shrink.
 */
export function SubjectToolbar({ toolkit }: { toolkit: SubjectToolkit }) {
  const t = useT();
  const language = useLanguage();
  const { insert, insertText, insertChem, toggleFormat, runCommand, inFormula } = useMathEditing();
  // Which of bold / italic / underline / word box is on at the cursor (read from the editor).
  const activeFormats = useActiveFormats();
  const tabs = toolkit.toolbar;
  const [tabId, setTabId] = useState(tabs[0]?.id);
  const tab = tabs.find((x) => x.id === tabId) ?? tabs[0];
  const [query, setQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Tabs with writing styles (units: Latin / Georgian): which one is chosen.
  const [styleIds, setStyleIds] = useState<Record<string, string>>({});
  const styleId = tab?.styles ? (styleIds[tab.styles.storageKey] ?? readStyle(tab.styles.storageKey)) : null;
  // Georgian first: with the Georgian interface the Georgian style is the default (toolbarStyles.ts).
  const style = tab?.styles ? chosenStyle(tab.styles.options, styleId, language) : undefined;
  function chooseStyle(storageKey: string, id: string) {
    setStyleIds((current) => ({ ...current, [storageKey]: id }));
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // storage blocked: remembered until the page is closed
    }
  }

  // Search looks through every button of the subject.
  const index = useMemo(() => allButtons(toolkit), [toolkit]);
  const results = useMemo(() => searchButtons(index, query, language), [index, query, language]);
  const searching = query.trim() !== "";

  const shortcut = isMac() ? "⌥ =" : "Alt + =";

  // ---- The size of the symbol panel (chosen by the teacher, remembered) ----
  const [size, setSize] = useState<ToolbarSize>(readSize);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The tallest panel that still leaves room for the box being edited in THIS window.
  const [limit, setLimit] = useState(() => (typeof window === "undefined" ? EXPANDED_HEIGHT : maxHeight(window.innerHeight, 170)));
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const panel = panelRef.current;
      if (!panel) return; // collapsed: the last known limit stays
      // Everything above and around the panel: the editor's bar, the buttons row, the tabs, the handle.
      const above = content.getBoundingClientRect().top + content.offsetHeight - panel.offsetHeight;
      setLimit(maxHeight(window.innerHeight, above));
    };
    // The window got smaller or bigger (or the rows of the toolbar wrapped): fit the height again.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const height = fitHeight(size.height, limit);
  // Searching or reading the shortcuts needs the panel: it shows meanwhile, and hides again afterwards.
  const open = !size.collapsed || searching || (showShortcuts && toolkit.typingShortcuts !== undefined);

  function changeSize(next: ToolbarSize, remember = true) {
    setSize(next);
    if (remember) writeSize(next);
  }

  // Dragging the handle: the panel follows the pointer (mouse, pen or finger).
  const drag = useRef<{ startY: number; startHeight: number } | null>(null);
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); // the keyboard focus (and the selection) stay in the box being edited
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: height };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    changeSize({ collapsed: false, height: fitHeight(drag.current.startHeight + event.clientY - drag.current.startY, limit) }, false);
  }
  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    writeSize({ ...size, collapsed: false });
  }
  /** The same with the keyboard: ↑ ↓ a little, Page Up / Down a row, Home / End the smallest / tallest. */
  function resizeByKey(event: KeyboardEvent<HTMLDivElement>) {
    const target =
      event.key === "ArrowUp" ? height - KEY_STEP
      : event.key === "ArrowDown" ? height + KEY_STEP
      : event.key === "PageUp" ? height - ROW
      : event.key === "PageDown" ? height + ROW
      : event.key === "Home" ? MIN_HEIGHT
      : event.key === "End" ? limit
      : null;
    if (target === null) return;
    event.preventDefault(); // the page must not scroll
    changeSize({ collapsed: false, height: fitHeight(target, limit) });
  }

  /** A button inserts chemistry, plain text, or (most often) a formula. */
  function press(button: ToolbarButton) {
    if (button.format) toggleFormat(button.format);
    else if (button.command) {
      // Matrix rows / columns: only inside a formula.
      if (!runCommand(button.command)) toast(t("toolbar.needFormula"));
    } else if (button.chem !== undefined) insertChem(button.chem, button.caretBack);
    else if (button.text !== undefined) insertText(button.text, button.caretBack);
    else insert(button.latex);
  }

  /** What a formatting button says about itself: on / off, and "not now" inside a formula. */
  const formatState = (button: ToolbarButton) =>
    button.format ? { "aria-pressed": activeFormats.has(button.format), "aria-disabled": inFormula || undefined } : {};

  const renderButton = (button: ToolbarButton, where: string) => (
    <Tooltip key={`${where}:${buttonKey(button)}`}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => press(button)}
          aria-label={button[language]}
          data-kind={kindOf(button)}
          data-key={buttonKey(button)}
          {...formatState(button)}
          className={cn(
            "flex h-10 min-w-10 items-center justify-center rounded-lg border bg-card px-2 text-foreground shadow-xs transition-[background-color,border-color,transform] duration-150 hover:border-primary-soft-border hover:bg-primary-soft motion-safe:active:scale-95 pointer-coarse:h-11 pointer-coarse:min-w-11",
            button.format && "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary-hover aria-disabled:opacity-45",
          )}
        >
          {button.label ? (
            <span className="pointer-events-none text-sm font-medium whitespace-nowrap">{button.label[language]}</span>
          ) : button.text !== undefined || button.format ? (
            <span className="pointer-events-none text-sm font-medium whitespace-nowrap">{button.display}</span>
          ) : (
            <span className="toolbar-math pointer-events-none" dangerouslySetInnerHTML={{ __html: markup(button.display) }} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{button[language]}</TooltipContent>
    </Tooltip>
  );

  const rowLabel = (text: string) => <span className="flex h-10 shrink-0 items-center text-sm font-medium whitespace-nowrap text-muted-foreground pointer-coarse:h-11">{text}</span>;

  let panel: ReactNode;
  if (searching) {
    // ---- Search results (from every tab) ----
    panel =
      results.length === 0 ? (
        <p className="flex h-10 items-center text-sm text-muted-foreground" data-no-symbols="">
          {t("toolbar.noResults")}
        </p>
      ) : (
        <>
          {rowLabel(t("toolbar.results"))}
          {results.map((item) => renderButton(item.button, "search"))}
        </>
      );
  } else if (showShortcuts && toolkit.typingShortcuts) {
    // ---- "You can simply type…" ----
    panel = (
      <div className="w-full" data-shortcuts="">
        <p className="mb-1.5 text-sm text-soft-foreground">{t("toolbar.shortcutsHint")}</p>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {toolkit.typingShortcuts.map((s) => (
            <li key={s.keys} className="flex items-center gap-2">
              <kbd className="min-w-12 rounded-md border bg-muted px-1.5 py-0.5 text-center font-mono text-[13px] text-foreground">{s.keys}</kbd>
              <span className="toolbar-math w-12 shrink-0 text-center" dangerouslySetInnerHTML={{ __html: markup(s.display) }} />
              <span className="min-w-0 text-soft-foreground">{s[language]}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    // ---- The chosen tab ----
    panel = (
      <>
        {tab?.Widget && <tab.Widget insertText={insertText} insertChem={insertChem} insertMath={insert} style={style?.id} />}
        {tab?.styles && (
          <div
            role="group"
            aria-label={t("toolbar.style")}
            className="mr-1.5 flex h-10 items-center gap-0.5 rounded-lg bg-muted p-0.5 pointer-coarse:h-11"
            data-toolbar-styles=""
          >
            {orderedStyles(tab.styles.options, language).map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={keepFocus}
                onClick={() => chooseStyle(tab.styles!.storageKey, option.id)}
                aria-pressed={option.id === style?.id}
                className="h-full rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
              >
                {option[language]}
              </button>
            ))}
          </div>
        )}
        {(style?.buttons ?? tab?.buttons ?? []).map((button) => (
          <Fragment key={buttonKey(button)}>
            {button.group && <span className="ml-2 flex h-10 items-center text-sm font-medium text-muted-foreground pointer-coarse:h-11">{button.group[language]}</span>}
            {renderButton(button, "tab")}
          </Fragment>
        ))}
      </>
    );
  }

  return (
    <motion.div
      // A solid background: the page text behind it must not show through.
      className="overflow-x-clip border-y bg-card shadow-md"
      role="toolbar"
      aria-label={t("math.toolbarLabel")}
      data-math-toolbar=""
      data-subject-toolbar={toolkit.id}
      // Slides open quickly. It is an overlay under the sticky bar, so the
      // page content never moves (TestEditor keeps the edited box uncovered).
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
    >
      <Tabs
        value={searching || showShortcuts ? "" : (tab?.id ?? "")}
        onValueChange={setTabId}
        className="mx-auto max-w-5xl gap-0 px-4 sm:px-6"
        ref={contentRef}
        data-toolbar-open={open}
        data-toolbar-collapsed={size.collapsed}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
          {toolkit.formulas && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onMouseDown={keepFocus} onClick={() => insert("")} className={primaryButton} data-insert-formula="">
                  <Sigma className="size-4" aria-hidden="true" />
                  {t("math.insert")}
                  {/* Phones have no Alt key: the hint would only take room. */}
                  <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-sans text-xs font-medium max-sm:hidden">{shortcut}</kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent>{`${t("math.insertTooltip")} (${shortcut})`}</TooltipContent>
            </Tooltip>
          )}
          {toolkit.chemistry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onMouseDown={keepFocus} onClick={() => insertChem("")} className={primaryButton} data-insert-chem="">
                  <FlaskConical className="size-4" aria-hidden="true" />
                  {t("chem.insert")}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("chem.insertTooltip")}</TooltipContent>
            </Tooltip>
          )}

          {/* Bold, italic, underline, word box — the same for every subject */}
          <div role="group" aria-label={t("toolbar.format")} className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5" data-format-buttons="">
            {FORMAT_BUTTONS.map((button) => (
              <Tooltip key={button.format}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => press(button)}
                    aria-label={button[language]}
                    data-kind="format"
                    data-key={buttonKey(button)}
                    {...formatState(button)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md text-[15px] text-soft-foreground transition-colors hover:bg-card hover:text-foreground pointer-coarse:size-9",
                      formatOn,
                      formatOff,
                      button.className,
                    )}
                  >
                    {button.display}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{button[language]}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Find a symbol by name, in Georgian or English */}
          <label className="relative ml-auto flex items-center max-sm:order-last max-sm:ml-0 max-sm:min-w-36 max-sm:flex-1">
            <span className="sr-only">{t("toolbar.searchLabel")}</span>
            <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter inserts the best match; Escape clears the search.
                if (e.key === "Enter" && results[0]) {
                  e.preventDefault();
                  press(results[0].button);
                  setQuery("");
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              placeholder={t("toolbar.search")}
              title={t("toolbar.searchLabel")}
              autoComplete="off"
              spellCheck={false}
              className="h-9 w-48 rounded-lg border border-input bg-background pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:w-full"
              data-symbol-search=""
            />
            {searching && (
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => setQuery("")}
                aria-label={t("home.clearFilters")}
                className="absolute right-1.5 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </label>
          {toolkit.typingShortcuts && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => {
                    setShowShortcuts((v) => !v);
                    setQuery("");
                  }}
                  aria-pressed={showShortcuts}
                  aria-label={t("toolbar.shortcuts")}
                  className="flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium text-soft-foreground transition-colors hover:bg-accent aria-pressed:border-primary-soft-border aria-pressed:bg-primary-soft aria-pressed:text-brand"
                  data-shortcuts-button=""
                >
                  <Keyboard className="size-4" aria-hidden="true" />
                  <span className="max-lg:sr-only">{t("toolbar.shortcuts")}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbar.shortcuts")}</TooltipContent>
            </Tooltip>
          )}

          {/* How much room the symbols take: compact / expanded, or hidden altogether */}
          <div role="group" aria-label={t("toolbar.size")} className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 max-sm:order-last" data-toolbar-size="">
            {(
              [
                { id: "compact", Icon: Rows2, height: COMPACT_HEIGHT, label: t("toolbar.sizeCompact") },
                { id: "expanded", Icon: Rows4, height: EXPANDED_HEIGHT, label: t("toolbar.sizeExpanded") },
              ] as const
            ).map(({ id, Icon, height: preset, label }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => changeSize({ collapsed: false, height: preset })}
                    aria-pressed={!size.collapsed && presetOf(size.height) === id}
                    aria-label={label}
                    className={sizeButton}
                    data-size={id}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{label}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => changeSize({ ...size, collapsed: !size.collapsed })}
                  aria-expanded={!size.collapsed}
                  aria-label={t(size.collapsed ? "toolbar.expand" : "toolbar.collapse")}
                  className={sizeButton}
                  data-toolbar-collapse=""
                >
                  {size.collapsed ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t(size.collapsed ? "toolbar.expand" : "toolbar.collapse")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tabs (scroll sideways on phones, wrap on bigger screens) */}
        {tabs.length > 1 && !size.collapsed && (
          <TabsList className="mt-2 h-auto! max-w-full justify-start gap-0.5 overflow-x-auto bg-transparent p-0 sm:flex-wrap sm:overflow-visible">
            {tabs.map((x) => (
              <TabsTrigger
                key={x.id}
                value={x.id}
                onMouseDown={keepFocus}
                onClick={() => {
                  setTabId(x.id);
                  setQuery("");
                  setShowShortcuts(false);
                }}
                className="h-8 flex-none rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent data-[state=active]:bg-primary-soft! data-[state=active]:text-brand! data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent"
              >
                {x[language]}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {/*
          The chosen tab, the search results or the shortcuts list, at the
          height the teacher chose: switching tabs, searching or opening the
          shortcuts never changes how much of the page is covered. What
          doesn't fit scrolls inside. (A subject with a single short tab
          doesn't reserve empty room: there the height is "at most".)
        */}
        {open ? (
          <>
            <div
              ref={panelRef}
              id={`toolbar-panel-${toolkit.id}`}
              role="tabpanel"
              aria-label={searching ? t("toolbar.results") : tab?.[language]}
              className="mt-2 flex flex-wrap content-start gap-1 overflow-y-auto overscroll-contain"
              style={tabs.length <= 1 ? { maxHeight: height } : { height }}
              data-toolbar-panel=""
            >
              {panel}
            </div>
            {/* The handle: drag it up or down (or use the arrow keys) to resize the panel. */}
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label={t("toolbar.resize")}
              aria-controls={`toolbar-panel-${toolkit.id}`}
              aria-valuemin={MIN_HEIGHT}
              aria-valuemax={limit}
              aria-valuenow={height}
              tabIndex={0}
              title={t("toolbar.resize")}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={resizeByKey}
              className="group flex h-3.5 cursor-ns-resize touch-none items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60 pointer-coarse:h-6"
              data-toolbar-resize=""
            >
              <span className="h-1 w-12 rounded-full bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-active:bg-primary pointer-coarse:w-16" />
            </div>
          </>
        ) : (
          <div className="h-2" />
        )}
      </Tabs>
    </motion.div>
  );
}
