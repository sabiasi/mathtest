/**
 * Biology sample (10th grade): every question type of the toolkit — label
 * the diagram, stages in order, Punnett square, pedigree, DNA → mRNA →
 * protein with the codon table, food web, ecological pyramid, dichotomous
 * key, taxonomy — plus a Latin name in italics and a chemical equation.
 */
import { HUMAN_TAXONOMY, sampleKey } from "@/lib/dichotomous";
import { sampleWeb, samplePyramid } from "@/lib/ecology";
import { labelsForParts } from "@/lib/labelDiagram";
import { TAXONOMY_RANKS, type PedigreePerson, type Question } from "@/lib/storage/types";
import { BIO_DRAWINGS } from "@/subjects/biology/drawings";
import { base, ce, fillBlank, idMaker, italic, matching, mc, open, order, rt, sampleTest, short, tf } from "./build";

const id = (n: number) => `sample-biology-q${n}`;
const next = idMaker("sample-biology-x");

const cell = BIO_DRAWINGS.find((d) => d.id === "animal-cell")!;
const LABELLED = ["უჯრედის მემბრანა", "ციტოპლაზმა", "ბირთვი", "მიტოქონდრია", "გოლჯის აპარატი"];
const cellParts = cell.parts.filter((p) => LABELLED.includes(p.ka)).map((p) => ({ x: p.x, y: p.y, name: p.ka }));

const labelDiagram: Question = {
  ...base(id(1), 3, rt("წააწერეთ ცხოველური უჯრედის ნაწილების სახელები. გამოიყენეთ ჩარჩოში მოცემული სიტყვები."), {
    tip: "ჩაშენებული ნახატი („ცხოველური უჯრედი“) და ღილაკი „ყველა ნაწილის დამატება“: ხაზები თავისით ლაგდება და არ იკვეთება. სამი რეჟიმი: ცარიელი უჯრები, ნომრები, ასოებით შესაბამისობა.",
  }),
  type: "label-diagram",
  picture: { kind: "builtin", drawing: "animal-cell" },
  pictureWidth: 85,
  labels: labelsForParts([], cellParts, cell.width, cell.height, next),
  mode: "boxes",
  wordBank: true,
  extras: ["ქლოროპლასტი", "უჯრედის კედელი"],
};

const punnett: Question = {
  ...base(
    id(9),
    3,
    rt("ბარდის თესლის ყვითელი შეფერილობა (A) დომინირებს მწვანეზე (a). შეაჯვარეს ორი ჰეტეროზიგოტური მცენარე. შეავსეთ პენეტის მესერი და დაწერეთ თანაფარდობები."),
    { tip: "მშობლების გენოტიპები იწერება ასე: Aa, AaBb, XᴬXᵃ. მესერს და თანაფარდობებს პროგრამა თვითონ ითვლის; ერთი უჯრა მოსწავლეს ნიმუშად აქვს მოცემული." },
  ),
  type: "punnett",
  mother: "Aa",
  father: "Aa",
  shown: ["0:0"],
  blankGametes: false,
  showParents: true,
  askRatios: true,
  traits: { a: { dominant: "ყვითელი", recessive: "მწვანე" } },
};

/** Albinism (autosomal recessive): two unaffected parents with an affected son → both are carriers (Aa). */
const person = (key: string, sex: PedigreePerson["sex"], gen: number, slot: number, extra: Partial<PedigreePerson> = {}): PedigreePerson => ({
  id: `sample-biology-p${key}`,
  sex,
  status: "unaffected",
  gen,
  slot,
  deceased: false,
  text: "",
  ask: false,
  answer: "",
  ...extra,
});
const pedigree: Question = {
  ...base(
    id(10),
    3,
    rt("საგვარეულო ხეზე ნაჩვენებია ალბინიზმის მემკვიდრეობა. დაადგინეთ, დომინანტურია თუ რეცესიული ეს ნიშანი, და უჯრებში ჩაწერეთ აღნიშნული ადამიანების გენოტიპები."),
    { tip: "საგვარეულო ხე: დააჭირეთ ადამიანს — დაუმატეთ მეუღლე ან შვილი, მონიშნეთ დაავადებული / მატარებელი. „უჯრა გენოტიპისთვის“ მოსწავლეს ცარიელ უჯრას უხატავს, პასუხების ფურცელზე კი გენოტიპი ჩანს." },
  ),
  type: "pedigree",
  people: [
    person("1", "male", 0, 1, { ask: true, answer: "Aa" }),
    person("2", "female", 0, 2, { ask: true, answer: "Aa" }),
    person("3", "female", 1, 0),
    person("4", "male", 1, 1, { status: "affected", ask: true, answer: "aa" }),
    person("5", "female", 1, 2),
    person("6", "male", 1, 3),
    person("7", "male", 2, 2),
    person("8", "female", 2, 3),
  ],
  couples: [
    { id: "sample-biology-c1", a: "sample-biology-p1", b: "sample-biology-p2", children: ["sample-biology-p3", "sample-biology-p4", "sample-biology-p5"] },
    { id: "sample-biology-c2", a: "sample-biology-p5", b: "sample-biology-p6", children: ["sample-biology-p7", "sample-biology-p8"] },
  ],
  legend: true,
  numbers: true,
};

const codonTable: Question = { ...base(id(11), 0, rt("გენეტიკური კოდის ცხრილი (გამოიყენეთ მომდევნო დავალებაში).")), type: "codon-table", legend: true };

