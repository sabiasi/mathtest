/**
 * The Physics toolkit's toolbar: everything from math, plus physics tabs.
 * Plain data, like math/toolbar.ts (see the markers #? and #@ there).
 *
 * Units come in two styles the teacher can switch between: Latin SI letters
 * (m/s, N) or Georgian school letters (მ/წმ, ნ). Words inside formulas are
 * written with \text{…}; numbers use a comma for decimals, as in Georgia.
 */
import { mathTab, mathTabsExcept } from "../math/toolbar";
import type { ToolbarButton, ToolbarTab } from "../types";

const b = (latex: string, display: string, ka: string, en: string): ToolbarButton => ({ latex, display, ka, en });
/** Inserted exactly as shown. */
const sym = (latex: string, ka: string, en: string) => b(latex, latex, ka, en);
/** A unit: a thin space first, so "20" + "m/s" becomes "20 m/s". */
const unit = (latex: string, ka: string, en: string) => b(`\\,${latex}`, latex, ka, en);
/** Georgian unit letters (written as text inside the formula). */
const geo = (letters: string, ka: string, en: string, power = "") => unit(`\\text{${letters}}${power}`, ka, en);

const SQ = "\\square";

const LATIN_UNITS: ToolbarButton[] = [
  unit("\\mathrm{m}", "მეტრი", "metre"),
  unit("\\mathrm{kg}", "კილოგრამი", "kilogram"),
  unit("\\mathrm{s}", "წამი", "second"),
  unit("\\mathrm{m/s}", "მეტრი წამში (სიჩქარე)", "metres per second (speed)"),
  unit("\\mathrm{km/h}", "კილომეტრი საათში", "kilometres per hour"),
  unit("\\mathrm{m/s^2}", "მეტრი წამის კვადრატში (აჩქარება)", "metres per second squared (acceleration)"),
  unit("\\mathrm{N}", "ნიუტონი (ძალა)", "newton (force)"),
  unit("\\mathrm{J}", "ჯოული (ენერგია, მუშაობა)", "joule (energy, work)"),
  unit("\\mathrm{W}", "ვატი (სიმძლავრე)", "watt (power)"),
  unit("\\mathrm{Pa}", "პასკალი (წნევა)", "pascal (pressure)"),
  unit("\\mathrm{kg/m^3}", "კილოგრამი კუბურ მეტრზე (სიმკვრივე)", "kilograms per cubic metre (density)"),
  unit("\\Omega", "ომი (წინაღობა)", "ohm (resistance)"),
  unit("\\mathrm{V}", "ვოლტი (ძაბვა)", "volt (voltage)"),
  unit("\\mathrm{A}", "ამპერი (დენის ძალა)", "ampere (current)"),
  unit("\\mathrm{C}", "კულონი (მუხტი)", "coulomb (charge)"),
  unit("\\mathrm{Hz}", "ჰერცი (სიხშირე)", "hertz (frequency)"),
  unit("{}^{\\circ}\\mathrm{C}", "გრადუსი ცელსიუსი", "degree Celsius"),
  unit("\\mathrm{K}", "კელვინი", "kelvin"),
  unit("\\mathrm{eV}", "ელექტრონვოლტი", "electronvolt"),
  unit("\\mathrm{g}", "გრამი", "gram"),
  unit("\\mathrm{cm}", "სანტიმეტრი", "centimetre"),
  unit("\\mathrm{km}", "კილომეტრი", "kilometre"),
  unit("\\mathrm{min}", "წუთი", "minute"),
  unit("\\mathrm{h}", "საათი", "hour"),
  unit("\\mathrm{L}", "ლიტრი", "litre"),
  unit("\\mathrm{mol}", "მოლი (ნივთიერების რაოდენობა)", "mole (amount of substance)"),
  unit("\\mathrm{T}", "ტესლა (მაგნიტური ინდუქცია)", "tesla (magnetic field)"),
  unit("\\mathrm{F}", "ფარადი (ტევადობა)", "farad (capacitance)"),
  unit("\\mathrm{kW{\\cdot}h}", "კილოვატსაათი", "kilowatt-hour"),
];

const PREFIXES_GROUP = { ka: "თავსართები:", en: "Prefixes:" };

const LATIN_PREFIXES: ToolbarButton[] = [
  { ...sym("\\mathrm{n}", "ნანო = 10⁻⁹", "nano = 10⁻⁹"), group: PREFIXES_GROUP },
  sym("\\mu", "მიკრო = 10⁻⁶", "micro = 10⁻⁶"),
  sym("\\mathrm{m}", "მილი = 10⁻³", "milli = 10⁻³"),
  sym("\\mathrm{k}", "კილო = 10³", "kilo = 10³"),
  sym("\\mathrm{M}", "მეგა = 10⁶", "mega = 10⁶"),
];

