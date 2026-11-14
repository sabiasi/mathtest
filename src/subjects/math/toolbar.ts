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
 *   ka / en  the tooltip, in Georgian and English (the symbol search uses them)
 *   keywords extra words for the search ("sqrt root")
 *
 * Organised like Word's equation tools, most used first: every symbol is in
 * ONE tab only (toolbars.test.ts checks for duplicates), and the search
 * finds anything by its Georgian or English name.
 *
 * Note: Georgian schools write tg / ctg (not tan / cot), so we use those.
 */

import type { ToolbarButton, ToolbarTab, TypingShortcut } from "../types";

const b = (latex: string, display: string, ka: string, en: string, keywords?: string): ToolbarButton => ({ latex, display, ka, en, ...(keywords ? { keywords } : {}) });
/** A simple symbol: inserted exactly as shown. */
const sym = (latex: string, ka: string, en: string, keywords?: string) => b(latex, latex, ka, en, keywords);
/** Starts a named group of buttons inside a tab. */
const group = (button: ToolbarButton, ka: string, en: string): ToolbarButton => ({ ...button, group: { ka, en } });
/** Runs a command in the formula being edited (matrix rows / columns). */
const command = (name: string, ka: string, en: string, labelKa: string, labelEn: string): ToolbarButton => ({
  latex: "",
  display: "",
  command: name,
  label: { ka: labelKa, en: labelEn },
  ka,
  en,
});

const SQ = "\\square";
/** A small matrix picture for a button: rows × columns of empty boxes. */
const grid = (env: string, rows: number, cols: number, cell = "#?") => `\\begin{${env}}${Array.from({ length: rows }, () => Array(cols).fill(cell).join("&")).join("\\\\")}\\end{${env}}`;
const matrix = (env: string, rows: number, cols: number, ka: string, en: string, keywords?: string) => b(grid(env, rows, cols), grid(env, rows, cols, "\\cdot"), ka, en, keywords);