const sequence: Question = {
  ...base(id(12), 3, rt("მოცემულია დნმ-ის მატრიცული ჯაჭვი. დაწერეთ კომპლემენტარული ჯაჭვი, ი-რნმ და ამინომჟავების თანმიმდევრობა."), {
    tip: "ჩაწერეთ მხოლოდ მოცემული ჯაჭვი — კომპლემენტარულ ჯაჭვს, ი-რნმ-ს და ცილას პროგრამა თვითონ ითვლის (Stop კოდონზე ჩერდება).",
  }),
  type: "sequence",
  given: "TAC GGA CTT ATT",
  tasks: ["complement", "mrna", "protein"],
  strand: "template",
  example: false,
};

const foodWeb: Question = {
  ...base(id(13), 2, rt("შეავსეთ ტყის კვებითი ქსელის ცარიელი უჯრები. ისარი ენერგიის გადაცემის მიმართულებას აჩვენებს."), {
    tip: "კვებითი ქსელი: ორგანიზმები ბადეზეა; ისრები — „საკვები → მჭამელი“. ორგანიზმის „დამალვა“ ფურცელზე ცარიელ უჯრას ტოვებს.",
  }),
  type: "food-web",
  ...sampleWeb(next),
  legend: true,
};

const pyramid: Question = {
  ...base(id(14), 2, rt("შეავსეთ ენერგიის პირამიდა (10 %-ის წესი).")),
  type: "pyramid",
  levels: samplePyramid("energy", next),
};

const key: Question = {
  ...base(id(15), 2, rt("სარკვევის გამოყენებით დაასახელეთ ორგანიზმები.")),
  type: "dichotomous-key",
  couplets: sampleKey(next),
  style: "tree",
};

const taxonomy: Question = {
  ...base(id(16), 2, rt("შეავსეთ ადამიანის სისტემატიკური რანგები.")),
  type: "taxonomy",
  organism: HUMAN_TAXONOMY.organism,
  plants: false,
  ranks: TAXONOMY_RANKS.map((rank) => ({ rank, value: HUMAN_TAXONOMY.ranks[rank], hide: rank === "class" || rank === "order" || rank === "family" })),
};

export const biologySample = () =>
  sampleTest({
    subjectId: "biology",
    title: "ნიმუში — უჯრედი, გენეტიკა და ეკოლოგია",
    subject: "ბიოლოგია",
    grade: "მე-10 კლასი",
    timeLimitMinutes: 60,
    instructions: "ყურადღებით წაიკითხეთ დავალებები. ნახაზებზე წარწერები გააკეთეთ მკაფიოდ. გენეტიკის ამოცანებში ჩაწერეთ გენოტიპები.",
    questions: [
      labelDiagram,
      mc(id(2), 1, rt("რომელ ორგანოიდში მიმდინარეობს ფოტოსინთეზი?"), ["ქლოროპლასტში", "მიტოქონდრიაში", "რიბოსომაში", "ლიზოსომაში"], 0),
      tf(id(3), 1, rt("ერითროციტები ორგანიზმში ჟანგბადს გადაიტანენ."), true),
      short(id(4), 1, rt("დაწერეთ ადამიანის სახეობის ლათინური სახელი."), rt(italic("Homo sapiens")), {
        tip: "ლათინური სახელის ინსტრუმენტი (ჩანართი „ბიოლოგია“) სწორად წერს და დახრილად სვამს: „homo SAPIENS“ → Homo sapiens.",
      }),
      short(id(5), 2, rt("დაწერეთ ფოტოსინთეზის ჯამური ტოლობა."), rt(ce("6CO2 + 6H2O ->[\\text{სინათლე}] C6H12O6 + 6O2")), {
        tip: "ფოტოსინთეზისა და სუნთქვის მზა ტოლობები — ჩანართი „ქიმიური ფორმულები“.",
      }),
      matching(
        id(6),
        2,
        rt("შეუსაბამეთ ორგანოიდები მათ ფუნქციებს."),
        ["ორგანოიდი", "ფუნქცია"],
        [
          ["მიტოქონდრია", "უჯრედული სუნთქვა (ატფ-ის სინთეზი)"],
          ["რიბოსომა", "ცილის სინთეზი"],
          ["ბირთვი", "მემკვიდრული ინფორმაციის შენახვა"],
          ["ლიზოსომა", "ნივთიერებების დაშლა უჯრედში"],
        ],
        ["ფოტოსინთეზი"],
      ),
      fillBlank(
        id(7),
        2,
        rt("შეავსეთ გამოტოვებული სიტყვები ჩარჩოში მოცემული სიტყვებით."),
        "ფოტოსინთეზის დროს მცენარე შთანთქავს ნახშირორჟანგს და გამოყოფს ჟანგბადს.",
        [{ word: "ნახშირორჟანგს" }, { word: "ჟანგბადს" }],
        { mode: "bank", extras: ["აზოტს", "წყალბადს"] },
      ),
      order(id(8), 2, rt("დაალაგეთ მიტოზის ფაზები სწორი თანმიმდევრობით."), ["პროფაზა", "მეტაფაზა", "ანაფაზა", "ტელოფაზა"], {
        tip: "ეტაპები ინახება სწორი თანმიმდევრობით; ფურცელზე ისინი აირევა და ასოებით აღინიშნება (ყველა ვარიანტში სხვადასხვანაირად).",
      }),
      punnett,
      pedigree,
      codonTable,
      sequence,
      foodWeb,
      pyramid,
      key,
      taxonomy,
      open(id(17), 3, rt("ახსენით, რატომ გადადის ენერგიის მხოლოდ დაახლოებით 10 % ერთი ტროფიკული დონიდან მეორეზე."), 5),
    ],
  });