const GEORGIAN_UNITS: ToolbarButton[] = [
  geo("მ", "მეტრი", "metre"),
  geo("კგ", "კილოგრამი", "kilogram"),
  geo("წმ", "წამი", "second"),
  geo("მ/წმ", "მეტრი წამში (სიჩქარე)", "metres per second (speed)"),
  geo("კმ/სთ", "კილომეტრი საათში", "kilometres per hour"),
  geo("მ/წმ", "მეტრი წამის კვადრატში (აჩქარება)", "metres per second squared (acceleration)", "^2"),
  geo("ნ", "ნიუტონი (ძალა)", "newton (force)"),
  geo("ჯ", "ჯოული (ენერგია, მუშაობა)", "joule (energy, work)"),
  geo("ვტ", "ვატი (სიმძლავრე)", "watt (power)"),
  geo("პა", "პასკალი (წნევა)", "pascal (pressure)"),
  geo("კგ/მ", "კილოგრამი კუბურ მეტრზე (სიმკვრივე)", "kilograms per cubic metre (density)", "^3"),
  geo("ომი", "ომი (წინაღობა)", "ohm (resistance)"),
  geo("ვ", "ვოლტი (ძაბვა)", "volt (voltage)"),
  geo("ა", "ამპერი (დენის ძალა)", "ampere (current)"),
  geo("კ", "კულონი (მუხტი)", "coulomb (charge)"),
  geo("ჰც", "ჰერცი (სიხშირე)", "hertz (frequency)"),
  unit("{}^{\\circ}\\mathrm{C}", "გრადუსი ცელსიუსი", "degree Celsius"),
  unit("\\mathrm{K}", "კელვინი", "kelvin"),
  geo("ევ", "ელექტრონვოლტი", "electronvolt"),
  geo("გ", "გრამი", "gram"),
  geo("სმ", "სანტიმეტრი", "centimetre"),
  geo("კმ", "კილომეტრი", "kilometre"),
  geo("წთ", "წუთი", "minute"),
  geo("სთ", "საათი", "hour"),
  geo("ლ", "ლიტრი", "litre"),
  geo("მოლი", "მოლი (ნივთიერების რაოდენობა)", "mole (amount of substance)"),
  geo("ტლ", "ტესლა (მაგნიტური ინდუქცია)", "tesla (magnetic field)"),
  geo("ფ", "ფარადი (ტევადობა)", "farad (capacitance)"),
  geo("კვტ·სთ", "კილოვატსაათი", "kilowatt-hour"),
];

const GEORGIAN_PREFIXES: ToolbarButton[] = [
  { ...sym("\\text{ნ}", "ნანო = 10⁻⁹", "nano = 10⁻⁹"), group: PREFIXES_GROUP },
  sym("\\text{მკ}", "მიკრო = 10⁻⁶", "micro = 10⁻⁶"),
  sym("\\text{მ}", "მილი = 10⁻³", "milli = 10⁻³"),
  sym("\\text{კ}", "კილო = 10³", "kilo = 10³"),
  sym("\\text{მგ}", "მეგა = 10⁶", "mega = 10⁶"),
];

const UNITS_TAB: ToolbarTab = {
  id: "units",
  ka: "ერთეულები",
  en: "Units",
  buttons: [...LATIN_UNITS, ...LATIN_PREFIXES],
  styles: {
    storageKey: "mathtest:unit-style",
    options: [
      { id: "latin", ka: "Latin (m/s)", en: "Latin (m/s)", buttons: [...LATIN_UNITS, ...LATIN_PREFIXES] },
      { id: "georgian", ka: "ქართული (მ/წმ)", en: "Georgian (მ/წმ)", buttons: [...GEORGIAN_UNITS, ...GEORGIAN_PREFIXES] },
    ],
  },
};

const VECTORS_TAB: ToolbarTab = {
  id: "vectors",
  ka: "ვექტორები, Δ, 10ⁿ",
  en: "Vectors, Δ, 10ⁿ",
  buttons: [
    b("\\vec{#@}", `\\vec{${SQ}}`, "ვექტორი (ისარი ასოს ზემოთ)", "Vector (arrow over a letter)"),
    b("\\overrightarrow{#@}", `\\overrightarrow{AB}`, "ვექტორი ორი ასოთი", "Vector between two points"),
    b("\\left|\\vec{#@}\\right|", `|\\vec{v}|`, "ვექტორის მოდული (სიგრძე)", "Length of a vector"),
    b("#@_{#?}", `${SQ}_{${SQ}}`, "ქვედა ინდექსი (v₀, F₁, vₓ)", "Subscript (v₀, F₁, vₓ)"),
    sym("\\Delta", "დელტა: ცვლილება (Δt, Δx)", "Delta: change (Δt, Δx)"),
    sym("\\Delta t", "დროის ცვლილება", "Change in time"),
    sym("\\Delta x", "კოორდინატის ცვლილება", "Change in position"),
    sym("\\Delta v", "სიჩქარის ცვლილება", "Change in speed"),
    b("#?\\times10^{#?}", `a\\times10^{n}`, "რიცხვის სტანდარტული ჩანაწერი: a × 10ⁿ", "Scientific notation: a × 10ⁿ"),
    b("10^{#?}", `10^{n}`, "ათის ხარისხი", "Power of ten"),
    sym("\\propto", "პროპორციულია", "Proportional to"),
    sym("\\Rightarrow", "გამომდინარეობს", "Therefore / implies"),
    sym("\\uparrow\\downarrow", "საპირისპიროდ მიმართული", "Opposite directions"),
  ],
};

