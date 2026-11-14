/**
 * Chemistry sample (9th grade): every question type including "balance the
 * equation" and მოცემულია / საპოვნელია, chemical formulas typed like
 * "H2SO4", a reaction with conditions and a gas arrow, oxidation states,
 * and a structural formula drawn with the structure tool.
 */
import type { Question, StructureDiagram } from "@/lib/storage/types";
import { STRUCTURE_TEMPLATES } from "@/subjects/chemistry/structure/normalize";
import { diagramSize } from "@/subjects/physics/diagrams/DiagramView";
import { base, ce, fillBlank, m, matching, mc, open, rt, sampleTest, short, tf } from "./build";

const id = (n: number) => `sample-chemistry-q${n}`;
const ETHANOL: StructureDiagram = STRUCTURE_TEMPLATES.find((t) => t.id === "ethanol")!.make();

const balance: Question = {
  ...base(id(9), 3, rt("გაათანაბრეთ რეაქციების ტოლობები: ჩაწერეთ კოეფიციენტები უჯრებში."), {
    tip: "მასწავლებელი წერს გათანაბრებულ ტოლობას („2H2 + O2 -> 2H2O“); პროგრამა ითვლის ატომებს და ამოწმებს. ფურცელზე კოეფიციენტების ადგილას ცარიელი უჯრებია.",
  }),
  type: "balance",
  equations: [
    { id: `${id(9)}-e1`, balanced: "2H2 + O2 -> 2H2O" },
    { id: `${id(9)}-e2`, balanced: "4Al + 3O2 -> 2Al2O3" },
    { id: `${id(9)}-e3`, balanced: "CH4 + 2O2 -> CO2 + 2H2O" },
  ],
};

const givenFind: Question = {
  ...base(id(12), 4, rt("რა მასის წყალი წარმოიქმნება 4 გ წყალბადის ჟანგბადში სრული წვისას?")),
  type: "given-find",
  lines: 8,
  given: rt(m("m(\\mathrm{H_2})=4\\,\\text{გ}")),
  find: rt(m("m(\\mathrm{H_2O})-?")),
  solution: rt(
    ce("2H2 + O2 -> 2H2O"),
    "; ",
    m("n(\\mathrm{H_2})=\\frac{4}{2}=2\\,\\text{მოლი}"),
    "; ",
    m("n(\\mathrm{H_2O})=n(\\mathrm{H_2})=2\\,\\text{მოლი}"),
    "; ",
    m("m(\\mathrm{H_2O})=2\\cdot18=36\\,\\text{გ}"),
  ),
  answer: rt(m("36\\,\\text{გ}")),
};

export const chemistrySample = () =>
  sampleTest({
    subjectId: "chemistry",
    title: "ნიმუში — ნივთიერებები და ქიმიური რეაქციები",
    subject: "ქიმია",
    grade: "მე-9 კლასი",
    timeLimitMinutes: 45,
    instructions: "შეგიძლიათ გამოიყენოთ პერიოდული სისტემა. ამოცანებში ჩაწერეთ რეაქციის ტოლობა და სრული ამოხსნა.",
    questions: [
      mc(id(1), 1, rt("რომელი მჟავაა ", ce("H2SO4"), "?"), ["გოგირდმჟავა", "მარილმჟავა", "აზოტმჟავა", "ფოსფორმჟავა"], 0, {
        tip: "ქიმიური ფორმულა ჩაწერილია ღილაკით „ქიმიური ფორმულა“: უბრალოდ აკრიფეთ H2SO4 — ციფრები თავისით დაიწერება ქვემოთ.",
      }),
      mc(id(2), 1, rt("რისი ტოლია ", ce("H2SO4"), "-ის მოლური მასა?"), ["98 გ/მოლი", "96 გ/მოლი", "49 გ/მოლი", "100 გ/მოლი"], 0, {
        tip: "2·1 + 32 + 4·16 = 98. ელემენტების ცხრილი ქართული სახელებით — ჩანართი „ფორმულები“ → პერიოდული სისტემა.",
      }),
      tf(id(3), 1, rt(ce("NaCl"), "-ში ქიმიური ბმა იონურია."), true),
      tf(id(4), 1, rt(ce("CO2"), " ფუძე ოქსიდია."), false),
      short(id(5), 2, rt("განსაზღვრეთ მანგანუმის ჟანგვის ხარისხი ", ce("KMnO4"), "-ში."), rt("+7: ", ce("K\\overset{+7}{Mn}O4")), {
        tip: "ჟანგვის ხარისხი ელემენტის თავზე — ჩანართი „ჟანგვის ხარისხი“: ელემენტი + ხარისხი → ჩასმა.",
      }),
      short(id(6), 1, rt("რამდენი ელექტრონია ", ce("Na+"), " იონში?"), "10"),
      short(id(7), 2, rt("დაწერეთ კალციუმის კარბონატის გახურებით დაშლის რეაქციის ტოლობა."), rt(ce("CaCO3 ->[t^\\circ] CaO + CO2 ^")), {
        tip: "ისარი პირობით (t° ზემოთ) — ჩანართი „რეაქციები“ → ისრის ინსტრუმენტი; ↑ (აირი) — იქვე.",
      }),
      matching(
        id(8),
        2,
        rt("შეუსაბამეთ ფორმულები ნივთიერებების სახელებს."),
        ["ფორმულა", "სახელი"],
        [
          [rt(ce("NaOH")), "ნატრიუმის ჰიდროქსიდი"],
          [rt(ce("CaCO3")), "კალციუმის კარბონატი"],
          [rt(ce("HCl")), "ქლორწყალბადმჟავა (მარილმჟავა)"],
          [rt(ce("CO2")), "ნახშირბადის (IV) ოქსიდი"],
        ],
        ["კალციუმის ოქსიდი", "ნატრიუმის ქლორიდი"],
      ),
      balance,
      short(id(10), 2, rt("ნახაზზე მოცემულია ნივთიერების სტრუქტურული ფორმულა. დაწერეთ მისი მოლეკულური ფორმულა და დაასახელეთ ნივთიერება."), rt(ce("C2H6O"), " (", ce("C2H5OH"), ") — ეთანოლი"), {
        images: [{ id: `${id(10)}-img`, imageId: "", diagram: ETHANOL, ...diagramSize(ETHANOL), widthPercent: 35, position: "right", caption: "" }],
        tip: "სტრუქტურული ფორმულა დახატულია ღილაკით „სტრუქტურული ფორმულა“ (შაბლონი „ეთანოლი“); ატომები წერტილებზეა, ბმები — მათ შორის.",
      }),
      fillBlank(
        id(11),
        2,
        rt("აირჩიეთ სწორი სიტყვა თითოეული გამოტოვებისთვის."),
        "ქიმიური ელემენტის რიგითი ნომერი ატომის ბირთვში პროტონების რაოდენობის ტოლია. მთავარი ქვეჯგუფის ელემენტის ჯგუფის ნომერი გარე შრის ელექტრონების რაოდენობის ტოლია.",
        [
          { word: "პროტონების", options: ["ნეიტრონების", "ნუკლონების"] },
          { word: "ელექტრონების", options: ["ნეიტრონების", "ენერგეტიკული დონეების"] },
        ],
        { mode: "choice" },
      ),
      givenFind,
      open(id(13), 3, rt("ახსენით, რატომ არის კალიუმი ნატრიუმზე უფრო აქტიური მეტალი."), 4),
    ],
  });