export const MATH_TOOLBAR: ToolbarTab[] = [
  {
    id: "basic",
    ka: "ძირითადი",
    en: "Basic",
    buttons: [
      sym("+", "პლუსი (მიმატება)", "Plus"),
      sym("-", "მინუსი (გამოკლება)", "Minus"),
      sym("\\times", "გამრავლება", "Multiply", "times"),
      sym("\\cdot", "გამრავლება (წერტილი)", "Multiply (dot)", "dot"),
      sym("\\div", "გაყოფა", "Divide"),
      sym(":", "გაყოფა (ორწერტილი), შეფარდება", "Divide (colon), ratio"),
      sym("=", "ტოლია", "Equals"),
      sym("\\neq", "არ არის ტოლი", "Not equal", "ne !="),
      sym("\\approx", "დაახლოებით ტოლია", "Approximately equal"),
      sym("\\pm", "პლუს-მინუს", "Plus-minus"),
      group(b("\\frac{#@}{#?}", `\\frac{${SQ}}{${SQ}}`, "წილადი", "Fraction", "frac /"), "სტრუქტურები:", "Structures:"),
      b("#?\\frac{#?}{#?}", `${SQ}\\frac{${SQ}}{${SQ}}`, "შერეული რიცხვი (მთელი და წილადი)", "Mixed number"),
      b("^{#?}", `${SQ}^{${SQ}}`, "ხარისხი (xⁿ)", "Power (xⁿ)", "superscript ^ exponent"),
      b("^2", "x^2", "კვადრატში (x²)", "Squared (x²)"),
      b("_{#?}", `${SQ}_{${SQ}}`, "ქვედა ინდექსი (x₁, aₙ)", "Subscript (x₁, aₙ)", "_ index"),
      b("\\sqrt{#@}", `\\sqrt{${SQ}}`, "კვადრატული ფესვი", "Square root", "sqrt"),
      b("\\sqrt[#?]{#@}", `\\sqrt[n]{${SQ}}`, "n-ური ხარისხის ფესვი", "n-th root", "root cube"),
      b("\\left(#@\\right)", `(${SQ})`, "ფრჩხილები", "Parentheses", "brackets"),
      b("\\left|#@\\right|", `|${SQ}|`, "მოდული (აბსოლუტური მნიშვნელობა)", "Absolute value", "abs"),
      group(sym("<", "ნაკლებია", "Less than"), "შედარება:", "Compare:"),
      sym(">", "მეტია", "Greater than"),
      sym("\\le", "ნაკლებია ან ტოლი", "Less than or equal", "<= leq"),
      sym("\\ge", "მეტია ან ტოლი", "Greater than or equal", ">= geq"),
      group(sym("\\%", "პროცენტი", "Percent"), "სხვა:", "Other:"),
      b("^{\\circ}", `${SQ}^{\\circ}`, "გრადუსი (°)", "Degrees (°)", "deg"),
      sym("\\pi", "პი", "Pi"),
      sym("\\infty", "უსასრულობა", "Infinity", "inf oo"),
    ],
  },
  {
    id: "algebra",
    ka: "ალგებრა",
    en: "Algebra",
    buttons: [
      b("^3", "x^3", "კუბში (x³)", "Cubed (x³)"),
      b("_{#?}^{#?}", `${SQ}_{${SQ}}^{${SQ}}`, "ინდექსი და ხარისხი ერთად", "Subscript and superscript"),
      b("#?\\cdot10^{#?}", "a\\cdot10^{n}", "რიცხვის სტანდარტული ჩაწერა", "Scientific notation"),
      b("#?!", "n!", "ფაქტორიალი", "Factorial"),
      b("\\binom{#?}{#?}", "\\binom{n}{k}", "ჯუფთება (ბინომური კოეფიციენტი)", "Binomial coefficient", "choose combination C"),
      b("C_{#?}^{#?}", "C_n^k", "ჯუფთებათა რიცხვი", "Number of combinations"),
      b("A_{#?}^{#?}", "A_n^k", "წყობათა რიცხვი", "Number of arrangements"),
      b("\\overline{#@}", `\\overline{${SQ}}`, "ხაზი ზემოთ (პერიოდი, რიცხვის ჩანაწერი)", "Overline (repeating decimal)", "bar"),
      group(b("\\begin{cases}#?\\\\#?\\end{cases}", `\\begin{cases}${SQ}\\\\${SQ}\\end{cases}`, "სისტემა (2 განტოლება)", "System (2 equations)", "cases"), "სისტემები:", "Systems:"),
      b("\\begin{cases}#?\\\\#?\\\\#?\\end{cases}", `\\begin{cases}${SQ}\\\\${SQ}\\\\${SQ}\\end{cases}`, "სისტემა (3 განტოლება)", "System (3 equations)"),
      b("\\left[\\begin{matrix}#?\\\\#?\\end{matrix}\\right.", `\\left[\\begin{matrix}${SQ}\\\\${SQ}\\end{matrix}\\right.`, "ერთობლიობა (ან … ან …)", "Either … or … (square bracket)", "union of conditions"),
      b("#?=\\begin{cases}#?,&#?\\\\#?,&#?\\end{cases}", "f=\\begin{cases}\\cdot,&\\cdot\\\\\\cdot,&\\cdot\\end{cases}", "უბან-უბან მოცემული ფუნქცია", "Piecewise function"),
      group(b("\\left(#?;#?\\right)", "(a;b)", "ინტერვალი", "Open interval"), "შუალედები:", "Intervals:"),
      b("\\left[#?;#?\\right]", "[a;b]", "მონაკვეთი (ჩაკეტილი შუალედი)", "Closed interval"),
      b("\\left[#?;#?\\right)", "[a;b)", "ნახევრად ღია შუალედი [a; b)", "Half-open interval [a; b)"),
      b("\\left(#?;#?\\right]", "(a;b]", "ნახევრად ღია შუალედი (a; b]", "Half-open interval (a; b]"),
      b("\\left(-\\infty;#?\\right)", "(-\\infty;a)", "შუალედი მინუს უსასრულობიდან", "Interval from minus infinity"),
      b("\\left(#?;+\\infty\\right)", "(a;+\\infty)", "შუალედი პლუს უსასრულობამდე", "Interval to plus infinity"),
    ],
  },
  {
    id: "brackets",
    ka: "ფრჩხილები და ნიშნები",
    en: "Brackets & accents",
    buttons: [
      b("\\left[#@\\right]", `[${SQ}]`, "კვადრატული ფრჩხილები", "Square brackets"),
      b("\\left\\{#@\\right\\}", `\\{${SQ}\\}`, "ფიგურული ფრჩხილები (სიმრავლე)", "Curly braces (set)"),
      b("\\left\\langle#@\\right\\rangle", `\\langle${SQ}\\rangle`, "კუთხოვანი ფრჩხილები", "Angle brackets"),
      b("\\left\\|#@\\right\\|", `\\|${SQ}\\|`, "ნორმა (ორმაგი ხაზები)", "Norm (double bars)"),
      b("\\left\\lfloor#@\\right\\rfloor", `\\lfloor${SQ}\\rfloor`, "მთელი ნაწილი (ქვემოთ დამრგვალება)", "Floor"),
      b("\\left\\lceil#@\\right\\rceil", `\\lceil${SQ}\\rceil`, "ზემოთ დამრგვალება", "Ceiling"),
      group(b("\\bar{#@}", "\\bar{x}", "ხაზი ასოს თავზე (საშუალო)", "Bar (mean)", "mean average"), "ნიშნები ასოს თავზე:", "Accents:"),
      b("\\vec{#@}", "\\vec{a}", "ვექტორი (ისარი ასოს თავზე)", "Vector (arrow over a letter)"),
      b("\\hat{#@}", "\\hat{a}", "ქუდი", "Hat"),
      b("\\tilde{#@}", "\\tilde{a}", "ტილდა", "Tilde"),
      b("\\dot{#@}", "\\dot{x}", "წერტილი თავზე", "Dot"),
      b("\\ddot{#@}", "\\ddot{x}", "ორი წერტილი თავზე", "Double dot"),
      b("\\underline{#@}", `\\underline{${SQ}}`, "ხაზი ქვემოთ", "Underline"),
      b("\\overbrace{#@}^{#?}", "\\overbrace{a+b}^{n}", "ფრჩხილი ზემოდან წარწერით", "Overbrace"),
      b("\\underbrace{#@}_{#?}", "\\underbrace{a+b}_{n}", "ფრჩხილი ქვემოდან წარწერით", "Underbrace"),
      b("\\boxed{#@}", `\\boxed{${SQ}}`, "ჩარჩო (პასუხის გამოსაყოფად)", "Box (to frame an answer)", "frame"),
      b("\\cancel{#@}", "\\cancel{x}", "გადახაზვა (შეკვეცა)", "Cancel (strike through)", "strike"),
      group(b("\\text{#?}", "\\text{აბგ}", "ტექსტი ფორმულაში (სიტყვები)", "Text inside a formula", "words"), "ტექსტი:", "Text:"),
      sym("\\ldots", "სამწერტილი (ქვემოთ)", "Dots (low)", "dots ellipsis"),
      sym("\\cdots", "სამწერტილი (შუაში)", "Dots (centred)"),
    ],
  },
  {
    id: "trig",
    ka: "ტრიგონომეტრია",
    en: "Trigonometry",
    buttons: [
      sym("\\sin", "სინუსი", "Sine"),
      sym("\\cos", "კოსინუსი", "Cosine"),
      sym("\\operatorname{tg}", "ტანგენსი (tg)", "Tangent (tg)", "tan"),
      sym("\\operatorname{ctg}", "კოტანგენსი (ctg)", "Cotangent (ctg)", "cot"),
      sym("\\arcsin", "არკსინუსი", "Arcsine"),
      sym("\\arccos", "არკკოსინუსი", "Arccosine"),
      sym("\\operatorname{arctg}", "არკტანგენსი", "Arctangent", "arctan"),
      sym("\\operatorname{arcctg}", "არკკოტანგენსი", "Arccotangent", "arccot"),
      b("\\sin^2", "\\sin^2", "სინუსის კვადრატი", "Sine squared"),
      b("\\cos^2", "\\cos^2", "კოსინუსის კვადრატი", "Cosine squared"),
      b("\\operatorname{tg}^2", "\\operatorname{tg}^2", "ტანგენსის კვადრატი", "Tangent squared"),
      b("\\frac{\\pi}{#?}", `\\frac{\\pi}{${SQ}}`, "პი-ს ნაწილი (π/6, π/4…)", "A fraction of pi (π/6, π/4…)", "radian"),
      b("#?^{\\circ}#?'", "30^{\\circ}15'", "გრადუსი და წუთი", "Degrees and minutes"),
      sym("\\text{რად}", "რადიანი", "Radian"),
    ],
  },
  {
    id: "calculus",
    ka: "ფუნქციები და ანალიზი",
    en: "Functions & calculus",
    buttons: [
      b("f\\left(#?\\right)", "f(x)", "ფუნქცია f(x)", "Function f(x)"),
      b("\\log_{#?}#?", "\\log_a b", "ლოგარითმი a ფუძით", "Logarithm base a", "log"),
      sym("\\lg", "ათობითი ლოგარითმი", "Common logarithm"),
      sym("\\ln", "ნატურალური ლოგარითმი", "Natural logarithm"),
      b("e^{#?}", "e^{x}", "ექსპონენტა", "Exponential", "exp"),
      group(b("\\lim_{#?\\to#?}", "\\lim_{x\\to a}", "ზღვარი", "Limit", "lim"), "ზღვარი და წარმოებული:", "Limits & derivatives:"),
      b("\\lim_{#?\\to\\infty}", "\\lim_{n\\to\\infty}", "ზღვარი უსასრულობაში", "Limit at infinity"),
      b("^{\\prime}", "f'", "წარმოებული (შტრიხი)", "Derivative (prime)"),
      b("^{\\prime\\prime}", "f''", "მეორე რიგის წარმოებული", "Second derivative"),
      b("\\frac{d}{dx}", "\\frac{d}{dx}", "წარმოებული x-ით", "Derivative d/dx"),
      b("\\frac{d#?}{d#?}", "\\frac{dy}{dx}", "წარმოებული dy/dx", "Derivative dy/dx"),
      b("\\frac{\\partial#?}{\\partial#?}", "\\frac{\\partial f}{\\partial x}", "კერძო წარმოებული", "Partial derivative"),
      group(b("\\int #?\\,dx", "\\int f\\,dx", "განუსაზღვრელი ინტეგრალი", "Indefinite integral", "int"), "ინტეგრალი:", "Integrals:"),
      b("\\int_{#?}^{#?}#?\\,dx", "\\int_a^b", "განსაზღვრული ინტეგრალი", "Definite integral"),
      b("\\iint_{#?}#?", "\\iint", "ორმაგი ინტეგრალი", "Double integral"),
      b("\\oint_{#?}#?", "\\oint", "კონტურული ინტეგრალი", "Contour integral"),
      b("\\left.#?\\right|_{#?}^{#?}", "F\\big|_a^b", "ჩასმა საზღვრებში (ნიუტონ-ლაიბნიცი)", "Evaluated between limits"),
      group(b("\\sum_{#?}^{#?}#?", "\\sum_{i=1}^{n}", "ჯამი", "Sum", "sigma"), "ჯამი და ნამრავლი:", "Sums & products:"),
      b("\\prod_{#?}^{#?}#?", "\\prod_{i=1}^{n}", "ნამრავლი", "Product"),
      b("\\max_{#?}", "\\max", "მაქსიმუმი", "Maximum"),
      b("\\min_{#?}", "\\min", "მინიმუმი", "Minimum"),
    ],
  },
  {
    id: "matrices",
    ka: "მატრიცები",
    en: "Matrices",
    buttons: [
      matrix("pmatrix", 2, 2, "მატრიცა 2×2", "Matrix 2×2", "matrix"),
      matrix("pmatrix", 3, 3, "მატრიცა 3×3", "Matrix 3×3"),
      matrix("pmatrix", 2, 3, "მატრიცა 2×3", "Matrix 2×3"),
      matrix("bmatrix", 2, 2, "მატრიცა კვადრატულ ფრჩხილებში", "Matrix in square brackets"),
      group(matrix("vmatrix", 2, 2, "დეტერმინანტი 2×2", "Determinant 2×2", "det"), "დეტერმინანტი:", "Determinant:"),
      matrix("vmatrix", 3, 3, "დეტერმინანტი 3×3", "Determinant 3×3"),
      group(matrix("pmatrix", 2, 1, "ვექტორ-სვეტი (2 კოორდინატი)", "Column vector (2)"), "ვექტორი:", "Vector:"),
      matrix("pmatrix", 3, 1, "ვექტორ-სვეტი (3 კოორდინატი)", "Column vector (3)"),
      group(command("addRowAfter", "მატრიცას ემატება სტრიქონი (კურსორის ქვემოთ)", "Add a row to the matrix (below the cursor)", "+ სტრიქონი", "+ Row"), "მატრიცის შეცვლა:", "Change the matrix:"),
      command("addColumnAfter", "მატრიცას ემატება სვეტი (კურსორის მარჯვნივ)", "Add a column to the matrix (right of the cursor)", "+ სვეტი", "+ Column"),
      command("removeRow", "სტრიქონის წაშლა", "Remove the row", "− სტრიქონი", "− Row"),
      command("removeColumn", "სვეტის წაშლა", "Remove the column", "− სვეტი", "− Column"),
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
      sym("\\nparallel", "არ არის პარალელური", "Not parallel"),
      sym("\\cong", "ტოლია (კონგრუენტულია)", "Congruent"),
      sym("\\sim", "მსგავსია", "Similar"),
      b("\\overline{#?}", "\\overline{AB}", "მონაკვეთი AB", "Segment AB"),
      b("\\overrightarrow{#?}", "\\overrightarrow{AB}", "ვექტორი AB", "Vector AB"),
      b("\\overset{\\frown}{#?}", "\\overset{\\frown}{AB}", "რკალი", "Arc"),
      b("\\angle #?=#?^{\\circ}", "\\angle A=60^{\\circ}", "კუთხის სიდიდე", "Size of an angle"),
      b("\\triangle #?", "\\triangle ABC", "სამკუთხედი ABC", "Triangle ABC"),
      sym("\\square", "ოთხკუთხედი (კვადრატი)", "Quadrilateral (square)"),
      sym("\\odot", "წრეწირი", "Circle"),
      b("S_{#?}", "S_{ABC}", "ფართობი (ინდექსით)", "Area (with a subscript)"),
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
      sym("\\supset", "მოიცავს (ზესიმრავლეა)", "Superset"),
      sym("\\not\\subset", "არ არის ქვესიმრავლე", "Not a subset"),
      sym("\\cup", "გაერთიანება", "Union"),
      sym("\\cap", "თანაკვეთა", "Intersection"),
      sym("\\setminus", "სხვაობა", "Difference"),
      sym("\\varnothing", "ცარიელი სიმრავლე", "Empty set"),
      b("\\left\\{#?\\mid#?\\right\\}", "\\{x\\mid\\ldots\\}", "სიმრავლე პირობით { x | … }", "Set builder { x | … }"),
      b("\\bigcup_{#?}^{#?}", "\\bigcup", "გაერთიანება (დიდი)", "Big union"),
      b("\\bigcap_{#?}^{#?}", "\\bigcap", "თანაკვეთა (დიდი)", "Big intersection"),
      group(sym("\\mathbb{N}", "ნატურალური რიცხვები", "Natural numbers"), "რიცხვთა სიმრავლეები:", "Number sets:"),
      sym("\\mathbb{Z}", "მთელი რიცხვები", "Integers"),
      sym("\\mathbb{Q}", "რაციონალური რიცხვები", "Rational numbers"),
      sym("\\mathbb{R}", "ნამდვილი რიცხვები", "Real numbers"),
      sym("\\mathbb{C}", "კომპლექსური რიცხვები", "Complex numbers"),
      group(sym("\\forall", "ნებისმიერი", "For all"), "ლოგიკა:", "Logic:"),
      sym("\\exists", "არსებობს", "There exists"),
      sym("\\neg", "უარყოფა (არა)", "Not"),
      sym("\\land", "და (კონიუნქცია)", "And"),
      sym("\\lor", "ან (დიზიუნქცია)", "Or"),
      sym("\\therefore", "მაშასადამე", "Therefore"),
      sym("\\because", "რადგან", "Because"),
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
      sym("\\zeta", "ძეტა", "Zeta"),
      sym("\\eta", "ეტა", "Eta"),
      sym("\\theta", "თეტა", "Theta"),
      sym("\\kappa", "კაპა", "Kappa"),
      sym("\\lambda", "ლამბდა", "Lambda"),
      sym("\\mu", "მიუ", "Mu"),
      sym("\\nu", "ნიუ", "Nu"),
      sym("\\xi", "ქსი", "Xi"),
      sym("\\rho", "რო", "Rho"),
      sym("\\sigma", "სიგმა", "Sigma"),
      sym("\\tau", "ტაუ", "Tau"),
      sym("\\varphi", "ფი", "Phi"),
      sym("\\chi", "ხი", "Chi"),
      sym("\\psi", "ფსი", "Psi"),
      sym("\\omega", "ომეგა", "Omega"),
      group(sym("\\Gamma", "დიდი გამა", "Capital gamma"), "დიდი ასოები:", "Capitals:"),
      sym("\\Delta", "დიდი დელტა", "Capital delta"),
      sym("\\Theta", "დიდი თეტა", "Capital theta"),
      sym("\\Lambda", "დიდი ლამბდა", "Capital lambda"),
      sym("\\Pi", "დიდი პი", "Capital pi"),
      sym("\\Sigma", "დიდი სიგმა", "Capital sigma"),
      sym("\\Phi", "დიდი ფი", "Capital phi"),
      sym("\\Psi", "დიდი ფსი", "Capital psi"),
      sym("\\Omega", "დიდი ომეგა", "Capital omega"),
    ],
  },
  {
    id: "arrows",
    ka: "ისრები და მიმართებები",
    en: "Arrows & relations",
    buttons: [
      sym("\\to", "ისარი მარჯვნივ (მიისწრაფვის)", "Right arrow (tends to)", "-> rightarrow"),
      sym("\\leftarrow", "ისარი მარცხნივ", "Left arrow"),
      sym("\\leftrightarrow", "ორმხრივი ისარი", "Left-right arrow"),
      sym("\\Rightarrow", "აქედან გამომდინარეობს", "Implies", "=>"),
      sym("\\Leftarrow", "გამომდინარეობს (მარცხნივ)", "Is implied by"),
      sym("\\Leftrightarrow", "ტოლფასია", "Equivalent", "<=> iff"),
      sym("\\uparrow", "ისარი ზემოთ (იზრდება)", "Up arrow (increases)"),
      sym("\\downarrow", "ისარი ქვემოთ (კლებულობს)", "Down arrow (decreases)"),
      sym("\\nearrow", "ისარი ზემოთ-მარჯვნივ (ზრდადია)", "Arrow up-right (increasing)"),
      sym("\\searrow", "ისარი ქვემოთ-მარჯვნივ (კლებადია)", "Arrow down-right (decreasing)"),
      sym("\\mapsto", "აისახება", "Maps to"),
      group(sym("\\equiv", "იგივურად ტოლია", "Identical to"), "მიმართებები:", "Relations:"),
      sym("\\not\\equiv", "არ არის იგივურად ტოლი", "Not identical"),
      sym("\\propto", "პროპორციულია", "Proportional to"),
      sym("\\ll", "ბევრად ნაკლებია", "Much less than"),
      sym("\\gg", "ბევრად მეტია", "Much greater than"),
      sym("\\nless", "არ არის ნაკლები", "Not less than"),
      sym("\\ngtr", "არ არის მეტი", "Not greater than"),
      sym("\\nleq", "არც ნაკლებია, არც ტოლი", "Neither less than nor equal"),
      sym("\\ngeq", "არც მეტია, არც ტოლი", "Neither greater than nor equal"),
      sym("\\mp", "მინუს-პლუს", "Minus-plus"),
      group(sym("\\partial", "კერძო წარმოებულის ნიშანი", "Partial"), "ასოს მსგავსი:", "Letter-like:"),
      sym("\\nabla", "ნაბლა", "Nabla"),
      sym("\\ell", "ხელნაწერი l", "Script l"),
      sym("\\hbar", "პლანკის მუდმივა (h ხაზით)", "h-bar"),
      sym("\\vdots", "ვერტიკალური სამწერტილი", "Vertical dots"),
      sym("\\ddots", "დიაგონალური სამწერტილი", "Diagonal dots"),
    ],
  },
];

