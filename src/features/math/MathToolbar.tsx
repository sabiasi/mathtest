"use client";

import { convertLatexToMarkup } from "mathlive";
import { Sigma } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState, type MouseEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage, useT } from "@/i18n/language";
import { useMathEditing } from "./MathEditingContext";
import { TOOLBAR_TABS } from "./toolbarData";

// Clicking a toolbar button must NOT move the keyboard focus away from the
// text box — otherwise we'd lose track of where the cursor was.
// (Radix Tabs would normally switch tabs on mouse-down; preventing it there
// means we switch in onClick instead — see the tab buttons below.)
const keepFocus = (event: MouseEvent) => event.preventDefault();

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function MathToolbar() {
  const t = useT();
  const language = useLanguage();
  const { insert } = useMathEditing();
  const [tabId, setTabId] = useState(TOOLBAR_TABS[0].id);
  const tab = TOOLBAR_TABS.find((x) => x.id === tabId) ?? TOOLBAR_TABS[0];

  // Turn each button's LaTeX into the HTML of a little formula (once per tab).
  const buttons = useMemo(
    () => tab.buttons.map((button) => ({ ...button, html: convertLatexToMarkup(button.display) })),
    [tab],
  );

  const shortcut = isMac() ? "⌥ =" : "Alt + =";

  return (
    <motion.div
      className="overflow-x-clip border-t"
      role="toolbar"
      aria-label={t("math.toolbarLabel")}
      data-math-toolbar=""
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
      <Tabs value={tab.id} onValueChange={setTabId} className="mx-auto max-w-3xl gap-0 px-4 sm:px-6">
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
            {TOOLBAR_TABS.map((x) => (
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
        <TabsContent value={tab.id} className="flex flex-wrap gap-1 pt-2 pb-2.5" aria-label={tab[language]}>
          {buttons.map((button) => (
            <Tooltip key={button.latex + button.display}>
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
          ))}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
