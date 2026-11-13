/**
 * The Biology toolbar: symbols (♂ ♀ → ⇌), units (Latin "μm" or Georgian
 * "მკმ", remembered), the magnification formula, a Latin-name tool
 * (italics), and chemical formulas (photosynthesis, respiration…) typed
 * into chemistry formulas like in the chemistry toolkit. Plus the basic
 * math tab for calculations.
 */
import { MATH_TOOLBAR } from "../math/toolbar";
import type { ToolbarButton, ToolbarTab } from "../types";
import { LatinNameTool } from "./BioTools";

const text = (value: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({ latex: "", display: value, text: value, ka, en, ...extra });
const math = (latex: string, display: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({ latex, display, ka, en, ...extra });
/** Chemistry: types `code` (mhchem) into a chemistry formula; the button shows `display` (LaTeX). */
const ce = (code: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({
  latex: "",
  display: `\\ce{${code.trim()}}`,
  chem: code,
  ka,
  en,
  ...extra,
});

const SYMBOLS = { ka: "სიმბოლოები:", en: "Symbols:" };
const UNITS = { ka: "ერთეულები:", en: "Units:" };
const FORMULAS = { ka: "ფორმულები:", en: "Formulas:" };

function biologyButtons(units: [string, string, string][]): ToolbarButton[] {
  return [
    text("♂", "მამრობითი", "male", { group: SYMBOLS }),
    text("♀", "მდედრობითი", "female"),
    math("\\rightarrow", "\\rightarrow", "ისარი (გადასვლა, ენერგიის მიმართულება)", "arrow"),
    math("\\rightleftharpoons", "\\rightleftharpoons", "შექცევადი პროცესი", "reversible process"),
    text("×", "გამრავლება / შეჯვარება (Aa × Aa)", "times / cross (Aa × Aa)"),
    text("%", "პროცენტი", "percent"),
    ...units.map(([value, ka, en], i) => text(value, ka, en, i === 0 ? { group: UNITS } : {})),
    math(
      "\\text{გადიდება}=\\frac{\\text{გამოსახულების ზომა}}{\\text{რეალური ზომა}}",
      "\\text{გად.}=\\frac{\\text{გამოს.}}{\\text{რეალ.}}",
      "გადიდება = გამოსახულების ზომა / რეალური ზომა",
      "magnification = image size / actual size",
      { group: FORMULAS },
    ),
    math("M=\\frac{I}{A}", "M=\\frac{I}{A}", "გადიდება: M = I / A (I — გამოსახულება, A — რეალური ზომა)", "magnification: M = I / A"),
    math("\\frac{#?}{#?}\\cdot 100\\%", "\\frac{a}{b}\\cdot 100\\%", "პროცენტის გამოთვლა", "working out a percentage"),
  ];
}

const LATIN_BUTTONS = biologyButtons([
  ["μm", "მიკრომეტრი", "micrometre"],
  ["nm", "ნანომეტრი", "nanometre"],
  ["mm", "მილიმეტრი", "millimetre"],
  ["cm", "სანტიმეტრი", "centimetre"],
]);

const BIOLOGY_TAB: ToolbarTab = {
  id: "biology",
  ka: "ბიოლოგია",
  en: "Biology",
  Widget: LatinNameTool,
  buttons: LATIN_BUTTONS,
  styles: {
    storageKey: "mathtest:bio-units",
    options: [
      { id: "latin", ka: "μm", en: "μm", buttons: LATIN_BUTTONS },
      {
        id: "georgian",
        ka: "მკმ",
        en: "მკმ",
        buttons: biologyButtons([
          ["მკმ", "მიკრომეტრი", "micrometre"],
          ["ნმ", "ნანომეტრი", "nanometre"],
          ["მმ", "მილიმეტრი", "millimetre"],
          ["სმ", "სანტიმეტრი", "centimetre"],
        ]),
      },
    ],
  },
};

const SUBSTANCES = { ka: "ნივთიერებები:", en: "Substances:" };
const EQUATIONS = { ka: "განტოლებები:", en: "Equations:" };

const CHEMISTRY_TAB: ToolbarTab = {
  id: "bio-chemistry",
  ka: "ქიმიური ფორმულები",
  en: "Chemical formulas",
  buttons: [
    ce("H2O", "წყალი", "water", { group: SUBSTANCES }),
    ce("CO2", "ნახშირორჟანგი", "carbon dioxide"),
    ce("O2", "ჟანგბადი", "oxygen"),
    ce("N2", "აზოტი", "nitrogen"),
    ce("C6H12O6", "გლუკოზა", "glucose"),
    ce("ATP", "ატფ (ადენოზინტრიფოსფატი)", "ATP"),
    ce("ADP", "ადფ (ადენოზინდიფოსფატი)", "ADP"),
    ce(" + ", "პლუსი (ნივთიერებებს შორის)", "plus (between substances)", { display: "\\ce{A + B}" }),
    ce(" -> ", "ისარი", "arrow"),
    ce(" <=> ", "შექცევადი რეაქცია", "reversible reaction"),
    ce("6CO2 + 6H2O ->[{სინათლე}][{ქლოროფილი}] C6H12O6 + 6O2", "ფოტოსინთეზის განტოლება", "photosynthesis equation", {
      group: EQUATIONS,
      display: "\\text{ფოტოსინთეზი}",
    }),
    ce("C6H12O6 + 6O2 -> 6CO2 + 6H2O", "უჯრედული სუნთქვის განტოლება", "respiration equation", { display: "\\text{სუნთქვა}" }),
    ce("ADP + P -> ATP", "ატფ-ის წარმოქმნა", "making ATP", { display: "\\text{ატფ-ის სინთეზი}" }),
  ],
};

const mathTab = (id: string) => MATH_TOOLBAR.find((tab) => tab.id === id)!;

export const BIOLOGY_TOOLBAR: ToolbarTab[] = [BIOLOGY_TAB, CHEMISTRY_TAB, mathTab("basic")];
