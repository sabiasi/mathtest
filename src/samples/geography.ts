/**
 * Geography sample (9th grade): the outline map of Georgia with numbered
 * markers, a map-scale table, a climate chart, coordinates and units, plus
 * every common question type. Climate numbers are rounded long-term
 * averages for Tbilisi (the tip asks teachers to use their textbook's data).
 */
import { builtinImage, georgiaPercent, GEORGIA_PLACES } from "@/lib/images/builtinPictures";
import type { Question } from "@/lib/storage/types";
import { base, fillBlank, matching, mc, open, rt, sampleTest, short, tf } from "./build";

const id = (n: number) => `sample-geography-q${n}`;

const marker = (n: number, [lon, lat]: readonly [number, number], answer: string) => ({ id: `${id(1)}-m${n}`, ...georgiaPercent(lon, lat), answer });

const map: Question = {
  ...base(id(1), 4, rt("დაასახელეთ საქართველოს რუკაზე ციფრებით აღნიშნული ობიექტები. გამოიყენეთ ჩარჩოში მოცემული სახელები."), {
    tip: "რუკა: „საქართველოს კონტურული რუკა“ (ან ატვირთეთ თქვენი). დააწკაპუნეთ რუკაზე — დაისმება დანომრილი ნიშანი; გადაათრიეთ, რომ გადაიტანოთ.",
  }),
  type: "map",
  map: builtinImage("georgia-map"),
  mapWidth: 100,
  wordBank: true,
  markers: [
    marker(1, GEORGIA_PLACES.tbilisi, "თბილისი"),
    marker(2, GEORGIA_PLACES.kutaisi, "ქუთაისი"),
    marker(3, GEORGIA_PLACES.batumi, "ბათუმი"),
    marker(4, GEORGIA_PLACES.sea, "შავი ზღვა"),
    marker(5, GEORGIA_PLACES.kazbek, "მყინვარწვერი"),
    marker(6, GEORGIA_PLACES.shkhara, "შხარა"),
    marker(7, GEORGIA_PLACES.paravani, "ფარავნის ტბა"),
    marker(8, [43.9, 41.99], "მტკვარი"),
  ],
};

const scale: Question = {
  ...base(id(2), 3, rt("რუკის მასშტაბის გამოყენებით შეავსეთ ცხრილი."), {
    tip: "მასშტაბი: მასწავლებელი წერს მხოლოდ მოცემულ მანძილებს — პასუხს (ცხრილში და პასუხების ფურცელზე) პროგრამა ითვლის. მასშტაბი შეიძლება ფურცელზე იყოს რიცხვითი, სახელობითი ან ხაზოვანი.",
  }),
  type: "scale-calc",
  denominator: 50_000,
  shown: "numeric",
  askConvert: true,
  realUnit: "km",
  rows: [
    { id: `${id(2)}-r1`, value: 4, ask: "real" },
    { id: `${id(2)}-r2`, value: 7.5, ask: "real" },
    { id: `${id(2)}-r3`, value: 3, ask: "map" },
  ],
};

const climate: Question = {
  ...base(id(3), 4, rt("დააკვირდით კლიმატის დიაგრამას და უპასუხეთ კითხვებს."), {
    tip: "კლიმატის დიაგრამა: ჩაწერეთ 12 თვის ტემპერატურა და ნალექი — დიაგრამა (ხაზი + დაშტრიხული სვეტები) და პასუხები თავისით მზადდება. აქ მოცემულია თბილისის დამრგვალებული მრავალწლიური საშუალოები; სასურველია, გამოიყენოთ თქვენი სახელმძღვანელოს მონაცემები.",
  }),
  type: "climate-chart",
  place: "თბილისი (490 მ ზ. დ.)",
  temperature: [1.9, 3.3, 7.4, 12.6, 17.6, 21.9, 25, 24.8, 20.1, 13.9, 7.5, 3.2],
  precipitation: [19, 24, 31, 54, 77, 76, 46, 46, 40, 38, 26, 21],
  table: false,
  tasks: ["warmest", "coldest", "range", "mean", "total", "wettest", "driest"],
};