/** A math tab by id (other subjects borrow some: physics, chemistry…). */
export const mathTab = (id: string): ToolbarTab => {
  const tab = MATH_TOOLBAR.find((x) => x.id === id);
  if (!tab) throw new Error(`No math tab "${id}"`);
  return tab;
};
/** Every math tab except these (for `searchExtra`: found by the search without being shown). */
export const mathTabsExcept = (...ids: string[]): ToolbarTab[] => MATH_TOOLBAR.filter((tab) => !ids.includes(tab.id));

/**
 * What a teacher can simply TYPE inside a formula (like Word's equation
 * shortcuts). Shown in the toolbar's "typing shortcuts" help;
 * e2e/shortcuts.spec.ts checks that each one really works.
 */
export const MATH_SHORTCUTS: TypingShortcut[] = [
  { keys: "/", display: "\\frac{a}{b}", ka: "წილადი: აკრიფეთ a/b", en: "Fraction: type a/b" },
  { keys: "^", display: "x^{2}", ka: "ხარისხი: x^2", en: "Power: x^2" },
  { keys: "_", display: "x_{1}", ka: "ქვედა ინდექსი: x_1", en: "Subscript: x_1" },
  { keys: "sqrt", display: "\\sqrt{x}", ka: "კვადრატული ფესვი", en: "Square root" },
  { keys: "pi", display: "\\pi", ka: "პი", en: "Pi" },
  { keys: "alpha", display: "\\alpha", ka: "ბერძნული ასოები: alpha, beta, gamma, delta, theta, lambda, omega…", en: "Greek letters: alpha, beta, gamma, delta, theta, lambda, omega…" },
  { keys: "<=", display: "\\le", ka: "ნაკლებია ან ტოლი (>= — მეტია ან ტოლი)", en: "Less than or equal (>= for greater)" },
  { keys: "!=", display: "\\ne", ka: "არ არის ტოლი", en: "Not equal" },
  { keys: "->", display: "\\to", ka: "ისარი", en: "Arrow" },
  { keys: "oo", display: "\\infty", ka: "უსასრულობა (ორი პატარა o)", en: "Infinity (two small o's)" },
  { keys: "sin", display: "\\sin", ka: "ფუნქციები: sin, cos, tg, ctg, arctg, ln, lg, log, lim", en: "Functions: sin, cos, tg, ctg, arctg, ln, lg, log, lim" },
  { keys: "sum", display: "\\sum", ka: "ჯამი (int — ინტეგრალი)", en: "Sum (int for an integral)" },
  { keys: "(", display: "\\left(x\\right)", ka: "ფრჩხილი თავისით იხურება", en: "Brackets close by themselves" },
];
