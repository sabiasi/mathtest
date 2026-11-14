/**
 * The toolbar's "find a symbol" search (pure — no React). A teacher types "ფესვი", "root", "sqrt" or "alpha" and gets the
 * matching buttons from every tab of the subject.
 */
import type { Language } from "@/i18n/dictionaries";
import { buttonKey, type SubjectToolkit, type ToolbarButton, type ToolbarTab } from "@/subjects/types";

export type IndexedButton = { key: string; button: ToolbarButton; tab: ToolbarTab };

/** Every button of a subject (all tabs, all writing styles, plus the hidden `searchExtra` tabs), each once. */
export function allButtons(toolkit: SubjectToolkit): IndexedButton[] {
  const seen = new Set<string>();
  const result: IndexedButton[] = [];
  for (const tab of [...toolkit.toolbar, ...(toolkit.searchExtra ?? [])]) {
    const sets = tab.styles ? tab.styles.options.map((o) => o.buttons) : [tab.buttons];
    for (const buttons of sets) {
      for (const button of buttons) {
        const key = buttonKey(button);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ key, button, tab });
      }
    }
  }
  return result;
}

const simplify = (text: string) => text.toLocaleLowerCase().replace(/[\\{}]/g, " ").replace(/\s+/g, " ").trim();

/** The words a button can be found by: both tooltips, its LaTeX / text, its keywords, its tab's names. */
function haystack({ button, tab }: IndexedButton): { names: string; rest: string } {
  return {
    names: simplify(`${button.ka} ${button.en} ${button.keywords ?? ""} ${button.text ?? ""} ${button.label?.ka ?? ""} ${button.label?.en ?? ""}`),
    rest: simplify(`${button.latex} ${button.chem ?? ""} ${tab.ka} ${tab.en}`),
  };
}

/**
 * The buttons matching what was typed, best first: a name that STARTS with
 * the words, then names that contain them, then the LaTeX / tab name.
 * Every typed word must be found; ties keep the toolbar's order.
 */
export function searchButtons(index: readonly IndexedButton[], query: string, language: Language, limit = 40): IndexedButton[] {
  const words = simplify(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const scored: { item: IndexedButton; score: number }[] = [];
  index.forEach((item, position) => {
    const { names, rest } = haystack(item);
    if (!words.every((w) => names.includes(w) || rest.includes(w))) return;
    const own = simplify(language === "ka" ? item.button.ka : item.button.en);
    const first = words[0];
    const score =
      (own.startsWith(first) ? 0 : names.split(" ").some((n) => n.startsWith(first)) ? 1 : names.includes(first) ? 2 : 3) +
      // Ties: the toolbar's own order — the most used symbols come first there.
      position / 100_000;
    scored.push({ item, score });
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.item);
}