/** Inserts only the letter; the tooltip says what it is and its value. */
const CONSTANTS_TAB: ToolbarTab = {
  id: "constants",
  ka: "მუდმივები",
  en: "Constants",
  buttons: [
    sym("g", "თავისუფალი ვარდნის აჩქარება: g ≈ 9,8 მ/წმ² (ხშირად 10 მ/წმ²)", "Gravitational acceleration: g ≈ 9.8 m/s² (often 10 m/s²)"),
    sym("c", "სინათლის სიჩქარე ვაკუუმში: c = 3 · 10⁸ მ/წმ", "Speed of light in vacuum: c = 3 · 10⁸ m/s"),
    sym("G", "გრავიტაციული მუდმივა: G ≈ 6,67 · 10⁻¹¹ ნ·მ²/კგ²", "Gravitational constant: G ≈ 6.67 · 10⁻¹¹ N·m²/kg²"),
    sym("h", "პლანკის მუდმივა: h ≈ 6,63 · 10⁻³⁴ ჯ·წმ", "Planck constant: h ≈ 6.63 · 10⁻³⁴ J·s"),
    sym("k", "კულონის კანონის კოეფიციენტი: k = 9 · 10⁹ ნ·მ²/კ²", "Coulomb constant: k = 9 · 10⁹ N·m²/C²"),
    sym("k_{\\mathrm{B}}", "ბოლცმანის მუდმივა: k ≈ 1,38 · 10⁻²³ ჯ/K", "Boltzmann constant: k ≈ 1.38 · 10⁻²³ J/K"),
    sym("e", "ელემენტარული მუხტი: e ≈ 1,6 · 10⁻¹⁹ კ", "Elementary charge: e ≈ 1.6 · 10⁻¹⁹ C"),
    sym("m_{e}", "ელექტრონის მასა: mₑ ≈ 9,1 · 10⁻³¹ კგ", "Electron mass: mₑ ≈ 9.1 · 10⁻³¹ kg"),
    sym("N_{A}", "ავოგადროს რიცხვი: N_A ≈ 6,02 · 10²³ მოლ⁻¹", "Avogadro constant: N_A ≈ 6.02 · 10²³ mol⁻¹"),
    sym("R", "აირის უნივერსალური მუდმივა: R ≈ 8,31 ჯ/(მოლ·K)", "Gas constant: R ≈ 8.31 J/(mol·K)"),
    sym("\\varepsilon_{0}", "ელექტრული მუდმივა: ε₀ ≈ 8,85 · 10⁻¹² კ²/(ნ·მ²)", "Electric constant: ε₀ ≈ 8.85 · 10⁻¹² C²/(N·m²)"),
    sym("\\mu_{0}", "მაგნიტური მუდმივა: μ₀ = 4π · 10⁻⁷ ნ/ა²", "Magnetic constant: μ₀ = 4π · 10⁻⁷ N/A²"),
    sym("m_{p}", "პროტონის მასა: mₚ ≈ 1,67 · 10⁻²⁷ კგ", "Proton mass: mₚ ≈ 1.67 · 10⁻²⁷ kg"),
    sym("p_{0}", "ნორმალური ატმოსფერული წნევა: p₀ ≈ 101 325 პა (760 მმ ვწყ. სვ.)", "Standard atmospheric pressure: p₀ ≈ 101 325 Pa (760 mmHg)"),
  ],
};

