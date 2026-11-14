/**
 * The Chemistry toolbar. Chemistry buttons type mhchem code into the
 * chemistry formula the cursor is in (or start a new one): "->" is an
 * arrow, "(aq)" a state symbol, "^2+" a charge, " ^" a gas (↑), " v" a
 * precipitate (↓). Math tabs are there too, for calculations.
 */
import { mathTab, mathTabsExcept } from "../math/toolbar";
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
    ce("O2", "ჟანგბადი", "oxygen"),
    ce("H2", "წყალბადი", "hydrogen"),
    ce("Ca(OH)2", "კალციუმის ჰიდროქსიდი", "calcium hydroxide"),
    ce("KMnO4", "კალიუმის პერმანგანატი", "potassium permanganate"),
    ce("CuSO4", "სპილენძის (II) სულფატი", "copper(II) sulfate"),
    ce("CH4", "მეთანი", "methane"),
    ce("C2H5OH", "ეთანოლი", "ethanol"),
    ce("H+", "წყალბადის იონი", "hydrogen ion", { group: { ka: "ხშირი იონები:", en: "Common ions:" } }),
    ce("OH-", "ჰიდროქსიდ-იონი", "hydroxide ion"),
    ce("SO4^2-", "სულფატ-იონი", "sulfate ion"),
    ce("NO3-", "ნიტრატ-იონი", "nitrate ion"),
    ce("CO3^2-", "კარბონატ-იონი", "carbonate ion"),
    ce("PO4^3-", "ფოსფატ-იონი", "phosphate ion"),
    ce("NH4+", "ამონიუმის იონი", "ammonium ion"),
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
    ce(" ->[\\text{ელ. დენი}] ", "ელექტროლიზი (ელექტრული დენით)", "electrolysis (electric current)", { show: "->[\\text{ელ. დენი}]" }),
    ce(" + Q", "სითბო გამოიყოფა (ეგზოთერმული)", "heat is given off (exothermic)", { show: "+ Q", group: { ka: "სითბო:", en: "Heat:" } }),
    ce(" - Q", "სითბო შთაინთქმება (ენდოთერმული)", "heat is taken in (endothermic)", { show: "- Q" }),
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

/** Whole formulas for calculation problems, inserted ready-made (math formulas, not chemistry ones). */
const calc = (latex: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({ latex, display: latex, ka, en, ...extra });
const CALC_TAB: ToolbarTab = {
  id: "chem-calc",
  ka: "გამოთვლები",
  en: "Calculations",
  buttons: [
    calc("n=\\frac{m}{M}", "ნივთიერების რაოდენობა მასით", "Amount of substance from mass", { keywords: "mol მოლი" }),
    calc("n=\\frac{V}{V_m}", "ნივთიერების რაოდენობა აირის მოცულობით", "Amount of substance from gas volume"),
    calc("n=\\frac{N}{N_A}", "ნივთიერების რაოდენობა ნაწილაკების რიცხვით", "Amount of substance from the number of particles"),
    calc("\\omega=\\frac{m_{1}}{m_{2}}\\cdot100\\%", "მასური წილი (ხსნარში, ნაერთში)", "Mass fraction (in a solution, in a compound)", { keywords: "პროცენტი percent" }),
    calc("c=\\frac{n}{V}", "მოლური კონცენტრაცია", "Molar concentration"),
    calc("\\rho=\\frac{m}{V}", "სიმკვრივე", "Density"),
    calc("\\eta=\\frac{m_{1}}{m_{2}}\\cdot100\\%", "რეაქციის პროდუქტის გამოსავლიანობა", "Yield of a reaction"),
    calc("V_m=22{,}4\\,\\text{ლ/მოლი}", "აირის მოლური მოცულობა (ნ. პ.)", "Molar volume of a gas (STP)", { group: { ka: "მუდმივები და ერთეულები:", en: "Constants & units:" } }),
    calc("N_A=6{,}02\\cdot10^{23}\\,\\text{მოლი}^{-1}", "ავოგადროს რიცხვი", "Avogadro constant"),
    calc("\\,\\text{მოლი}", "მოლი", "mole"),
    calc("\\,\\text{გ/მოლი}", "გრამი მოლზე (მოლური მასა)", "grams per mole (molar mass)"),
    calc("\\,\\text{ლ}", "ლიტრი", "litre"),
    calc("\\,\\text{გ}", "გრამი", "gram"),
    calc("M_r", "ფარდობითი მოლეკულური მასა", "Relative molecular mass"),
    calc("A_r", "ფარდობითი ატომური მასა", "Relative atomic mass"),
  ],
};

const SHOWN_MATH = ["basic", "algebra", "greek"];

/** Chemistry first; then calculations (n = m/M, percentages…) and some math. Other math symbols are found by the search. */
export const CHEMISTRY_TOOLBAR: ToolbarTab[] = [FORMULAS_TAB, REACTIONS_TAB, REDOX_TAB, CALC_TAB, ...SHOWN_MATH.map(mathTab)];
export const CHEMISTRY_SEARCH_EXTRA: ToolbarTab[] = mathTabsExcept(...SHOWN_MATH);
