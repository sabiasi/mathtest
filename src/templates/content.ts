/**
 * THE TEMPLATE LIBRARY — the questions. Original content written for
 * Rapido (no textbook or exam was copied). Read on the SERVER only
 * (see catalog.ts and /api/templates/[id]).
 *
 * Built with the same helpers as the sample tests (src/samples/build.ts),
 * and every template goes through normalizeTest.
 */
import { DEFAULT_PRINT_OPTIONS, DEFAULT_VARIANTS } from "@/lib/storage/types";
import { normalizeTest } from "@/lib/storage/migrate";
import type { Question, Test } from "@/lib/storage/types";
import type { RichText } from "@/lib/richText";
import { base, ce, fillBlank, m, matching, mc, open, order, rt, short, tf } from "@/samples/build";
import { TEMPLATES, TEMPLATE_PREFIX, templateInfo } from "./catalog";

const givenFind = (id: string, points: number, text: RichText, given: RichText, find: RichText, solution: RichText, answer: RichText): Question => ({
  ...base(id, points, text), type: "given-find", lines: 8, given, find, solution, answer,
});
const balance = (id: string, points: number, text: RichText, equations: string[]): Question => ({
  ...base(id, points, text), type: "balance", equations: equations.map((balanced, i) => ({ id: `${id}-e${i + 1}`, balanced })),
});

type Body = { instructions: string; minutes: number; questions: (q: (n: number) => string) => Question[]; level?: Test["level"] };

const KA = "ყურადღებით წაიკითხეთ თითოეული დავალება. პასუხები ჩაწერეთ გარკვევით.";

