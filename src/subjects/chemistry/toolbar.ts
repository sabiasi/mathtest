/**
 * The Chemistry toolbar. Chemistry buttons type mhchem code into the
 * chemistry formula the cursor is in (or start a new one): "->" is an
 * arrow, "(aq)" a state symbol, "^2+" a charge, " ^" a gas (↑), " v" a
 * precipitate (↓). Math tabs are there too, for calculations.
 */
import { MATH_TOOLBAR } from "../math/toolbar";
import type { ToolbarButton, ToolbarTab } from "../types";
import { ArrowTool, OxidationTool, PeriodicTableTool } from "./ChemTools";

/** A chemistry button: types `code`; the button shows it drawn (or `show`). */
const ce = (code: string, ka: string, en: string, extra: Partial<ToolbarButton> & { show?: string } = {}): ToolbarButton => {
  const { show, ...rest } = extra;
  return { latex: "", display: `\\ce{${show ?? code.trim()}}`, chem: code, ka, en, ...rest };
};

const STATES = { ka: "მდგომარეობა:", en: "State:" };
const CHARGES = { ka: "იონის მუხტი:", en: "Ion charge:" };
const COMMON = { ka: "ხშირი ნივთიერებები:", en: "Common substances:" };

const FORMULAS_TAB: ToolbarTab = {
  id: "formulas",
  ka: "ფორმულები",
  en: "Formulas",
  Widget: PeriodicTableTool,
  buttons: [
    ce("(s)", "მყარი", "solid", { group: STATES }),
    ce("(l)", "თხევადი", "liquid"),
    ce("(g)", "აირი", "gas"),
    ce("(aq)", "წყალხსნარი", "aqueous solution"),
    ce(" ^", "აირი გამოიყოფა ↑", "gas given off ↑", { show: "X ^" }),
    ce(" v", "ნალექი ↓", "precipitate ↓", { show: "X v" }),
    ce("^+", "მუხტი +1", "charge +1", { group: CHARGES, show: "X^+" }),
    ce("^2+", "მუხტი +2", "charge +2", { show: "X^2+" }),
    ce("^3+", "მუხტი +3", "charge +3", { show: "X^3+" }),
    ce("^-", "მუხტი −1", "charge −1", { show: "X^-" }),
    ce("^2-", "მუხტი −2", "charge −2", { show: "X^2-" }),
    ce("^3-", "მუხტი −3", "charge −3", { show: "X^3-" }),
    ce("*", "კრისტალჰიდრატი (CuSO₄·5H₂O)", "hydrate (CuSO₄·5H₂O)", { show: "A*B" }),
    ce("H2O", "წყალი", "water", { group: COMMON }),
    ce("CO2", "ნახშირორჟანგი", "carbon dioxide"),
    ce("H2SO4", "გოგირდმჟავა", "sulfuric acid"),
    ce("HCl", "მარილმჟავა", "hydrochloric acid"),
    ce("HNO3", "აზოტმჟავა", "nitric acid"),
    ce("NaOH", "ნატრიუმის ჰიდროქსიდი", "sodium hydroxide"),
    ce("NaCl", "ნატრიუმის ქლორიდი", "sodium chloride"),
    ce("CaCO3", "კალციუმის კარბონატი", "calcium carbonate"),
    ce("NH3", "ამიაკი", "ammonia"),
  ],
};

const REACTIONS_TAB: ToolbarTab = {
  id: "reactions",
  ka: "რეაქციები",
  en: "Reactions",
  Widget: ArrowTool,
  buttons: [
    ce(" + ", "პლუსი (ნივთიერებებს შორის)", "plus (between substances)", { show: "A + B" }),
    ce(" -> ", "რეაქციის ისარი", "reaction arrow", { show: "->" }),
    ce(" <=> ", "შექცევადი რეაქცია", "reversible reaction", { show: "<=>" }),
    ce(" <- ", "უკუ ისარი", "backward arrow", { show: "<-" }),
    ce(" = ", "ტოლობის ნიშანი (ისრის ნაცვლად)", "equals sign (instead of an arrow)", { show: "=" }),
    ce(" ->[t^\\circ] ", "გახურებით (t°)", "on heating (t°)", { show: "->[t^\\circ]" }),
    ce(" ->[\\text{კატ.}] ", "კატალიზატორით", "with a catalyst", { show: "->[\\text{კატ.}]" }),
    ce(" ->[t^\\circ][\\text{კატ.}] ", "გახურება და კატალიზატორი", "heat and catalyst", { show: "->[t^\\circ][\\text{კატ.}]" }),
    ce(" ->[{h\\nu}] ", "სინათლით (hν)", "with light (hν)", { show: "->[{h\\nu}]" }),
  ],
};

const REDOX_TAB: ToolbarTab = {
  id: "redox",
  ka: "ჟანგვის ხარისხი",
  en: "Oxidation states",
  Widget: OxidationTool,
  buttons: [
    ce("e^-", "ელექტრონი", "electron"),
    ce(" + 2e^- ", "ორი ელექტრონის მიერთება", "gaining two electrons", { show: "+ 2e^-" }),
    ce(" - 2e^- ", "ორი ელექტრონის გაცემა", "losing two electrons", { show: "- 2e^-" }),
  ],
};

const mathTab = (id: string) => MATH_TOOLBAR.find((tab) => tab.id === id)!;

/** Chemistry first; then math for calculations (n = m/M, percentages…). */
export const CHEMISTRY_TOOLBAR: ToolbarTab[] = [FORMULAS_TAB, REACTIONS_TAB, REDOX_TAB, mathTab("basic"), mathTab("algebra"), mathTab("greek")];
