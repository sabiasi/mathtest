"use client";

import { convertLatexToMarkup } from "mathlive";
import { FlaskConical, Keyboard, Search, Sigma, X } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMathEditing } from "@/features/math/MathEditingContext";
import { useLanguage, useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { buttonKey, type SubjectToolkit, type ToolbarButton } from "@/subjects/types";
import { allButtons, pushRecent, readRecent, searchButtons, writeRecent } from "./toolbarSearch";

// Clicking a toolbar button must NOT move the keyboard focus away from the
// text box — otherwise we'd lose track of where the cursor was.
// (Radix Tabs would normally switch tabs on mouse-down; preventing it there
// means we switch in onClick instead — see the tab buttons below.)
const keepFocus = (event: MouseEvent) => event.preventDefault();

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
 * tools: tabs of symbols (most used first), a "recently used" row, a search
 * box ("ფესვი", "alpha"…) and a list of typing shortcuts.
 */
export function SubjectToolbar({ toolkit }: { toolkit: SubjectToolkit }) {
  const t = useT();
  const language = useLanguage();
  const { insert, insertText, insertChem, toggleFormat, runCommand } = useMathEditing();
  const tabs = toolkit.toolbar;
  const [tabId, setTabId] = useState(tabs[0]?.id);
  const tab = tabs.find((x) => x.id === tabId) ?? tabs[0];
  const [query, setQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Tabs with writing styles (units: Latin / Georgian): which one is chosen.
  const [styleIds, setStyleIds] = useState<Record<string, string>>({});
  const styleId = tab?.styles ? (styleIds[tab.styles.storageKey] ?? readStyle(tab.styles.storageKey)) : null;
  const style = tab?.styles?.options.find((o) => o.id === styleId) ?? tab?.styles?.options[0];
  function chooseStyle(storageKey: string, id: string) {
    setStyleIds((current) => ({ ...current, [storageKey]: id }));
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // storage blocked: remembered until the page is closed
    }
  }

  // Search and "recently used" look through every button of the subject.
  const index = useMemo(() => allButtons(toolkit), [toolkit]);
  const [recent, setRecent] = useState(() => readRecent(toolkit.id));
  const recentButtons = useMemo(
    () => recent.map((key) => index.find((item) => item.key === key)?.button).filter((b): b is ToolbarButton => b !== undefined),
    [recent, index],
  );
  const results = useMemo(() => searchButtons(index, query, language), [index, query, language]);
  const searching = query.trim() !== "";

  const shortcut = isMac() ? "⌥ =" : "Alt + =";

  /** A button inserts chemistry, plain text, or (most often) a formula. */
  function press(button: ToolbarButton, remember = true) {
    if (button.format) toggleFormat(button.format);
    else if (button.command) {
      // Matrix rows / columns: only inside a formula.
      if (!runCommand(button.command)) toast(t("toolbar.needFormula"));
    } else if (button.chem !== undefined) insertChem(button.chem, button.caretBack);
    else if (button.text !== undefined) insertText(button.text, button.caretBack);
    else insert(button.latex);
    if (remember && !button.format && !button.command) {
      setRecent((list) => {
        const next = pushRecent(list, buttonKey(button));
        writeRecent(toolkit.id, next);
        return next;
      });
    }
  }

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
          className="flex h-10 min-w-10 items-center justify-center rounded-lg border bg-card px-2 text-foreground shadow-xs transition-[background-color,border-color,transform] duration-150 hover:border-primary-soft-border hover:bg-primary-soft motion-safe:active:scale-95 pointer-coarse:h-11 pointer-coarse:min-w-11"
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
        {tab?.Widget && <tab.Widget insertText={insertText} insertChem={insertChem} insertMath={insert} />}
        {tab?.styles && (
          <div
            role="group"
            aria-label={t("toolbar.style")}
            className="mr-1.5 flex h-10 items-center gap-0.5 rounded-lg bg-muted p-0.5 pointer-coarse:h-11"
            data-toolbar-styles=""
          >
            {tab.styles.options.map((option) => (
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
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
          {toolkit.formulas && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onMouseDown={keepFocus} onClick={() => insert("")} className={primaryButton} data-insert-formula="">
                  <Sigma className="size-4" aria-hidden="true" />
                  {t("math.insert")}
                  <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-sans text-xs font-medium">{shortcut}</kbd>
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
                    className={cn("flex size-8 items-center justify-center rounded-md text-[15px] text-soft-foreground transition-colors hover:bg-card hover:text-foreground", button.className)}
                  >
                    {button.display}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{button[language]}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Find a symbol by name, in Georgian or English */}
          <label className="relative ml-auto flex items-center max-sm:order-last max-sm:w-full">
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
        </div>

        {/* Tabs (scroll sideways on phones, wrap on bigger screens) */}
        {tabs.length > 1 && (
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
          Recently used: one click for the symbols this teacher needs most.
          The row is always there (with a hint while empty) and never wraps,
          so the toolbar keeps its height — the first click can't push it
          over the box being edited.
        */}
        {!searching && !showShortcuts && (
          <div className="flex h-12 items-end gap-1 overflow-x-auto overflow-y-hidden pointer-coarse:h-13 max-sm:hidden" data-recent="">
            {rowLabel(t("toolbar.recent"))}
            {recentButtons.length === 0 ? (
              <span className="flex h-10 items-center text-sm whitespace-nowrap text-muted-foreground/80 pointer-coarse:h-11">{t("toolbar.recentEmpty")}</span>
            ) : (
              recentButtons.map((button) => renderButton(button, "recent"))
            )}
          </div>
        )}

        {/*
          The chosen tab, the search results or the shortcuts list. With
          several tabs the height is FIXED (two rows, the rest scrolls
          inside): switching tabs never changes how much of the page is covered.
        */}
        <div
          role="tabpanel"
          aria-label={searching ? t("toolbar.results") : tab?.[language]}
          className={cn(
            "mt-2 mb-2.5 flex flex-wrap content-start gap-1 overflow-y-auto overscroll-contain",
            // Search results and the shortcuts list also take the place of the "recently used" row (3rem; hidden on phones to save room).
            tabs.length <= 1
              ? "max-h-[6.5rem] pointer-coarse:max-h-[7rem]"
              : searching || showShortcuts
                ? "h-[9.5rem] pointer-coarse:h-[10.25rem] max-sm:h-[7rem]"
                : "h-[6.5rem] pointer-coarse:h-[7rem]",
          )}
          data-toolbar-panel=""
        >
          {panel}
        </div>
      </Tabs>
    </motion.div>
  );
}