export const geographySample = () =>
  sampleTest({
    subjectId: "geography",
    title: "ნიმუში — საქართველოს ფიზიკური გეოგრაფია",
    subject: "გეოგრაფია",
    grade: "მე-9 კლასი",
    timeLimitMinutes: 45,
    instructions: "გამოთვლებში ჩაწერეთ ერთეულები. რუკასთან დაკავშირებულ დავალებებში იხელმძღვანელეთ მოცემული რუკით.",
    questions: [
      map,
      mc(id(4), 1, rt("რომელია საქართველოს უმაღლესი მწვერვალი?"), ["შხარა", "მყინვარწვერი", "თეთნულდი", "უშბა"], 0),
      tf(id(5), 1, rt("მდინარე რიონი შავ ზღვას ერთვის."), true),
      short(id(6), 2, rt("ჩაწერეთ თბილისის გეოგრაფიული კოორდინატები (გრადუსებითა და წუთებით)."), "41°43′ ჩ. გ., 44°47′ აღმ. გრძ.", {
        tip: "კოორდინატების ინსტრუმენტი — ჩანართი „კოორდინატები“: ჩაწერეთ გრადუსები და წუთები, აირჩიეთ მხარე (N/S, E/W) და ჩასვით ქართულად ან ლათინურად.",
      }),
      scale,
      climate,
      short(id(7), 2, rt("რეგიონის ფართობია 2 000 კმ², მოსახლეობა — 150 000 კაცი. გამოთვალეთ მოსახლეობის სიმჭიდროვე."), "150 000 : 2 000 = 75 კაცი/კმ²", {
        tip: "ერთეულები (კმ², ‰, მ ზ. დ., კაცი/კმ²…) — ჩანართი „ერთეულები“; ქართული ან ლათინური ჩაწერა.",
      }),
      short(
        id(8),
        2,
        rt("სიმაღლის მატებასთან ერთად ჰაერის ტემპერატურა ყოველ 1 000 მ-ზე დაახლოებით 6 °C-ით კლებულობს. ზღვის დონეზე +20 °C-ია. რა ტემპერატურა იქნება 3 000 მ სიმაღლეზე?"),
        "20 − 3 · 6 = +2 °C",
      ),
      matching(
        id(9),
        2,
        rt("შეუსაბამეთ ცნებები მათ განმარტებებს."),
        ["ცნება", "განმარტება"],
        [
          ["განედი", "კუთხური მანძილი ეკვატორიდან ჩრდილოეთით ან სამხრეთით"],
          ["გრძედი", "კუთხური მანძილი საწყისი (გრინვიჩის) მერიდიანიდან"],
          ["მასშტაბი", "რამდენჯერ არის შემცირებული მანძილი რუკაზე"],
          ["ტემპერატურის წლიური ამპლიტუდა", "სხვაობა ყველაზე თბილი და ყველაზე ცივი თვის ტემპერატურებს შორის"],
        ],
        ["ზღვის დონიდან სიმაღლე"],
      ),
      fillBlank(
        id(10),
        2,
        rt("შეავსეთ გამოტოვებები ჩარჩოში მოცემული რიცხვებით."),
        "დედამიწა თავისი ღერძის გარშემო სრულ ბრუნს დაახლოებით 24 საათში ასრულებს, ხოლო მზის გარშემო — დაახლოებით 365 დღეში.",
        [{ word: "24" }, { word: "365" }],
        { mode: "bank", extras: ["12", "30"] },
      ),
      open(id(11), 3, rt("ახსენით, რატომ მოდის დასავლეთ საქართველოში მეტი ნალექი, ვიდრე აღმოსავლეთ საქართველოში."), 5),
    ],
  });
