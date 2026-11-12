"use client";

import { convertLatexToMarkup } from "mathlive";
import { Sigma } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { useLanguage, useT } from "@/i18n/language";
import { useMathEditing } from "./MathEditingContext";
import { TOOLBAR_TABS } from "./toolbarData";

// Clicking a toolbar button must NOT move the keyboard focus away from the
// text box — otherwise we'd lose track of where the cursor was.
const keepFocus = (event: MouseEvent) => event.preventDefault();

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function MathToolbar() {
  const t = useT();
  const language = useLanguage();
  const { activeEditor, insert } = useMathEditing();
  const [tabId, setTabId] = useState(TOOLBAR_TABS[0].id);
  const tab = TOOLBAR_TABS.find((x) => x.id === tabId) ?? TOOLBAR_TABS[0];
  const disabled = activeEditor === null;

  // Turn each button's LaTeX into the HTML of a little formula (once per tab).
  const buttons = useMemo(
    () => tab.buttons.map((button) => ({ ...button, html: convertLatexToMarkup(button.display) })),
    [tab],
  );

  const shortcut = isMac() ? "⌥ =" : "Alt + =";

  return (
    <div className="border-t border-slate-100" role="toolbar" aria-label={t("math.toolbarLabel")}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => insert("")}
            disabled={disabled}
            title={`${t("math.insertTooltip")} (${shortcut})`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
          >
            <Sigma className="size-4" aria-hidden="true" />
            {t("math.insert")}
            <kbd className="rounded bg-indigo-500 px-1.5 py-0.5 font-sans text-xs font-medium">{shortcut}</kbd>
          </button>
          {disabled && <p className="text-xs text-slate-500">{t("math.toolbarHint")}</p>}
        </div>

        {/* Tabs (scroll sideways on phones, wrap on bigger screens) */}
        <div className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" role="tablist">
          {TOOLBAR_TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={x.id === tab.id}
              onMouseDown={keepFocus}
              onClick={() => setTabId(x.id)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
                x.id === tab.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {x[language]}
            </button>
          ))}
        </div>

        {/* Buttons of the chosen tab */}
        <div className="flex flex-wrap gap-1 pt-1 pb-2.5" role="tabpanel" aria-label={tab[language]}>
          {buttons.map((button) => (
            <button
              key={button.latex + button.display}
              type="button"
              onMouseDown={keepFocus}
              onClick={() => insert(button.latex)}
              disabled={disabled}
              aria-label={button[language]}
              className="group relative flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40"
            >
              <span className="toolbar-math pointer-events-none" dangerouslySetInnerHTML={{ __html: button.html }} />
              {/* Tooltip: appears on hover / keyboard focus */}
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-1/2 z-40 mt-1.5 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity delay-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {button[language]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
