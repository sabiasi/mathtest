"use client";

import { convertLatexToMarkup } from "mathlive";
import { Sigma } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useMemo, useState, type MouseEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMathEditing } from "@/features/math/MathEditingContext";
import { useLanguage, useT } from "@/i18n/language";
import type { SubjectToolkit } from "@/subjects/types";

// Clicking a toolbar button must NOT move the keyboard focus away from the
// text box — otherwise we'd lose track of where the cursor was.
// (Radix Tabs would normally switch tabs on mouse-down; preventing it there
// means we switch in onClick instead — see the tab buttons below.)
const keepFocus = (event: MouseEvent) => event.preventDefault();

/** The remembered writing style of a tab (e.g. units), or null. */
function readStyle(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * The toolbar shown while a question box is being edited. What's on it
 * comes from the test's subject toolkit (src/subjects): math gets 7 tabs of
 * formula buttons, physics a few, history none (then this isn't shown).
 */
export function SubjectToolbar({ toolkit }: { toolkit: SubjectToolkit }) {
  const t = useT();
  const language = useLanguage();
  const { insert } = useMathEditing();
  const tabs = toolkit.toolbar;
  const [tabId, setTabId] = useState(tabs[0]?.id);
  const tab = tabs.find((x) => x.id === tabId) ?? tabs[0];

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

  // Turn each button's LaTeX into the HTML of a little formula (once per tab).
  const buttons = useMemo(
    () => (style?.buttons ?? tab?.buttons ?? []).map((button) => ({ ...button, html: convertLatexToMarkup(button.display) })),
    [tab, style],
  );

  const shortcut = isMac() ? "⌥ =" : "Alt + =";

  return (
    <motion.div
      className="overflow-x-clip border-t"
      role="toolbar"
      aria-label={t("math.toolbarLabel")}
      data-math-toolbar=""
      data-subject-toolbar={toolkit.id}
      // Slides open quickly. Only opacity + height, so nothing jumps sideways.
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      // Once open, the top bar is taller: make sure the box the teacher just
      // clicked isn't hidden underneath it.
      onAnimationComplete={() =>
        (document.activeElement as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" })
      }
    >
      <Tabs value={tab?.id ?? ""} onValueChange={setTabId} className="mx-auto max-w-5xl gap-0 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => insert("")}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary-hover motion-safe:active:scale-[0.97]"
              >
                <Sigma className="size-4" aria-hidden="true" />
                {t("math.insert")}
                <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-sans text-xs font-medium">{shortcut}</kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent>{`${t("math.insertTooltip")} (${shortcut})`}</TooltipContent>
          </Tooltip>

          {/* Tabs (scroll sideways on phones, wrap on bigger screens) */}
          <TabsList className="h-auto! max-w-full justify-start gap-0.5 overflow-x-auto bg-transparent p-0 sm:flex-wrap sm:overflow-visible">
            {tabs.map((x) => (
              <TabsTrigger
                key={x.id}
                value={x.id}
                onMouseDown={keepFocus}
                onClick={() => setTabId(x.id)}
                className="h-8 flex-none rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent data-[state=active]:bg-primary-soft! data-[state=active]:text-brand! data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent"
              >
                {x[language]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Buttons of the chosen tab */}
        <TabsContent value={tab?.id ?? ""} className="flex flex-wrap gap-1 pt-2 pb-2.5" aria-label={tab?.[language]}>
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
          {buttons.map((button) => (
            <Fragment key={button.latex + button.display}>
              {button.group && (
                <span className="ml-2 flex h-10 items-center text-sm font-medium text-muted-foreground pointer-coarse:h-11">
                  {button.group[language]}
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => insert(button.latex)}
                    aria-label={button[language]}
                    className="flex h-10 min-w-10 items-center justify-center rounded-lg border bg-card px-2 text-foreground shadow-xs transition-[background-color,border-color,transform] duration-150 hover:border-primary-soft-border hover:bg-primary-soft motion-safe:active:scale-95 pointer-coarse:h-11 pointer-coarse:min-w-11"
                  >
                    <span className="toolbar-math pointer-events-none" dangerouslySetInnerHTML={{ __html: button.html }} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{button[language]}</TooltipContent>
              </Tooltip>
            </Fragment>
          ))}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
