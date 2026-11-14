/**
 * Physics sample (9th grade): every question type including
 * მოცემულია / საპოვნელია | ამოხსნა, an electric circuit and a force diagram
 * drawn with the physics tools, units, constants, vectors and ready formulas.
 */
import type { CircuitDiagram, ForceDiagram, Question } from "@/lib/storage/types";
import { diagramSize } from "@/subjects/physics/diagrams/DiagramView";
import { base, fillBlank, m, matching, mc, open, rt, sampleTest, short, tf } from "./build";

const id = (n: number) => `sample-physics-q${n}`;

/** R₁ and R₂ in series with a battery (12 V), a closed switch and an ammeter. */
const CIRCUIT: CircuitDiagram = {
  kind: "circuit",
  cols: 4,
  rows: 2,
  elements: [
    { at: "h:0:0", part: "wire", label: "", flipped: false },
    { at: "h:1:0", part: "resistor", label: "R1", flipped: false },
    { at: "h:2:0", part: "resistor", label: "R2", flipped: false },
    { at: "h:3:0", part: "wire", label: "", flipped: false },
    { at: "v:4:0", part: "wire", label: "", flipped: false },
    { at: "v:4:1", part: "ammeter", label: "", flipped: false },
    { at: "h:3:2", part: "wire", label: "", flipped: false },
    { at: "h:2:2", part: "switch-closed", label: "", flipped: false },
    { at: "h:1:2", part: "battery", label: "12 ვ", flipped: false },
    { at: "h:0:2", part: "wire", label: "", flipped: false },
    { at: "v:0:1", part: "wire", label: "", flipped: false },
    { at: "v:0:0", part: "wire", label: "", flipped: false },
  ],
};

/** A block resting on a 30° incline: gravity, the normal force and static friction (up the slope). */
const FORCES: ForceDiagram = {
  kind: "forces",
  body: "box",
  surface: "incline",
  inclineAngle: 30,
  vectorLabels: true,
  forces: [
    { id: "sample-physics-f1", angle: 270, length: 2, label: "mg" },
    { id: "sample-physics-f2", angle: 120, length: 2, label: "N" },
    { id: "sample-physics-f3", angle: 30, length: 1, label: "F_ხ" },
  ],
};

const diagramImage = (key: string, diagram: CircuitDiagram | ForceDiagram, widthPercent: number) => ({
  id: `${key}-img`,
  imageId: "",
  diagram,
  ...diagramSize(diagram),
  widthPercent,
  position: "right" as const,
  caption: "",
});

const givenFind: Question = {
  ...base(
    id(11),
    5,
    rt("ავტომობილი უძრაობის მდგომარეობიდან იწყებს მოძრაობას 2 მ/წმ² აჩქარებით. რა სიჩქარეს შეიძენს და რა მანძილს გაივლის ის 5 წამში?"),
    { tip: "„მოცემულია / საპოვნელია | ამოხსნა“ ჩარჩო: მოსწავლის ფურცელზე ცარიელია, თქვენი ამოხსნა და პასუხი მხოლოდ პასუხების ფურცელზე ჩანს." },
  ),
  type: "given-find",
  lines: 8,
  // Separate formulas (not one long one), so the narrow "Given" column can wrap between them.
  given: rt(m("v_{0}=0"), "; ", m("a=2\\,\\text{მ/წმ}^{2}"), "; ", m("t=5\\,\\text{წმ}")),
  find: rt(m("v-?"), "; ", m("s-?")),
  solution: rt(m("v=v_{0}+at=2\\cdot5=10\\,\\text{მ/წმ}"), "; ", m("s=\\frac{at^{2}}{2}=\\frac{2\\cdot5^{2}}{2}=25\\,\\text{მ}")),
  answer: rt(m("v=10\\,\\text{მ/წმ};\\ s=25\\,\\text{მ}")),
};

