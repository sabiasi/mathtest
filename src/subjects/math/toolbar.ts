/**
 * The Mathematics toolkit's toolbar, as plain data.
 *
 * The toolbar component (features/editor/SubjectToolbar.tsx) just loops over
 * this list, so adding a button is adding one line here — no other code
 * changes needed.
 *
 *   latex    what gets inserted. Special MathLive markers:
 *              #?  an empty box the teacher clicks into and fills in
 *              #@  "whatever is selected" (or an empty box if nothing is),
 *                  so selecting 2x and clicking √ gives √(2x)
 *   display  what the button shows (\square draws an empty box)
 *   ka / en  the tooltip, in Georgian and English
 *
 * Note: Georgian schools write tg / ctg (not tan / cot), so we use those.
 */

import type { ToolbarButton, ToolbarTab } from "../types";

const b = (latex: string, display: string, ka: string, en: string): ToolbarButton => ({ latex, display, ka, en });
/** A simple symbol: inserted exactly as shown. */
const sym = (latex: string, ka: string, en: string) => b(latex, latex, ka, en);

const SQ = "\\square";

export const MATH_TOOLBAR: ToolbarTab[] = [
  {
    id: "basic",
    ka: "ძირითადი",
    en: "Basic",
    buttons: [
      sym("+", "პლუსი (მიმატება)", "Plus"),
      sym("-", "მინუსი (გამოკლება)", "Minus"),
      sym("\\times", "გამრავლება", "Multiply"),
      sym("\\cdot", "გამრავლება (წერტილი)", "Multiply (dot)"),
      sym("\\div", "გაყოფა", "Divide"),
      sym(":", "გაყოფა (ორწერტილი)", "Divide (colon)"),
      sym("=", "ტოლია", "Equals"),
      sym("\\neq", "არ არის ტოლი", "Not equal"),
      sym("\\pm", "პლუს-მინუს", "Plus-minus"),
      b("\\left(#@\\right)", `(${SQ})`, "ფრჩხილები", "Parentheses"),
      b("\\frac{#@}{#?}", `\\frac{${SQ}}{${SQ}}`, "წილადი", "Fraction"),
      b("^{#?}", `${SQ}^{${SQ}}`, "ხარისხი", "Power"),
      b("\\sqrt{#@}", `\\sqrt{${SQ}}`, "კვადრატული ფესვი", "Square root"),
      b("\\sqrt[#?]{#@}", `\\sqrt[n]{${SQ}}`, "n-ური ხარისხის ფესვი", "n-th root"),
      b("\\left|#@\\right|", `|${SQ}|`, "მოდული (აბსოლუტური მნიშვნელობა)", "Absolute value"),
      sym("\\%", "პროცენტი", "Percent"),
    ],
  },
  {
    id: "algebra",
    ka: "ალგებრა",
    en: "Algebra",
    buttons: [
      sym("<", "ნაკლებია", "Less than"),
      sym(">", "მეტია", "Greater than"),
      sym("\\le", "ნაკლებია ან ტოლი", "Less than or equal"),
      sym("\\ge", "მეტია ან ტოლი", "Greater than or equal"),
      sym("\\approx", "დაახლოებით ტოლია", "Approximately equal"),
      b("^2", "x^2", "კვადრატში (x²)", "Squared (x²)"),
      b("^3", "x^3", "კუბში (x³)", "Cubed (x³)"),
      b("^{#?}", "x^n", "ხარისხი (xⁿ)", "Power (xⁿ)"),
      b("_{#?}", "x_n", "ქვედა ინდექსი (x₁, aₙ)", "Subscript (x₁, aₙ)"),
      b("\\begin{cases}#?\\\\#?\\end{cases}", `\\begin{cases}${SQ}\\\\${SQ}\\end{cases}`, "სისტემა (2 განტოლება)", "System (2 equations)"),
      b(
        "\\begin{cases}#?\\\\#?\\\\#?\\end{cases}",
        `\\begin{cases}${SQ}\\\\${SQ}\\\\${SQ}\\end{cases}`,
        "სისტემა (3 განტოლება)",
        "System (3 equations)",
      ),
      b("\\left(#?;#?\\right)", "(a;b)", "ინტერვალი", "Open interval"),
      b("\\left[#?;#?\\right]", "[a;b]", "მონაკვეთი (ჩაკეტილი შუალედი)", "Closed interval"),
      sym("\\infty", "უსასრულობა", "Infinity"),
      sym("\\Rightarrow", "აქედან გამომდინარეობს", "Implies"),
      sym("\\Leftrightarrow", "ტოლფასია", "Equivalent"),
    ],
  },
  {
    id: "trig",
    ka: "ტრიგონომეტრია",
    en: "Trigonometry",
    buttons: [
      sym("\\sin", "სინუსი", "Sine"),
      sym("\\cos", "კოსინუსი", "Cosine"),
      sym("\\operatorname{tg}", "ტანგენსი (tg)", "Tangent (tg)"),
      sym("\\operatorname{ctg}", "კოტანგენსი (ctg)", "Cotangent (ctg)"),
      sym("\\arcsin", "არკსინუსი", "Arcsine"),
      sym("\\arccos", "არკკოსინუსი", "Arccosine"),
      sym("\\operatorname{arctg}", "არკტანგენსი", "Arctangent"),
      sym("\\operatorname{arcctg}", "არკკოტანგენსი", "Arccotangent"),
      b("\\sin^2", "\\sin^2", "სინუსის კვადრატი", "Sine squared"),
      b("\\cos^2", "\\cos^2", "კოსინუსის კვადრატი", "Cosine squared"),
      b("^{\\circ}", `${SQ}^{\\circ}`, "გრადუსი (°)", "Degrees (°)"),
      sym("\\pi", "პი", "Pi"),
    ],
  },
  {
    id: "calculus",
    ka: "ფუნქციები და ანალიზი",
    en: "Functions & calculus",
    buttons: [
      b("\\log_{#?}#?", "\\log_a b", "ლოგარითმი a ფუძით", "Logarithm base a"),
      sym("\\lg", "ათობითი ლოგარითმი", "Common logarithm"),
      sym("\\ln", "ნატურალური ლოგარითმი", "Natural logarithm"),
      b("e^{#?}", "e^{x}", "ექსპონენტა", "Exponential"),
      b("f\\left(#?\\right)", "f(x)", "ფუნქცია f(x)", "Function f(x)"),
      b("\\lim_{#?\\to#?}", "\\lim_{x\\to a}", "ზღვარი", "Limit"),
      b("^{\\prime}", "f'", "წარმოებული (შტრიხი)", "Derivative (prime)"),
      b("\\frac{d}{dx}", "\\frac{d}{dx}", "წარმოებული x-ით", "Derivative d/dx"),
      b("\\int #?\\,dx", "\\int f\\,dx", "განუსაზღვრელი ინტეგრალი", "Indefinite integral"),
      b("\\int_{#?}^{#?}#?\\,dx", "\\int_a^b", "განსაზღვრული ინტეგრალი", "Definite integral"),
      b("\\sum_{#?}^{#?}#?", "\\sum_{i=1}^{n}", "ჯამი", "Sum"),
      sym("\\infty", "უსასრულობა", "Infinity"),
    ],
  },
  {
    id: "geometry",
    ka: "გეომეტრია",
    en: "Geometry",
    buttons: [
      sym("\\angle", "კუთხე", "Angle"),
      sym("\\triangle", "სამკუთხედი", "Triangle"),
      sym("\\parallel", "პარალელურია", "Parallel"),
      sym("\\perp", "მართობულია", "Perpendicular"),
      b("^{\\circ}", `${SQ}^{\\circ}`, "გრადუსი (°)", "Degrees (°)"),
      sym("\\cong", "ტოლია (კონგრუენტულია)", "Congruent"),
      sym("\\sim", "მსგავსია", "Similar"),
      b("\\overline{#?}", "\\overline{AB}", "მონაკვეთი", "Segment"),
      b("\\overrightarrow{#?}", "\\overrightarrow{AB}", "ვექტორი", "Vector"),
      b("\\overset{\\frown}{#?}", "\\overset{\\frown}{AB}", "რკალი", "Arc"),
      sym("\\pi", "პი", "Pi"),
    ],
  },
  {
    id: "sets",
    ka: "სიმრავლეები და ლოგიკა",
    en: "Sets & logic",
    buttons: [
      sym("\\in", "ეკუთვნის", "Element of"),
      sym("\\notin", "არ ეკუთვნის", "Not an element of"),
      sym("\\subset", "ქვესიმრავლეა", "Subset"),
      sym("\\subseteq", "ქვესიმრავლეა ან ტოლია", "Subset or equal"),
      sym("\\cup", "გაერთიანება", "Union"),
      sym("\\cap", "თანაკვეთა", "Intersection"),
      sym("\\setminus", "სხვაობა", "Difference"),
      sym("\\varnothing", "ცარიელი სიმრავლე", "Empty set"),
      sym("\\mathbb{N}", "ნატურალური რიცხვები", "Natural numbers"),
      sym("\\mathbb{Z}", "მთელი რიცხვები", "Integers"),
      sym("\\mathbb{Q}", "რაციონალური რიცხვები", "Rational numbers"),
      sym("\\mathbb{R}", "ნამდვილი რიცხვები", "Real numbers"),
      b("\\left\\{#?\\right\\}", `\\{${SQ}\\}`, "სიმრავლე { }", "Set { }"),
      sym("\\forall", "ნებისმიერი", "For all"),
      sym("\\exists", "არსებობს", "There exists"),
      sym("\\neg", "უარყოფა (არა)", "Not"),
      sym("\\land", "და (კონიუნქცია)", "And"),
      sym("\\lor", "ან (დიზიუნქცია)", "Or"),
    ],
  },
  {
    id: "greek",
    ka: "ბერძნული ასოები",
    en: "Greek letters",
    buttons: [
      sym("\\alpha", "ალფა", "Alpha"),
      sym("\\beta", "ბეტა", "Beta"),
      sym("\\gamma", "გამა", "Gamma"),
      sym("\\delta", "დელტა", "Delta"),
      sym("\\varepsilon", "ეფსილონი", "Epsilon"),
      sym("\\theta", "თეტა", "Theta"),
      sym("\\lambda", "ლამბდა", "Lambda"),
      sym("\\mu", "მიუ", "Mu"),
      sym("\\pi", "პი", "Pi"),
      sym("\\rho", "რო", "Rho"),
      sym("\\sigma", "სიგმა", "Sigma"),
      sym("\\varphi", "ფი", "Phi"),
      sym("\\omega", "ომეგა", "Omega"),
      sym("\\Delta", "დიდი დელტა", "Capital delta"),
      sym("\\Sigma", "დიდი სიგმა", "Capital sigma"),
      sym("\\Omega", "დიდი ომეგა", "Capital omega"),
    ],
  },
];
