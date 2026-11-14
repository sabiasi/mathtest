"use client";

/**
 * Loads MathLive (the library behind the <math-field> formula boxes) once,
 * only in the browser.
 *
 * Why not a normal `import { MathfieldElement } from "mathlive"` at the top?
 * Next.js also runs our components on the server, where there is no browser
 * and MathLive's interactive part doesn't exist. A dynamic `import()` inside
 * a function runs only when called — and we only call it in the browser.
 */
import type { MathfieldElement } from "mathlive";
import { dictionaries, type Language } from "@/i18n/dictionaries";

let loading: Promise<void> | null = null;

export function loadMathLive(): Promise<void> {
  loading ??= import("mathlive").then(({ MathfieldElement }) => {
    // Fonts come from our own CSS (see layout.tsx), so MathLive shouldn't fetch any.
    MathfieldElement.fontsDirectory = null;
    // No click sounds.
    MathfieldElement.soundsDirectory = null;
  });
  return loading;
}

export type { MathfieldElement };

/** Function names typed as plain letters inside a formula (upright, like sin and cos). */
const GEORGIAN_SHORTCUTS = {
  tg: "\\operatorname{tg}",
  ctg: "\\operatorname{ctg}",
  arctg: "\\operatorname{arctg}",
  arcctg: "\\operatorname{arcctg}",
  lg: "\\lg",
};

/** Settings applied to every formula box we create. */
export function configureMathfield(mf: MathfieldElement) {
  // We show our own Georgian toolbar instead of MathLive's keyboard and menu.
  mf.mathVirtualKeyboardPolicy = "manual";
  // menuItems can only be set once the box is on the page ("mounted"),
  // otherwise MathLive throws "Mathfield not mounted".
  // The same goes for READING inlineShortcuts (the typing shortcuts, like
  // Word's: MathLive already turns "sqrt", "pi", "alpha", "<=", "/" … into
  // symbols; Georgian schools also write tg / ctg / lg).
  mf.addEventListener(
    "mount",
    () => {
      mf.menuItems = [];
      mf.inlineShortcuts = { ...mf.inlineShortcuts, ...GEORGIAN_SHORTCUTS };
    },
    { once: true },
  );
  // "smart" behaviours that surprise people who don't know LaTeX:
  mf.smartMode = false; // don't switch to text mode on its own
  mf.smartFence = true; // typing "(" adds the matching ")"
  // Screen readers announce this; <html lang> tells us the current language.
  const language: Language = document.documentElement.lang === "en" ? "en" : "ka";
  mf.setAttribute("aria-label", dictionaries[language]["math.formulaLabel"]);
}