export const physicsSample = () =>
  sampleTest({
    subjectId: "physics",
    title: "ნიმუში — მექანიკა და ელექტრობა",
    subject: "ფიზიკა",
    grade: "მე-9 კლასი",
    timeLimitMinutes: 45,
    instructions: "ამოცანებში ჩაწერეთ მოცემულობა, ამოხსნა და პასუხი ერთეულებით. აიღეთ g = 9,8 მ/წმ².",
    questions: [
      mc(id(1), 1, rt("რომელია ძალის ერთეული SI სისტემაში?"), ["ნიუტონი", "ჯოული", "ვატი", "პასკალი"], 0),
      mc(id(2), 1, rt("სხეულის მასაა 2 კგ, სიჩქარე — 3 მ/წმ. რისი ტოლია მისი კინეტიკური ენერგია?"), [rt(m("9\\,\\text{ჯ}")), rt(m("6\\,\\text{ჯ}")), rt(m("18\\,\\text{ჯ}")), rt(m("3\\,\\text{ჯ}"))], 0, {
        tip: "გამოთვლა: E = mv²/2 = 2·9/2 = 9 ჯ. 28 მზა ფორმულა — ჩანართი „ფორმულები“.",
      }),
      mc(
        id(3),
        1,
        rt("სხეულზე მოქმედებს ორი ურთიერთმართობული ძალა: ", m("\\vec{F}_{1}"), " = 3 ნ და ", m("\\vec{F}_{2}"), " = 4 ნ. რისი ტოლია ტოლქმედის მოდული?"),
        [rt(m("5\\,\\text{ნ}")), rt(m("7\\,\\text{ნ}")), rt(m("1\\,\\text{ნ}")), rt(m("12\\,\\text{ნ}"))],
        0,
        { tip: "ვექტორის ისარი — ჩანართი „ვექტორები, Δ, 10ⁿ“. პასუხი: √(3² + 4²) = 5 ნ." },
      ),
      tf(id(4), 1, rt("დედამიწის ზედაპირთან თავისუფალი ვარდნის აჩქარება დაახლოებით 9,8 მ/წმ²-ია."), true),
      tf(id(5), 1, rt("თანაბარი წრფივი მოძრაობისას სხეულის აჩქარება ნულისგან განსხვავებულია."), false),
      short(id(6), 1, rt("გამოსახეთ 72 კმ/სთ მ/წმ-ში."), rt(m("72\\,\\text{კმ/სთ}=\\frac{72\\,000\\,\\text{მ}}{3600\\,\\text{წმ}}=20\\,\\text{მ/წმ}")), {
        tip: "ერთეულები — ჩანართი „ერთეულები“: ქართული (მ/წმ) ან ლათინური (m/s) ჩაწერა, არჩევანი ახსოვს.",
      }),
      short(
        id(7),
        2,
        rt("მზიდან დედამიწამდე მანძილია ", m("1{,}5\\cdot10^{11}"), " მ. რამდენ ხანში აღწევს მზის სინათლე დედამიწას? (", m("c=3\\cdot10^{8}"), " მ/წმ)"),
        rt(m("t=\\frac{s}{c}=\\frac{1{,}5\\cdot10^{11}}{3\\cdot10^{8}}=500\\,\\text{წმ}")),
        { tip: "c, g და სხვა მუდმივები — ჩანართი „მუდმივები“ (მიიტანეთ მაუსი ღილაკზე — ნახავთ მნიშვნელობას)." },
      ),
      short(
        id(8),
        3,
        rt("ნახაზზე: ", m("R_{1}=4\\,\\Omega"), ", ", m("R_{2}=6\\,\\Omega"), ", დენის წყაროს ძაბვაა 12 ვ. რას აჩვენებს ამპერმეტრი? რისი ტოლია ძაბვა ", m("R_{2}"), " რეზისტორზე?"),
        rt(m("I=\\frac{U}{R_{1}+R_{2}}=\\frac{12}{10}=1{,}2\\,\\text{ა}"), "; ", m("U_{2}=IR_{2}=1{,}2\\cdot6=7{,}2\\,\\text{ვ}")),
        {
          images: [diagramImage(id(8), CIRCUIT, 50)],
          tip: "წრედი დახატულია ღილაკით „ელექტრული წრედი“: ნაწილს (რეზისტორი, ბატარეა, ამპერმეტრი…) ორ წერტილს შორის სვამთ. „R1“ ქაღალდზე იბეჭდება როგორც R₁.",
        },
      ),
      short(
        id(9),
        2,
        rt("ძელაკი უძრავად დევს დახრილ სიბრტყეზე. დაასახელეთ ნახაზზე გამოსახული ძალები."),
        "mg — სიმძიმის ძალა; N — საყრდენის რეაქციის ძალა; Fხ — უძრაობის ხახუნის ძალა",
        {
          images: [diagramImage(id(9), FORCES, 40)],
          tip: "ძალების ნახაზი: აირჩიეთ სხეული და ზედაპირი (აქ — დახრილი სიბრტყე 30°), შემდეგ ღილაკებით mg, N, Fხ ძალები თავისით სწორად შემობრუნდება.",
        },
      ),
      matching(
        id(10),
        2,
        rt("შეუსაბამეთ ფიზიკური სიდიდეები მათ ერთეულებს."),
        ["სიდიდე", "ერთეული"],
        [
          ["ძალა", "ნიუტონი (ნ)"],
          ["სიმძლავრე", "ვატი (ვტ)"],
          ["ელექტრული წინაღობა", rt("ომი (", m("\\Omega"), ")")],
          ["მუშაობა", "ჯოული (ჯ)"],
        ],
        ["პასკალი (პა)", "ამპერი (ა)"],
      ),
      givenFind,
      fillBlank(
        id(12),
        2,
        rt("შეავსეთ გამოტოვებული სიტყვები ჩარჩოში მოცემული სიტყვებით."),
        "ომის კანონის თანახმად, წრედის უბანში დენის ძალა ძაბვის პირდაპირპროპორციულია, ხოლო წინაღობის — უკუპროპორციული.",
        [{ word: "ძაბვის" }, { word: "წინაღობის" }],
        { mode: "bank", extras: ["მასის", "სიჩქარის"] },
      ),
      open(id(13), 3, rt("ახსენით, რატომ იხრება ავტობუსის მგზავრი წინ, როცა ავტობუსი უეცრად ამუხრუჭებს."), 4),
    ],
  });
