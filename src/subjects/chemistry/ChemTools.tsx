"use client";

import { convertLatexToMarkup } from "mathlive";
import { Table2 } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import type { ToolbarWidgetProps } from "../types";
import { ELEMENTS, type ElementKind } from "./elements";

const keepFocus = (event: MouseEvent) => event.preventDefault();
const toolButton =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:border-primary-soft-border hover:bg-primary-soft disabled:opacity-40 pointer-coarse:h-11";
const smallInput = "h-8 rounded-md border border-input bg-card px-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Cell colours by kind (tokens, so dark mode works). */
const KIND_CLASS: Record<ElementKind, string> = {
  m: "bg-muted",
  n: "bg-success-soft",
  d: "bg-warning-soft",
  g: "bg-primary-soft",
  f: "bg-muted/60 border-dashed",
};

/**
 * "Periodic table" button → a window with all elements. Clicking one types
 * its symbol into the chemical formula (or starts a new formula).
 */
export function PeriodicTableTool({ insertChem }: ToolbarWidgetProps) {
  const t = useT();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const pending = useRef<string | null>(null);

  function pick(symbol: string) {
    pending.current = symbol;
    setOpen(false); // the symbol is typed once the window has closed (see below)
  }

  return (
    <>
      <button type="button" className={cn(toolButton, "mr-1.5")} onMouseDown={keepFocus} onClick={() => setOpen(true)} data-periodic-open="">
        <Table2 className="size-4 text-brand" aria-hidden="true" />
        {t("chem.periodicTable")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          closeLabel={t("dialog.close")}
          className="sm:max-w-5xl"
          data-keep-editing=""
          data-periodic-table=""
          // Don't move the focus back to the button: type the element into the formula instead.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const symbol = pending.current;
            pending.current = null;
            if (symbol) requestAnimationFrame(() => insertChem(symbol));
          }}
        >
          <div>
            <DialogTitle>{t("chem.periodicTable")}</DialogTitle>
            <DialogDescription>{t("chem.periodicHint")}</DialogDescription>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[46rem] gap-0.5" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }}>
              {ELEMENTS.map((element) => (
                <button
                  key={element.number}
                  type="button"
                  onClick={() => pick(element.symbol)}
                  title={`${element.number}. ${element[language]}`}
                  aria-label={`${element.symbol} — ${element[language]}`}
                  data-element={element.symbol}
                  className={cn(
                    "flex aspect-square min-w-0 flex-col items-center justify-center rounded border border-transparent leading-none text-foreground transition-colors hover:border-ring hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    KIND_CLASS[element.kind],
                  )}
                  style={{ gridRow: element.row + (element.row >= 8 ? 1 : 0), gridColumn: element.column }}
                >
                  <span className="text-[0.55rem] text-muted-foreground">{element.number}</span>
                  <span className="text-[0.95rem] font-bold">{element.symbol}</span>
                  <span className="w-full truncate px-px text-center text-[0.5rem] text-muted-foreground">{element[language]}</span>
                </button>
              ))}
              {/* Gaps where the lanthanides / actinides belong, and a spacer row above them */}
              <span className="flex items-center justify-center text-[0.6rem] text-muted-foreground" style={{ gridRow: 6, gridColumn: 3 }}>
                57–71
              </span>
              <span className="flex items-center justify-center text-[0.6rem] text-muted-foreground" style={{ gridRow: 7, gridColumn: 3 }}>
                89–103
              </span>
              <span className="h-2" style={{ gridRow: 8, gridColumn: "1 / -1" }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(["m", "n", "d", "g", "f"] as const).map((kind) => (
              <span key={kind} className="inline-flex items-center gap-1.5">
                <span className={cn("size-3 rounded-sm border", KIND_CLASS[kind])} />
                {t(`chem.kind.${kind}`)}
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "→ with t° above, catalyst below": builds an arrow with conditions. */
export function ArrowTool({ insertChem }: ToolbarWidgetProps) {
  const t = useT();
  const [above, setAbove] = useState("");
  const [below, setBelow] = useState("");
  const [reversible, setReversible] = useState(false);
  // In mhchem, conditions are written ->[above][below]; words go inside \text{}.
  const part = (value: string) => (value.trim() ? `[${/^[a-zA-Z0-9^°\\{} ]*$/.test(value) ? value.trim().replace("°", "^\\circ") : `\\text{${value.trim()}}`}]` : "");
  const arrow = `${reversible ? "<=>" : "->"}${part(above) || (below.trim() ? "[]" : "")}${part(below)}`;
  return (
    <div className="mr-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2 py-1" data-arrow-tool="">
      <input className={cn(smallInput, "w-20")} value={above} onChange={(e) => setAbove(e.target.value)} placeholder="t°" aria-label={t("chem.above")} />
      <button type="button" className="h-8 rounded-md px-1.5 text-sm hover:bg-card" onMouseDown={keepFocus} onClick={() => setReversible(!reversible)} aria-pressed={reversible} title={t("chem.reversible")}>
        {reversible ? "⇌" : "→"}
      </button>
      <input className={cn(smallInput, "w-20")} value={below} onChange={(e) => setBelow(e.target.value)} placeholder={t("chem.catalystShort")} aria-label={t("chem.below")} />
      <button type="button" className={toolButton} onMouseDown={keepFocus} onClick={() => insertChem(` ${arrow} `)} title={t("chem.insertArrow")}>
        <span className="toolbar-math pointer-events-none" dangerouslySetInnerHTML={{ __html: convertLatexToMarkup(`\\ce{${arrow}}`) }} />
      </button>
    </div>
  );
}

/** Oxidation state above an element: Fe + "+3" → Fe with +3 above it. */
export function OxidationTool({ insertChem }: ToolbarWidgetProps) {
  const t = useT();
  const [element, setElement] = useState("Fe");
  const [state, setState] = useState("+3");
  const symbol = element.trim().replace(/[^A-Za-z]/g, "").slice(0, 2);
  const code = `\\overset{${state}}{${symbol}}`;
  return (
    <div className="mr-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2 py-1" data-oxidation-tool="">
      <span className="text-sm text-soft-foreground">{t("chem.oxidation")}</span>
      <input className={cn(smallInput, "w-14")} value={element} onChange={(e) => setElement(e.target.value)} aria-label={t("chem.element")} />
      <select className={cn(smallInput, "w-16")} value={state} onChange={(e) => setState(e.target.value)} aria-label={t("chem.oxidation")}>
        {["+1", "+2", "+3", "+4", "+5", "+6", "+7", "0", "-1", "-2", "-3", "-4"].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <button type="button" className={toolButton} disabled={!symbol} onMouseDown={keepFocus} onClick={() => insertChem(code)} title={t("chem.insertOxidation")}>
        <span className="toolbar-math pointer-events-none" dangerouslySetInnerHTML={{ __html: convertLatexToMarkup(`\\ce{${symbol ? code : "?"}}`) }} />
      </button>
    </div>
  );
}