const BODIES: Record<string, Body> = {
  "math-7-linear": {
    instructions: KA, minutes: 30,
    questions: (q) => [
      mc(q(1), 1, rt("ამოხსენით განტოლება: ", m("3x-7=11")), [rt(m("x=4")), rt(m("x=6")), rt(m("x=\\frac{4}{3}")), rt(m("x=18"))], 1),
      tf(q(2), 1, rt("რიცხვი ", m("-2"), " არის განტოლების ", m("5x+10=0"), " ფესვი."), true),
      short(q(3), 2, rt("ამოხსენით განტოლება: ", m("2(x-3)=x+5")), rt(m("x=11"))),
      matching(q(4), 3, rt("დააკავშირეთ განტოლება მის ფესვთან."), ["განტოლება", "ფესვი"], [[rt(m("x+9=4")), rt(m("-5"))], [rt(m("4x=28")), rt(m("7"))], [rt(m("\\frac{x}{3}=2")), rt(m("6"))]], [rt(m("5"))]),
      short(q(5), 2, rt("რა რიცხვი უნდა ჩაიწეროს ", m("a"), "-ს ნაცვლად, რომ განტოლების ", m("ax=12"), " ფესვი იყოს ", m("3"), "?"), rt(m("a=4"))),
      open(q(6), 3, rt("ნიკას და ანას ერთად 46 ლარი აქვთ. ნიკას ანაზე 8 ლარით მეტი აქვს. შეადგინეთ განტოლება და იპოვეთ, რამდენი ლარი აქვს თითოეულს."), 7),
    ],
  },
  "georgian-6-speech": {
    instructions: KA, minutes: 30,
    questions: (q) => [
      mc(q(1), 1, rt("რომელი სიტყვაა არსებითი სახელი?"), ["ლამაზი", "მდინარე", "კითხულობს", "სწრაფად"], 1),
      mc(q(2), 1, rt("რომელი სიტყვაა ზმნა?"), ["მწვანე", "ბავშვი", "წერს", "ხვალ"], 2),
      tf(q(3), 1, rt("ზედსართავი სახელი გამოხატავს საგნის ნიშან-თვისებას."), true),
      matching(q(4), 3, rt("დააკავშირეთ სიტყვა მეტყველების ნაწილთან."), ["სიტყვა", "მეტყველების ნაწილი"], [["წიგნი", "არსებითი სახელი"], ["მაღალი", "ზედსართავი სახელი"], ["დარბის", "ზმნა"], ["ხუთი", "რიცხვითი სახელი"]], ["ზმნიზედა"]),
      fillBlank(q(5), 2, rt("ჩაწერეთ გამოტოვებული სიტყვები."), "პატარა გოგონა ეზოში თამაშობს. მაღალი ხე ჩრდილს აფენს.", [{ word: "თამაშობს", hint: "ზმნა" }, { word: "მაღალი", hint: "ზედსართავი" }], { mode: "bank", extras: ["სწრაფად"] }),
      open(q(6), 3, rt("დაწერეთ სამი წინადადება თქვენი საყვარელი ადგილის შესახებ. თითოეულში ხაზი გაუსვით ერთ ზედსართავ სახელს."), 6),
    ],
  },
  "english-a2-past": {
    instructions: "Read each task carefully. Write your answers clearly.", minutes: 30, level: "A2",
    questions: (q) => [
      mc(q(1), 1, rt("Yesterday we ___ to the park."), ["go", "goes", "went", "going"], 2),
      mc(q(2), 1, rt("She ___ her homework last night."), ["didn't finish", "doesn't finish", "not finished", "don't finish"], 0),
      tf(q(3), 1, rt("The past simple of \"buy\" is \"bought\"."), true),
      matching(q(4), 3, rt("Match the verbs with their past simple forms."), ["Verb", "Past simple"], [["see", "saw"], ["write", "wrote"], ["take", "took"], ["play", "played"]], ["writed"]),
      fillBlank(q(5), 2, rt("Complete the text with the correct words."), "Last summer my family visited Batumi. We stayed there for a week and swam in the sea every day.", [{ word: "visited" }, { word: "swam" }], { mode: "bank", extras: ["swimmed"] }),
      open(q(6), 3, rt("Write four or five sentences about what you did last weekend. Use the past simple."), 6),
    ],
  },
  "history-9-ancient": {
    instructions: KA, minutes: 35,
    questions: (q) => [
      mc(q(1), 1, rt("რომელი მდინარის ნაპირებზე ჩამოყალიბდა ძველი ეგვიპტის ცივილიზაცია?"), ["ტიგროსი", "ნილოსი", "ინდი", "ევფრატი"], 1),
      tf(q(2), 1, rt("შუამდინარეთი მდებარეობდა მდინარეებს ტიგროსსა და ევფრატს შორის."), true),
      matching(q(3), 3, rt("დააკავშირეთ ცნება მის განმარტებასთან."), ["ცნება", "განმარტება"], [["ფარაონი", "ძველი ეგვიპტის მმართველი"], ["პოლისი", "ქალაქ-სახელმწიფო ძველ საბერძნეთში"], ["სენატი", "რომის რესპუბლიკის უმაღლესი საბჭო"]], ["მეომართა რაზმი"]),
      order(q(4), 2, rt("დაალაგეთ მოვლენები ქრონოლოგიურად, უძველესიდან დაწყებული."), ["გიზის დიდი პირამიდების აგება", "პირველი ოლიმპიური თამაშები საბერძნეთში", "რომის რესპუბლიკის დაარსება", "დასავლეთ რომის იმპერიის დაცემა"]),
      short(q(5), 1, rt("რა მასალაზე წერდნენ შუამდინარეთში ლურსმული დამწერლობით?"), "თიხის ფირფიტებზე"),
      open(q(6), 3, rt("ახსენით, რატომ ჩნდებოდა ძველი ცივილიზაციები დიდი მდინარეების ნაპირებზე. მოიყვანეთ ორი მიზეზი."), 7),
    ],
  },
  "physics-8-motion": {
    instructions: KA, minutes: 35,
    questions: (q) => [
      mc(q(1), 1, rt("რომელი ფორმულით გამოითვლება თანაბარი მოძრაობის სიჩქარე?"), [rt(m("v=s\\cdot t")), rt(m("v=\\frac{s}{t}")), rt(m("v=\\frac{t}{s}")), rt(m("v=s+t"))], 1),
      short(q(2), 1, rt("გამოსახეთ მ/წმ-ში: ", m("72\\ \\text{კმ/სთ}")), rt(m("20\\ \\text{მ/წმ}"))),
      tf(q(3), 1, rt("თანაბარი მოძრაობისას სხეული ტოლ დროში ტოლ მანძილებს გადის."), true),
      givenFind(q(4), 3, rt("ველოსიპედისტი 15 წუთში თანაბრად გადის 4,5 კმ-ს. იპოვეთ მისი სიჩქარე მ/წმ-ში."), rt(m("t=15\\ \\text{წთ}=900\\ \\text{წმ}"), ", ", m("s=4{,}5\\ \\text{კმ}=4500\\ \\text{მ}")), rt(m("v")), rt(m("v=\\frac{s}{t}=\\frac{4500}{900}")), rt(m("v=5\\ \\text{მ/წმ}"))),
      givenFind(q(5), 3, rt("მატარებელი მოძრაობს ", m("25\\ \\text{მ/წმ}"), " სიჩქარით. რა მანძილს გაივლის 2 წუთში?"), rt(m("v=25\\ \\text{მ/წმ}"), ", ", m("t=2\\ \\text{წთ}=120\\ \\text{წმ}")), rt(m("s")), rt(m("s=v\\cdot t=25\\cdot 120")), rt(m("s=3000\\ \\text{მ}=3\\ \\text{კმ}"))),
      open(q(6), 2, rt("მოიყვანეთ თანაბარი და არათანაბარი მოძრაობის თითო მაგალითი ყოველდღიური ცხოვრებიდან."), 5),
    ],
  },
  "math-9-quadratic": {
    instructions: KA, minutes: 40,
    questions: (q) => [
      mc(q(1), 1, rt("რას უდრის განტოლების ", m("x^{2}-5x+6=0"), " დისკრიმინანტი?"), [rt(m("1")), rt(m("49")), rt(m("-1")), rt(m("25"))], 0),
      short(q(2), 2, rt("ამოხსენით განტოლება: ", m("x^{2}-5x+6=0")), rt(m("x_{1}=2"), "; ", m("x_{2}=3"))),
      tf(q(3), 1, rt("განტოლებას ", m("x^{2}+4=0"), " ნამდვილი ფესვები არ აქვს."), true),
      matching(q(4), 3, rt("დააკავშირეთ განტოლება მისი ფესვების ჯამთან (ვიეტის თეორემა)."), ["განტოლება", "ფესვების ჯამი"], [[rt(m("x^{2}-7x+10=0")), rt(m("7"))], [rt(m("x^{2}+3x-4=0")), rt(m("-3"))], [rt(m("x^{2}-9=0")), rt(m("0"))]], [rt(m("10"))]),
      short(q(5), 2, rt("იპოვეთ ", m("c"), ", თუ განტოლების ", m("x^{2}-6x+c=0"), " ერთ-ერთი ფესვია ", m("2"), "."), rt(m("c=8"))),
      open(q(6), 4, rt("მართკუთხედის სიგრძე სიგანეზე 3 სმ-ით მეტია, ფართობი კი ", m("40\\ \\text{სმ}^{2}"), "-ია. იპოვეთ მართკუთხედის გვერდები."), 8),
    ],
  },
  "physics-9-electric": {
    instructions: KA, minutes: 40,
    questions: (q) => [
      mc(q(1), 1, rt("რომელი ფორმულა გამოხატავს ომის კანონს წრედის უბნისთვის?"), [rt(m("I=U\\cdot R")), rt(m("I=\\frac{U}{R}")), rt(m("I=\\frac{R}{U}")), rt(m("U=\\frac{I}{R}"))], 1),
      matching(q(2), 3, rt("დააკავშირეთ ფიზიკური სიდიდე მის ერთეულთან."), ["სიდიდე", "ერთეული"], [["დენის ძალა", "ამპერი"], ["ძაბვა", "ვოლტი"], ["წინაღობა", "ომი"]], ["ვატი"]),
      tf(q(3), 1, rt("მიმდევრობით შეერთებულ გამტარებში დენის ძალა ერთნაირია."), true),
      givenFind(q(4), 3, rt("გამტარის წინაღობაა ", m("12\\ \\Omega"), ", მის ბოლოებზე ძაბვა კი ", m("6\\ \\text{ვ}"), ". იპოვეთ დენის ძალა."), rt(m("R=12\\ \\Omega"), ", ", m("U=6\\ \\text{ვ}")), rt(m("I")), rt(m("I=\\frac{U}{R}=\\frac{6}{12}")), rt(m("I=0{,}5\\ \\text{ა}"))),
      short(q(5), 2, rt("ორი რეზისტორი, ", m("4\\ \\Omega"), " და ", m("6\\ \\Omega"), ", შეერთებულია მიმდევრობით. რას უდრის საერთო წინაღობა?"), rt(m("10\\ \\Omega"))),
      short(q(6), 2, rt("ორი ერთნაირი რეზისტორი, თითო ", m("8\\ \\Omega"), ", შეერთებულია პარალელურად. რას უდრის საერთო წინაღობა?"), rt(m("4\\ \\Omega"))),
    ],
  },
  "chemistry-8-substances": {
    instructions: KA, minutes: 35,
    questions: (q) => [
      mc(q(1), 1, rt("რომელია მარტივი ნივთიერება?"), [rt(ce("H2O")), rt(ce("O2")), rt(ce("CO2")), rt(ce("NaCl"))], 1),
      tf(q(2), 1, rt("წყლის მოლეკულა შედგება წყალბადის ორი და ჟანგბადის ერთი ატომისგან."), true),
      matching(q(3), 3, rt("დააკავშირეთ ნივთიერება მის ფორმულასთან."), ["ნივთიერება", "ფორმულა"], [["ნახშირორჟანგი", rt(ce("CO2"))], ["სუფრის მარილი", rt(ce("NaCl"))], ["ამიაკი", rt(ce("NH3"))]], [rt(ce("CH4"))]),
      short(q(4), 2, rt("გამოთვალეთ ", ce("CO2"), "-ის ფარდობითი მოლეკულური მასა (", m("A_{r}(\\text{C})=12"), ", ", m("A_{r}(\\text{O})=16"), ")."), "44"),
      short(q(5), 1, rt("სულ რამდენი ატომია ", ce("H2SO4"), "-ის ერთ მოლეკულაში?"), "7"),
      open(q(6), 3, rt("ახსენით, რით განსხვავდება მარტივი ნივთიერება რთულისგან. მოიყვანეთ თითო მაგალითი."), 6),
    ],
  },
  "chemistry-9-reactions": {
    instructions: KA, minutes: 40,
    questions: (q) => [
      mc(q(1), 1, rt("რომელი ტიპის რეაქციაა ", ce("2H2 + O2 -> 2H2O"), "?"), ["დაშლის", "შეერთების", "ჩანაცვლების", "მიმოცვლის"], 1),
      balance(q(2), 4, rt("გაათანაბრეთ რეაქციის ტოლობები."), ["2Mg + O2 -> 2MgO", "N2 + 3H2 -> 2NH3", "CH4 + 2O2 -> CO2 + 2H2O", "2Al + 6HCl -> 2AlCl3 + 3H2"]),
      tf(q(3), 1, rt("ქიმიური რეაქციის დროს ატომების საერთო რაოდენობა არ იცვლება."), true),
      matching(q(4), 3, rt("დააკავშირეთ რეაქცია მის ტიპთან."), ["რეაქცია", "ტიპი"], [[rt(ce("CaCO3 -> CaO + CO2")), "დაშლა"], [rt(ce("Zn + 2HCl -> ZnCl2 + H2")), "ჩანაცვლება"], [rt(ce("NaOH + HCl -> NaCl + H2O")), "მიმოცვლა"]], ["შეერთება"]),
      short(q(5), 1, rt("რა ნივთიერება წარმოიქმნება რკინის ჟანგბადში წვისას? დაწერეთ ერთი შესაძლო ფორმულა."), rt(ce("Fe3O4"))),
      open(q(6), 2, rt("ჩამოთვალეთ ქიმიური რეაქციის მიმდინარეობის ორი ნიშანი და მოიყვანეთ მაგალითი."), 5),
    ],
  },
  "biology-8-cell": {
    instructions: KA, minutes: 35,
    questions: (q) => [
      mc(q(1), 1, rt("რომელი ორგანოიდი ამარაგებს უჯრედს ენერგიით?"), ["რიბოსომა", "მიტოქონდრია", "ვაკუოლი", "ბირთვი"], 1),
      tf(q(2), 1, rt("უჯრედის კედელი აქვს როგორც მცენარეულ, ისე ცხოველურ უჯრედს."), false),
      matching(q(3), 3, rt("დააკავშირეთ ორგანოიდი მის ფუნქციასთან."), ["ორგანოიდი", "ფუნქცია"], [["ბირთვი", "მემკვიდრული ინფორმაციის შენახვა"], ["ქლოროპლასტი", "ფოტოსინთეზი"], ["რიბოსომა", "ცილის სინთეზი"]], ["საკვების მონელება"]),
      fillBlank(q(4), 2, rt("ჩაწერეთ გამოტოვებული სიტყვები."), "მცენარეულ უჯრედს გარედან ფარავს მკვრივი კედელი. მწვანე ფერს მას ქლოროფილი აძლევს.", [{ word: "კედელი" }, { word: "ქლოროფილი" }], { mode: "open" }),
      short(q(5), 1, rt("დაასახელეთ ერთი ორგანოიდი, რომელიც მცენარეულ უჯრედს აქვს, ცხოველურს კი არა."), "ქლოროპლასტი"),
      open(q(6), 3, rt("შეადარეთ მცენარეული და ცხოველური უჯრედი: დაასახელეთ ორი მსგავსება და ორი განსხვავება."), 7),
    ],
  },
  "biology-9-genetics": {
    instructions: KA, minutes: 40,
    questions: (q) => [
      mc(q(1), 1, rt("რა ეწოდება ორგანიზმის გენების ერთობლიობას?"), ["ფენოტიპი", "გენოტიპი", "ალელი", "ქრომოსომა"], 1),
      tf(q(2), 1, rt("რეცესიული ნიშანი ვლინდება მხოლოდ ჰომოზიგოტურ მდგომარეობაში."), true),
      matching(q(3), 3, rt("დააკავშირეთ ცნება მის განმარტებასთან."), ["ცნება", "განმარტება"], [["ალელი", "ერთი გენის ვარიანტი"], ["ჰეტეროზიგოტი", "ორგანიზმი ერთი გენის ორი განსხვავებული ალელით"], ["ფენოტიპი", "ორგანიზმის გარეგნული და შინაგანი ნიშნების ერთობლიობა"]], ["უჯრედის გაყოფა"]),
      short(q(4), 2, rt("შეაჯვარეს ორი ჰეტეროზიგოტური ორგანიზმი (", m("Aa\\times Aa"), "). ფენოტიპების რა თანაფარდობაა მოსალოდნელი შთამომავლობაში სრული დომინირებისას?"), rt(m("3:1"))),
      short(q(5), 1, rt("რა გამეტებს წარმოქმნის ორგანიზმი გენოტიპით ", m("Aa"), "?"), rt(m("A"), " და ", m("a"))),
      open(q(6), 3, rt("ყვითელთესლიანი ბარდა (", m("AA"), ") შეაჯვარეს მწვანეთესლიანთან (", m("aa"), "). დაწერეთ შეჯვარების სქემა და განსაზღვრეთ პირველი თაობის გენოტიპი და ფენოტიპი."), 7),
    ],
  },
  "geography-7-earth": {
    instructions: KA, minutes: 30,
    questions: (q) => [
      mc(q(1), 1, rt("რომელია ყველაზე დიდი ოკეანე?"), ["ატლანტის", "ინდოეთის", "წყნარი", "ჩრდილოეთის ყინულოვანი"], 2),
      tf(q(2), 1, rt("ეკვატორი დედამიწას ჩრდილოეთ და სამხრეთ ნახევარსფეროებად ყოფს."), true),
      matching(q(3), 3, rt("დააკავშირეთ ცნება მის განმარტებასთან."), ["ცნება", "განმარტება"], [["პარალელი", "ეკვატორის პარალელური წარმოსახვითი ხაზი"], ["მერიდიანი", "პოლუსების შემაერთებელი წარმოსახვითი ხაზი"], ["მასშტაბი", "რუკაზე მანძილის შემცირების მაჩვენებელი"]], ["ზღვის დონიდან სიმაღლე"]),
      short(q(4), 2, rt("რუკის მასშტაბია ", m("1:100\\,000"), ". რამდენ კილომეტრს შეესაბამება ადგილზე რუკაზე გაზომილი 5 სმ?"), "5 კმ"),
      short(q(5), 1, rt("რომელი კონტინენტია ფართობით ყველაზე დიდი?"), "ევრაზია"),
      open(q(6), 2, rt("ახსენით, რატომ ცვლის დღე ღამეს დედამიწაზე."), 5),
    ],
  },
  "geography-9-georgia": {
    instructions: KA, minutes: 35,
    questions: (q) => [
      mc(q(1), 1, rt("რომელია საქართველოს უმაღლესი მწვერვალი?"), ["მყინვარწვერი", "შხარა", "უშბა", "თეთნულდი"], 1),
      tf(q(2), 1, rt("მდინარე მტკვარი კასპიის ზღვაში ჩაედინება."), true),
      matching(q(3), 3, rt("დააკავშირეთ მდინარე ზღვასთან, რომლის აუზსაც ეკუთვნის."), ["მდინარე", "ზღვა"], [["რიონი", "შავი ზღვა"], ["ალაზანი", "კასპიის ზღვა"]], ["აზოვის ზღვა"]),
      fillBlank(q(4), 2, rt("ჩაწერეთ გამოტოვებული სიტყვები."), "დასავლეთ საქართველოს კლიმატი ნოტიოა, რადგან მასზე გავლენას ახდენს შავი ზღვა. აღმოსავლეთ და დასავლეთ საქართველოს ერთმანეთისგან ლიხის ქედი ყოფს.", [{ word: "ნოტიოა" }, { word: "ლიხის" }], { mode: "open" }),
      short(q(5), 1, rt("რომელ ზღვას ესაზღვრება საქართველო?"), "შავ ზღვას"),
      open(q(6), 3, rt("ახსენით, რატომ განსხვავდება ერთმანეთისგან დასავლეთ და აღმოსავლეთ საქართველოს კლიმატი."), 6),
    ],
  },
  "history-10-georgia": {
    instructions: KA, minutes: 40,
    questions: (q) => [
      mc(q(1), 1, rt("რომელ წელს გაიმართა დიდგორის ბრძოლა?"), ["1089", "1104", "1121", "1184"], 2),
      tf(q(2), 1, rt("დავით აღმაშენებელმა თბილისი 1122 წელს შემოუერთა სამეფოს."), true),
      matching(q(3), 3, rt("დააკავშირეთ მოვლენა თარიღთან."), ["მოვლენა", "თარიღი"], [["რუის-ურბნისის კრება", "1104"], ["დიდგორის ბრძოლა", "1121"], ["შამქორის ბრძოლა", "1195"], ["ბასიანის ბრძოლა", "1202"]], ["1225"]),
      order(q(4), 2, rt("დაალაგეთ მეფეები მმართველობის რიგის მიხედვით."), ["ბაგრატ III", "დავით IV აღმაშენებელი", "გიორგი III", "თამარი"]),
      short(q(5), 1, rt("რომელი სასწავლო და კულტურული ცენტრი დააარსა დავით აღმაშენებელმა დასავლეთ საქართველოში?"), "გელათის აკადემია"),
      open(q(6), 3, rt("დაასახელეთ დავით აღმაშენებლის ორი რეფორმა და ახსენით, როგორ შეუწყო თითოეულმა ხელი სამეფოს გაძლიერებას."), 8),
    ],
  },
  "georgian-9-syntax": {
    instructions: KA, minutes: 35,
    questions: (q) => [
      mc(q(1), 1, rt("რომელია წინადადების მთავარი წევრები?"), ["ქვემდებარე და შემასმენელი", "დამატება და განსაზღვრება", "გარემოება და დამატება", "განსაზღვრება და შემასმენელი"], 0),
      mc(q(2), 1, rt("წინადადებაში „ბავშვი წიგნს კითხულობს“ სიტყვა „წიგნს“ არის:"), ["ქვემდებარე", "შემასმენელი", "პირდაპირი დამატება", "გარემოება"], 2),
      tf(q(3), 1, rt("ქართულში ქვემდებარე შეიძლება იდგეს სახელობით, მოთხრობით ან მიცემით ბრუნვაში."), true),
      matching(q(4), 3, rt("წინადადება: „გუშინ პატარა ნინომ ბებიას წერილი მისწერა“. დააკავშირეთ სიტყვა წინადადების წევრთან."), ["სიტყვა", "წინადადების წევრი"], [["ნინომ", "ქვემდებარე"], ["მისწერა", "შემასმენელი"], ["გუშინ", "დროის გარემოება"], ["პატარა", "განსაზღვრება"]], ["ადგილის გარემოება"]),
      short(q(5), 2, rt("დასვით სასვენი ნიშნები: „ნიკო ლევანი და ანა ეზოში თამაშობდნენ“."), "ნიკო, ლევანი და ანა ეზოში თამაშობდნენ."),
      open(q(6), 3, rt("შეადგინეთ ორი მარტივი წინადადება: ერთი გავრცობილი, მეორე გაუვრცობელი. ხაზი გაუსვით მთავარ წევრებს."), 5),
    ],
  },
  "english-b1-conditionals": {
    instructions: "Read each task carefully. Write your answers clearly.", minutes: 35, level: "B1",
    questions: (q) => [
      mc(q(1), 1, rt("If it ___ tomorrow, we will stay at home."), ["rains", "will rain", "rained", "would rain"], 0),
      mc(q(2), 1, rt("If I ___ more time, I would learn to play the guitar."), ["have", "had", "will have", "would have"], 1),
      tf(q(3), 1, rt("We use the zero conditional for things that are always true."), true),
      matching(q(4), 3, rt("Match the beginnings with the endings."), ["If…", "…then"], [["If you heat ice,", "it melts."], ["If she studies hard,", "she will pass the exam."], ["If I were you,", "I would say sorry."]], ["it will melted."]),
      fillBlank(q(5), 2, rt("Complete the sentences with the correct words."), "If we miss the bus, we will be late for school. If I won the lottery, I would travel around the world.", [{ word: "miss" }, { word: "would" }], { mode: "bank", extras: ["will"] }),
      open(q(6), 3, rt("Finish the sentence in three different ways: \"If I could live anywhere in the world, …\""), 5),
    ],
  },
};

const TIME = "2026-11-15T08:00:00.000Z";

/** The whole template as a test (id "template-<id>"), or null if there is no such template. */
export function templateContent(id: string): Test | null {
  const info = templateInfo(id);
  const body = BODIES[id];
  if (!info || !body) return null;
  const test = normalizeTest({
    id: `${TEMPLATE_PREFIX}${id}`,
    schoolName: "",
    title: info.title,
    subjectId: info.subject,
    subject: "",
    grade: info.grade,
    level: body.level ?? "",
    date: "",
    timeLimitMinutes: body.minutes,
    instructions: body.instructions,
    labelStyle: info.subject === "english" ? "latin" : "georgian",
    questions: body.questions((n) => `tpl-${id}-q${n}`),
    printOptions: DEFAULT_PRINT_OPTIONS,
    variants: { ...DEFAULT_VARIANTS, seed: 20261115 },
    folder: "",
    createdAt: TIME,
    updatedAt: TIME,
  });
  return test;
}

export const TEMPLATE_IDS = TEMPLATES.map((template) => template.id);
