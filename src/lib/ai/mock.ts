/**
 * MOCK MODE: what the generator answers when there is no ANTHROPIC_API_KEY.
 * Ready-made sample questions in the same format the real AI uses, so the
 * whole screen (and the tests) work without an account or any cost.
 * They go through the same checks as real answers (convert.ts).
 */
import type { GenerateRequest, AiType } from "./request";
import { emptyItem, type AiItem } from "./wire";

type Maker = (topic: string, n: number) => AiItem;
const item = (type: AiType, text: string, extra: Partial<AiItem>): AiItem => ({ ...emptyItem(type, text), ...extra });

/** Subjects where sample questions should carry formulas. */
const kind = (subject: GenerateRequest["subject"]) => (subject === "math" || subject === "physics" ? "math" : subject === "chemistry" ? "chem" : "text");

const KA: Record<"math" | "chem" | "text", Record<AiType, Maker>> = {
  math: {
    "multiple-choice": (t, n) => item("multiple-choice", `(${t}) რას უდრის $x$, თუ $${n + 1}x+3=${(n + 1) * 4 + 3}$?`, { options: ["$x=2$", "$x=3$", "$x=4$", "$x=5$"], correct: 2 }),
    "true-false": (t, n) => item("true-false", `(${t}) $\\operatorname{tg}45^{\\circ}=${n % 2 === 0 ? 1 : 2}$`, { is_true: n % 2 === 0 }),
    "short-answer": (t, n) => item("short-answer", `(${t}) გამოთვალეთ: $\\frac{${n + 1}}{2}+\\frac{1}{2}$`, { answer: `$${(n + 2) / 2}$`.replace(".", "{,}") }),
    "open-answer": (t) => item("open-answer", `(${t}) ამოხსენით უტოლობა $x^{2}-5x+6\\le 0$ და პასუხი ჩაწერეთ შუალედის სახით.`, { lines: 6, points: 3 }),
    matching: (t) => item("matching", `(${t}) დააკავშირეთ გამოსახულება მის მნიშვნელობასთან.`, { pairs: [{ left: "$2^{3}$", right: "$8$" }, { left: "$\\sqrt{49}$", right: "$7$" }, { left: "$3^{2}$", right: "$9$" }], extras: ["$6$"], points: 3 }),
    order: (t) => item("order", `(${t}) დაალაგეთ რიცხვები ზრდის მიხედვით.`, { items: ["$-3$", "$\\frac{1}{2}$", "$\\sqrt{2}$", "$\\pi$"], points: 2 }),
    "fill-blank": (t) => item("fill-blank", `(${t}) ჩაწერეთ გამოტოვებული სიტყვები.`, { body: "სამკუთხედის შიგა კუთხეების ჯამი 180 გრადუსია. მართკუთხა სამკუთხედის ყველაზე გრძელ გვერდს ჰიპოტენუზა ეწოდება.", blanks: ["ჯამი", "ჰიპოტენუზა"], points: 2 }),
    "given-find": (t, n) => item("given-find", `(${t}) სხეული ${n + 2} წმ-ის განმავლობაში მოძრაობს $5\\ \\text{მ/წმ}$ მუდმივი სიჩქარით. რა მანძილს გაივლის?`, { given: `$v=5\\ \\text{მ/წმ}$, $t=${n + 2}\\ \\text{წმ}$`, find: "$s$", solution: `$s=v\\cdot t=5\\cdot ${n + 2}$`, answer: `$s=${5 * (n + 2)}\\ \\text{მ}$`, lines: 7, points: 3 }),
    balance: () => item("balance", "გაათანაბრეთ რეაქციის ტოლობები.", { equations: ["2H2 + O2 -> 2H2O"] }),
  },
  chem: {
    "multiple-choice": (t) => item("multiple-choice", `(${t}) რომელია გოგირდმჟავას ფორმულა?`, { options: ["$\\ce{HCl}$", "$\\ce{H2SO4}$", "$\\ce{HNO3}$", "$\\ce{H2CO3}$"], correct: 1 }),
    "true-false": (t, n) => item("true-false", `(${t}) $\\ce{NaCl}$ ${n % 2 === 0 ? "მარილია" : "მჟავაა"}.`, { is_true: n % 2 === 0 }),
    "short-answer": (t) => item("short-answer", `(${t}) რამდენი ატომია $\\ce{H2O}$-ის ერთ მოლეკულაში?`, { answer: "3" }),
    "open-answer": (t) => item("open-answer", `(${t}) ახსენით, რატომ არის $\\ce{CO2}$ ჟანგეული და დაწერეთ მისი მიღების რეაქცია.`, { lines: 6, points: 3 }),
    matching: (t) => item("matching", `(${t}) დააკავშირეთ ნივთიერება მის ფორმულასთან.`, { pairs: [{ left: "წყალი", right: "$\\ce{H2O}$" }, { left: "სუფრის მარილი", right: "$\\ce{NaCl}$" }, { left: "ნახშირორჟანგი", right: "$\\ce{CO2}$" }], extras: ["$\\ce{O2}$"], points: 3 }),
    order: (t) => item("order", `(${t}) დაალაგეთ ელემენტები ატომური ნომრის ზრდის მიხედვით.`, { items: ["წყალბადი", "ნახშირბადი", "ჟანგბადი", "ნატრიუმი"], points: 2 }),
    "fill-blank": (t) => item("fill-blank", `(${t}) ჩაწერეთ გამოტოვებული სიტყვები.`, { body: "მჟავას და ფუძის ურთიერთქმედებით მიიღება მარილი და წყალი. ამ რეაქციას ნეიტრალიზაცია ეწოდება.", blanks: ["მარილი", "ნეიტრალიზაცია"], points: 2 }),
    "given-find": (t) => item("given-find", `(${t}) რა მასა აქვს 2 მოლ წყალს?`, { given: "$n=2\\ \\text{მოლი}$, $M(\\ce{H2O})=18\\ \\text{გ/მოლი}$", find: "$m$", solution: "$m=n\\cdot M=2\\cdot 18$", answer: "$m=36\\ \\text{გ}$", lines: 7, points: 3 }),
    balance: (t) => item("balance", `(${t}) გაათანაბრეთ რეაქციის ტოლობები.`, { equations: ["2H2 + O2 -> 2H2O", "N2 + 3H2 -> 2NH3", "CH4 + 2O2 -> CO2 + 2H2O"], points: 3 }),
  },
  text: {
    "multiple-choice": (t, n) => item("multiple-choice", `რომელი მსჯელობაა სწორი თემაზე „${t}“? (ნიმუში ${n + 1})`, { options: ["პირველი პასუხი", "მეორე პასუხი", "მესამე პასუხი", "მეოთხე პასუხი"], correct: n % 4 }),
    "true-false": (t, n) => item("true-false", `თემა „${t}“: ეს დებულება ${n % 2 === 0 ? "სწორია" : "მცდარია"} (ნიმუში).`, { is_true: n % 2 === 0 }),
    "short-answer": (t) => item("short-answer", `დაასახელეთ თემის „${t}“ ერთი მთავარი ცნება.`, { answer: "ნიმუშის პასუხი" }),
    "open-answer": (t) => item("open-answer", `მოკლედ ახსენით, რატომ არის მნიშვნელოვანი თემა „${t}“.`, { lines: 6, points: 3 }),
    matching: (t) => item("matching", `თემა „${t}“: დააკავშირეთ ცნება მის განმარტებასთან.`, { pairs: [{ left: "პირველი ცნება", right: "პირველი განმარტება" }, { left: "მეორე ცნება", right: "მეორე განმარტება" }, { left: "მესამე ცნება", right: "მესამე განმარტება" }], extras: ["ზედმეტი განმარტება"], points: 3 }),
    order: (t) => item("order", `თემა „${t}“: დაალაგეთ ეტაპები სწორი თანმიმდევრობით.`, { items: ["პირველი ეტაპი", "მეორე ეტაპი", "მესამე ეტაპი", "მეოთხე ეტაპი"], points: 2 }),
    "fill-blank": (t) => item("fill-blank", `თემა „${t}“: ჩაწერეთ გამოტოვებული სიტყვები.`, { body: "საქართველოს დედაქალაქი თბილისია. ქვეყნის ყველაზე გრძელი მდინარე მტკვარია.", blanks: ["თბილისია", "მტკვარია"], points: 2 }),
    "given-find": (t) => item("given-find", `(${t}) რუკის მასშტაბია $1:50\\,000$. რა მანძილს შეესაბამება რუკაზე 4 სმ?`, { given: "მასშტაბი $1:50\\,000$, რუკაზე 4 სმ", find: "მანძილი ადგილზე", solution: "$4\\cdot 50\\,000=200\\,000\\ \\text{სმ}$", answer: "$2\\ \\text{კმ}$", lines: 7, points: 3 }),
    balance: () => item("balance", "გაათანაბრეთ რეაქციის ტოლობები.", { equations: ["6CO2 + 6H2O -> C6H12O6 + 6O2"] }),
  },
};

