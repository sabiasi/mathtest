/**
 * Mathematics sample (9th grade): every question type and every toolbar tab
 * (basic, algebra, trigonometry, functions/analysis, geometry, sets, Greek
 * letters), a figure, a coordinate-plane answer grid, a locked option and
 * two variants. Answers checked by hand (and by samples.test.ts).
 */
import { builtinImage } from "@/lib/images/builtinPictures";
import { fillBlank, m, matching, mc, open, rt, sampleTest, short, tf } from "./build";

const id = (n: number) => `sample-math-q${n}`;
const triangle = builtinImage("triangle-abc");

export const mathSample = () =>
  sampleTest({
    subjectId: "math",
    title: "ნიმუში — ალგებრა და გეომეტრია",
    subject: "მათემატიკა",
    grade: "მე-9 კლასი",
    timeLimitMinutes: 45,
    instructions: "ყურადღებით წაიკითხეთ ყოველი დავალება. ღია კითხვებზე ჩაწერეთ სრული ამოხსნა. კალკულატორით სარგებლობა არ შეიძლება.",
    variants: { count: 2 },
    questions: [
      mc(id(1), 1, rt("გამოთვალეთ: ", m("\\frac{3}{4}+\\frac{5}{6}")), [rt(m("\\frac{19}{12}")), rt(m("\\frac{8}{10}")), rt(m("\\frac{4}{5}")), rt(m("\\frac{15}{24}"))], 0, {
        tip: "ფორმულა ჩაწერილია „Σ ფორმულა“ ღილაკით (ან Alt+=). წილადი — ჩანართი „ძირითადი“. მონიშნეთ სწორი პასუხი წრეზე დაჭერით.",
      }),
      mc(id(2), 1, rt("გამარტივეთ: ", m("\\sqrt{48}-\\sqrt{12}")), [rt(m("2\\sqrt{3}")), rt(m("6")), rt(m("3\\sqrt{2}")), rt(m("4\\sqrt{3}"))], 0),
      mc(id(3), 1, rt("რისი ტოლია ", m("\\sum_{k=1}^{4}k^{2}"), "?"), [rt(m("30")), rt(m("10")), rt(m("16")), "არცერთი ზემოთ ჩამოთვლილი"], 0, {
        lock: true,
        tip: "ჩართულია „ვარიანტებში პასუხების რიგი არ აირიოს“: ეს პასუხები არ აირევა, ასე რომ „არცერთი…“ ყოველთვის ბოლოა. Σ — ჩანართი „ფუნქციები და ანალიზი“.",
      }),
      tf(id(4), 1, rt(m("\\sin^{2}\\alpha+\\cos^{2}\\alpha=1"), " ნებისმიერი ", m("\\alpha"), " კუთხისთვის."), true, {
        tip: "α — ჩანართი „ბერძნული ასოები“; sin, cos — „ტრიგონომეტრია“.",
      }),
      tf(id(5), 1, rt("ნებისმიერი a და b რიცხვისთვის ", m("(a+b)^{2}=a^{2}+b^{2}"), "."), false),
      tf(id(6), 1, rt("სიბრტყეზე: თუ ", m("a\\parallel b"), " და ", m("c\\perp a"), ", მაშინ ", m("c\\perp b"), "."), true, {
        tip: "∥ და ⊥ — ჩანართი „გეომეტრია“.",
      }),
      short(id(7), 2, rt("ამოხსენით განტოლება: ", m("x^{2}-5x+6=0")), rt(m("x_{1}=2,\\;x_{2}=3"))),
      short(id(8), 1, rt("გამოთვალეთ: ", m("\\operatorname{tg}45^{\\circ}+\\cos60^{\\circ}")), rt(m("1+\\frac{1}{2}=\\frac{3}{2}")), {
        tip: "საქართველოს სკოლებში წერენ tg და ctg (არა tan / cot) — ღილაკები ასეც სვამენ.",
      }),
      short(id(9), 1, rt("გამოთვალეთ: ", m("\\log_{2}32")), rt(m("5"))),
      short(
        id(10),
        2,
        rt("მოცემულია სიმრავლეები ", m("A=\\left\\{1;2;3;4\\right\\}"), " და ", m("B=\\left\\{3;4;5\\right\\}"), ". იპოვეთ ", m("A\\cap B"), " და ", m("A\\cup B"), "."),
        rt(m("A\\cap B=\\left\\{3;4\\right\\},\\;A\\cup B=\\left\\{1;2;3;4;5\\right\\}")),
        { tip: "∩ ∪ და ფიგურული ფრჩხილები — ჩანართი „სიმრავლეები და ლოგიკა“. ქართულ სკოლაში ელემენტებს „;“ ჰყოფს." },
      ),
      short(id(11), 2, rt("ამოხსენით უტოლობა: ", m("3x-7\\le5")), rt(m("x\\le4,\\;x\\in\\left(-\\infty;4\\right]"))),
      short(
        id(12),
        3,
        rt("ნახაზზე ABC მართკუთხა სამკუთხედია (", m("\\angle A=90^{\\circ}"), "), AC = 6, AB = 8. იპოვეთ BC და ", m("\\sin\\angle B"), "."),
        rt(m("BC=\\sqrt{6^{2}+8^{2}}=10,\\;\\sin\\angle B=\\frac{AC}{BC}=\\frac{6}{10}=\\frac{3}{5}")),
        {
          images: [{ id: `${id(12)}-img`, ...triangle, widthPercent: 40, position: "right", caption: "" }],
          tip: "სურათს ამატებს ღილაკი „სურათის დამატება“ (ან Ctrl+V, ან ფაილის გადმოთრევა). მისი ზომა და ადგილი (ზემოთ / მარჯვნივ) აქვე იცვლება.",
        },
      ),
      short(id(13), 1, rt("იპოვეთ წრის ფართობი, თუ მისი რადიუსია r = 3 სმ."), rt(m("S=\\pi r^{2}=9\\pi"), " სმ²")),
      matching(
        id(14),
        2,
        rt("შეუსაბამეთ გამოსახულებები მათ მნიშვნელობებს."),
        ["გამოსახულება", "მნიშვნელობა"],
        [
          [rt(m("2^{-3}")), rt(m("\\frac{1}{8}"))],
          [rt(m("(-3)^{2}")), rt(m("9"))],
          [rt(m("\\sqrt[3]{27}")), rt(m("3"))],
          [rt(m("5^{0}")), rt(m("1"))],
        ],
        [rt(m("-9")), rt(m("0"))],
        { tip: "მარჯვენა სვეტი ქაღალდზე აირევა; ორი „ზედმეტი“ პასუხი გამოცნობას ართულებს." },
      ),
      fillBlank(
        id(15),
        2,
        rt("შეავსეთ გამოტოვებული რიცხვები."),
        "არითმეტიკულ პროგრესიაში პირველი წევრია 3, ხოლო სხვაობა — 4. მაშინ მეხუთე წევრია 19, ხოლო პირველი ხუთი წევრის ჯამი — 55.",
        [{ word: "19" }, { word: "55" }],
        { mode: "open" },
        { tip: "ტექსტი იწერება მთლიანად, შემდეგ სიტყვებზე (აქ — რიცხვებზე) დაჭერით ხდება მათი გამოტოვება." },
      ),
      open(id(16), 4, rt("ამოხსენით განტოლებათა სისტემა: ", m("\\begin{cases}x+y=7\\\\2x-y=2\\end{cases}")), 6),
      {
        ...open(id(17), 4, rt("ააგეთ ", m("y=x^{2}-4"), " ფუნქციის გრაფიკი. აღნიშნეთ წერტილები, სადაც გრაფიკი კვეთს Ox ღერძს."), 2, {
          tip: "კოორდინატთა სიბრტყე დამატებულია „ბადე პასუხისთვის“ → „კოორდინატთა სიბრტყე“: 5 მმ-იანი უჯრები იბეჭდება ზუსტ ზომაზე.",
        }),
        grid: { kind: "coordinates", cols: 20, rows: 16 },
      },
    ],
  });