/** Whole formulas, inserted ready-made (the teacher can still change them). */
const formula = (latex: string, ka: string, en: string) => b(latex, latex, ka, en);
const FORMULAS_TAB: ToolbarTab = {
  id: "formulas",
  ka: "ფორმულები",
  en: "Formulas",
  buttons: [
    formula("v=\\frac{s}{t}", "სიჩქარე", "Speed"),
    formula("a=\\frac{\\Delta v}{\\Delta t}", "აჩქარება", "Acceleration"),
    formula("v=v_0+at", "სიჩქარე თანაბრადაჩქარებული მოძრაობისას", "Speed with constant acceleration"),
    formula("s=v_0t+\\frac{at^2}{2}", "გავლილი მანძილი თანაბრადაჩქარებული მოძრაობისას", "Distance with constant acceleration"),
    formula("F=ma", "ნიუტონის მეორე კანონი", "Newton's second law"),
    formula("F=k\\Delta l", "ჰუკის კანონი", "Hooke's law"),
    formula("F=G\\frac{m_1m_2}{r^2}", "მსოფლიო მიზიდულობის კანონი", "Law of gravitation"),
    formula("p=mv", "იმპულსი", "Momentum"),
    formula("A=Fs", "მექანიკური მუშაობა", "Work"),
    formula("P=\\frac{A}{t}", "სიმძლავრე", "Power"),
    formula("E_k=\\frac{mv^2}{2}", "კინეტიკური ენერგია", "Kinetic energy"),
    formula("E_p=mgh", "პოტენციური ენერგია", "Potential energy"),
    formula("\\rho=\\frac{m}{V}", "სიმკვრივე", "Density"),
    formula("p=\\frac{F}{S}", "წნევა", "Pressure"),
    formula("p=\\rho gh", "სითხის წნევა სიღრმეზე", "Pressure in a liquid"),
    formula("F_A=\\rho gV", "არქიმედეს ძალა", "Buoyant force (Archimedes)"),
    formula("Q=cm\\Delta t", "სითბოს რაოდენობა", "Heat"),
    formula("pV=\\frac{m}{M}RT", "იდეალური აირის მდგომარეობის განტოლება", "Ideal gas law"),
    formula("F=k\\frac{q_1q_2}{r^2}", "კულონის კანონი", "Coulomb's law"),
    formula("I=\\frac{U}{R}", "ომის კანონი წრედის უბნისთვის", "Ohm's law"),
    formula("R=R_1+R_2", "მიმდევრობით შეერთება", "Resistors in series"),
    formula("\\frac{1}{R}=\\frac{1}{R_1}+\\frac{1}{R_2}", "პარალელური შეერთება", "Resistors in parallel"),
    formula("P=UI", "დენის სიმძლავრე", "Electric power"),
    formula("Q=I^2Rt", "ჯოულ-ლენცის კანონი", "Joule's law of heating"),
    formula("T=2\\pi\\sqrt{\\frac{l}{g}}", "მათემატიკური ქანქარის რხევის პერიოდი", "Period of a pendulum"),
    formula("a=\\frac{v^2}{R}", "ცენტრისკენული აჩქარება", "Centripetal acceleration"),
    formula("F=\\mu N", "ხახუნის ძალა", "Friction force"),
    formula("M=Fl", "ძალის მომენტი", "Moment of a force"),
    formula("\\eta=\\frac{A_1}{A_2}\\cdot100\\%", "მარგი ქმედების კოეფიციენტი (მქკ)", "Efficiency"),
    formula("I=\\frac{q}{t}", "დენის ძალა", "Electric current"),
    formula("U=\\frac{A}{q}", "ძაბვა", "Voltage"),
    formula("R=\\rho\\frac{l}{S}", "გამტარის წინაღობა", "Resistance of a wire"),
    formula("F=BIl\\sin\\alpha", "ამპერის ძალა", "Force on a current (Ampère)"),
    formula("\\nu=\\frac{1}{T}", "სიხშირე და პერიოდი", "Frequency and period"),
    formula("\\lambda=vT", "ტალღის სიგრძე", "Wavelength"),
    formula("n=\\frac{c}{v}", "გარდატეხის მაჩვენებელი", "Refractive index"),
    formula("\\frac{\\sin\\alpha}{\\sin\\beta}=n", "სინათლის გარდატეხის კანონი", "Law of refraction"),
    formula("\\frac{1}{F}=\\frac{1}{d}+\\frac{1}{f}", "თხელი ლინზის ფორმულა", "Thin lens formula"),
    formula("E=h\\nu", "ფოტონის ენერგია", "Photon energy"),
    formula("E=mc^2", "მასისა და ენერგიის კავშირი", "Mass–energy equivalence"),
  ],
};

/** The math tabs a physics teacher uses most; the rest (brackets, matrices, sets, arrows) are found by the search. */
const SHOWN_MATH = ["algebra", "trig", "calculus", "geometry", "greek"];

/** Basic first (as in math), then the physics tabs, then the rest of math. */
export const PHYSICS_TOOLBAR: ToolbarTab[] = [mathTab("basic"), UNITS_TAB, VECTORS_TAB, CONSTANTS_TAB, FORMULAS_TAB, ...SHOWN_MATH.map(mathTab)];
export const PHYSICS_SEARCH_EXTRA: ToolbarTab[] = mathTabsExcept("basic", ...SHOWN_MATH);