const EN: Record<AiType, Maker> = {
  "multiple-choice": (t, n) => item("multiple-choice", `(${t}) Choose the correct word: She ___ to school every day. (sample ${n + 1})`, { options: ["go", "goes", "going", "gone"], correct: 1 }),
  "true-false": (t, n) => item("true-false", `(${t}) The past simple of "go" is "${n % 2 === 0 ? "went" : "goed"}".`, { is_true: n % 2 === 0 }),
  "short-answer": (t) => item("short-answer", `(${t}) Write the plural of "child".`, { answer: "children" }),
  "open-answer": (t) => item("open-answer", `Write four or five sentences about: ${t}.`, { lines: 6, points: 3 }),
  matching: (t) => item("matching", `(${t}) Match the words with their opposites.`, { pairs: [{ left: "hot", right: "cold" }, { left: "early", right: "late" }, { left: "cheap", right: "expensive" }], extras: ["quiet"], points: 3 }),
  order: (t) => item("order", `(${t}) Put the parts of the day in order.`, { items: ["morning", "afternoon", "evening", "night"], points: 2 }),
  "fill-blank": (t) => item("fill-blank", `(${t}) Complete the text.`, { body: "Yesterday we visited the museum. It was very interesting, and we stayed there for two hours.", blanks: ["visited", "interesting"], points: 2 }),
  "given-find": (t) => item("given-find", `(${t}) A car travels at $60\\ \\text{km/h}$ for 2 hours. How far does it go?`, { given: "$v=60\\ \\text{km/h}$, $t=2\\ \\text{h}$", find: "$s$", solution: "$s=v\\cdot t=60\\cdot 2$", answer: "$s=120\\ \\text{km}$", lines: 7, points: 3 }),
  balance: () => item("balance", "Balance the equations.", { equations: ["2H2 + O2 -> 2H2O"] }),
};

/** `count` sample questions, going round the asked types. `shift` gives a different one for "regenerate". */
export function mockItems(request: GenerateRequest, shift = 0): AiItem[] {
  const topic = request.topic || (request.language === "en" ? "the text" : "მოცემული ტექსტი");
  const makers = request.language === "en" ? EN : KA[kind(request.subject)];
  return Array.from({ length: request.count }, (_, index) => {
    const type = request.types[(index + shift) % request.types.length];
    return makers[type](topic, index + shift);
  });
}
