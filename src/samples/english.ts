/**
 * English (EFL) sample, level B1 (9th–10th grade): sections, an original
 * reading text with lettered paragraphs, a listening task (transcript on
 * the key), Use of English (gap fill with choices, transformations, word
 * formation, A–D error correction), vocabulary (pictures, odd one out,
 * label the picture, crossword, word search), writing and speaking cards.
 * Every question also has its Georgian instruction (bilingual printing).
 */
import { builtinImage } from "@/lib/images/builtinPictures";
import type { Question, SectionKind } from "@/lib/storage/types";
import { base, fillBlank, matching, mc, open, order, rt, sampleTest, short, tf, word } from "./build";

const id = (n: number) => `sample-english-q${n}`;
const ka = (instructionKa: string, tip?: string) => ({ instructionKa, ...(tip ? { tip } : {}) });

const section = (n: number, kind: SectionKind, tip?: string): Question => ({ ...base(id(n), 0, [], tip ? { tip } : {}), type: "section", kind, title: "" });

const passage: Question = {
  ...base(id(2), 0, rt("Read the text about a special library."), ka("წაიკითხეთ ტექსტი ერთი განსაკუთრებული ბიბლიოთეკის შესახებ.")),
  type: "passage",
  title: "A Library on Wheels",
  author: "",
  paragraphLetters: true,
  lineNumbers: false,
  body: [
    "Every Saturday morning, an old blue bus stops in the main square of a small mountain village. It is not an ordinary bus: inside, there are shelves full of books instead of seats. The bus is a library on wheels, and it visits five villages every week.",
    "The idea came from Nino, a teacher who grew up in the area. When she was a child, the nearest library was forty kilometres away, and her family did not have a car. “I read the same three books again and again,” she remembers.",
    "Nino bought the bus with help from local people. Some gave money, others gave books, and a mechanic repaired the engine for free. The first trip took place three years ago, and only twelve people came.",
    "Today, more than a hundred readers use the library every month. Children borrow comics and adventure stories, while older people prefer history books. Nino hopes that one day every village in the region will have its own small library.",
  ].join("\n"),
};

const listening: Question = {
  ...base(id(9), 0, rt("Listen to Tom talking about his weekend."), {
    ...ka("მოუსმინეთ, როგორ ყვება ტომი თავის შაბათ-კვირაზე."),
    tip: "ჩასვით ჩანაწერის საჯარო ბმული (YouTube, Google Drive…) — ფურცელზე QR კოდი დაიბეჭდება. ტრანსკრიპტი მხოლოდ პასუხების ფურცელზეა. აუდიოფაილი შეგიძლიათ კომპიუტერიდანაც დაუკრათ.",
  }),
  type: "listening",
  link: "",
  showQr: false,
  plays: 2,
  transcript: [
    "Hi, I'm Tom. Last weekend I went camping with my cousins. On Friday evening we put up our tent near a lake.",
    "On Saturday we went fishing, but we didn't catch anything! In the afternoon it started to rain, so we played cards in the tent.",
    "On Sunday morning the sun came out, and we walked to the top of the hill before we went home.",
  ].join("\n"),
};

const transformation: Question = {
  ...base(
    id(14),
    4,
    rt("Complete the second sentence so that it means the same as the first. Use the word given. Use two to five words."),
    ka("დაასრულეთ მეორე წინადადება ისე, რომ პირველის მნიშვნელობა ჰქონდეს. გამოიყენეთ მოცემული სიტყვა (2–5 სიტყვა)."),
  ),
  type: "transformation",
  items: [
    { id: `${id(14)}-1`, original: "I started learning English five years ago.", keyWord: "for", before: "I have", after: "five years.", answer: "been learning English for" },
    { id: `${id(14)}-2`, original: "It isn't necessary to bring food.", keyWord: "have", before: "You", after: "bring food.", answer: "don't have to" },
  ],
};

const wordFormation: Question = {
  ...base(id(15), 3, rt("Use the word at the end of each line to form a word that fits in the gap."), ka("ხაზის ბოლოს მოცემული სიტყვისგან შექმენით ის სიტყვა, რომელიც გამოტოვებულ ადგილს შეესაბამება.")),
  type: "word-formation",
  items: [
    { id: `${id(15)}-1`, sentence: "The film was very interesting, and we enjoyed it.", gap: word("interesting"), root: "interest" },
    { id: `${id(15)}-2`, sentence: "She answered every question correctly.", gap: word("correctly"), root: "correct" },
    { id: `${id(15)}-3`, sentence: "Our team won because of good preparation.", gap: word("preparation"), root: "prepare" },
  ],
};

const findMistake: Question = {
  ...base(id(16), 2, rt("Each sentence has one mistake in the underlined parts. Circle the letter and correct the mistake."), {
    ...ka("თითოეულ წინადადებაში ხაზგასმულ ნაწილებში ერთი შეცდომაა. შემოხაზეთ ასო და გაასწორეთ შეცდომა."),
    tip: "„A–D“ სტილი: მონიშნეთ ოთხი სიტყვა (ფურცელზე ხაზგასმული იქნება A, B, C, D ასოებით) და მათ შორის შეცდომა.",
  }),
  type: "find-mistake",
  style: "abcd",
  items: [
    {
      id: `${id(16)}-1`,
      sentence: "Yesterday she don't come to school because she was ill.",
      parts: [word("Yesterday"), word("don't"), word("school"), word("was")],
      mistake: word("don't"),
      correction: "didn't",
    },
    {
      id: `${id(16)}-2`,
      sentence: "There is many people in the park today.",
      parts: [word("There"), word("is"), word("people"), word("today")],
      mistake: word("is"),
      correction: "are",
    },
  ],
};

const pictureMatch: Question = {
  ...base(id(18), 2, rt("Write the correct word under each picture. Use the words from the box."), {
    ...ka("თითოეული სურათის ქვეშ ჩაწერეთ შესაბამისი სიტყვა. გამოიყენეთ ჩარჩოში მოცემული სიტყვები."),
    tip: "სურათები შეგიძლიათ ატვირთოთ ან ჩასვათ (Ctrl+V). ჩარჩოში სიტყვები ყველა ვარიანტში სხვადასხვა რიგით იბეჭდება.",
  }),
  type: "picture-match",
  wordBank: true,
  extras: ["lamp", "chair"],
  pictures: (["umbrella", "clock", "key", "cup"] as const).map((name) => ({ id: `${id(18)}-${name}`, ...builtinImage(name), answer: name })),
};

const oddOneOut: Question = {
  ...base(id(19), 3, rt("Circle the word that does not belong in each group."), ka("თითოეულ ჯგუფში შემოხაზეთ სიტყვა, რომელიც სხვებს არ ერგება.")),
  type: "odd-one-out",
  rows: [
    { id: `${id(19)}-1`, words: ["apple", "banana", "carrot", "orange"], odd: 2 },
    { id: `${id(19)}-2`, words: ["run", "swim", "jump", "happy"], odd: 3 },
    { id: `${id(19)}-3`, words: ["doctor", "teacher", "hospital", "pilot"], odd: 2 },
  ],
};

/** Places in the room drawing, in % of its 240 × 160 size. */
const at = (x: number, y: number) => ({ x: Math.round((x / 240) * 1000) / 10, y: Math.round((y / 160) * 1000) / 10 });
const labelPicture: Question = {
  ...base(id(20), 3, rt("Label the picture. Write the words next to the numbers."), {
    ...ka("წააწერეთ სურათს: ჩაწერეთ სიტყვები ნომრების გასწვრივ."),
    tip: "„Label the picture“ = რუკის კითხვა სურათზე: დააწკაპუნეთ სურათზე, რომ დანომრილი ნიშანი დასვათ, და ჩაწერეთ პასუხი.",
  }),
  type: "map",
  map: builtinImage("room"),
  mapWidth: 70,
  wordBank: false,
  markers: [
    { id: `${id(20)}-1`, ...at(46, 47), answer: "window" },
    { id: `${id(20)}-2`, ...at(120, 38), answer: "picture" },
    { id: `${id(20)}-3`, ...at(152, 67), answer: "lamp" },
    { id: `${id(20)}-4`, ...at(133, 96), answer: "table" },
    { id: `${id(20)}-5`, ...at(66, 88), answer: "chair" },
    { id: `${id(20)}-6`, ...at(208, 70), answer: "door" },
  ],
};

const crossword: Question = {
  ...base(id(21), 5, rt("Complete the crossword."), {
    ...ka("შეავსეთ კროსვორდი."),
    tip: "კროსვორდი თავისით ეწყობა სიტყვებიდან და განმარტებებიდან. „ახალი განლაგება“ სხვაგვარად დაალაგებს.",
  }),
  type: "crossword",
  seed: 7,
  entries: [
    { id: `${id(21)}-1`, word: "LIBRARY", clue: "A place where you can borrow books." },
    { id: `${id(21)}-2`, word: "TENT", clue: "You sleep in it when you go camping." },
    { id: `${id(21)}-3`, word: "UMBRELLA", clue: "You open it when it rains." },
    { id: `${id(21)}-4`, word: "TEACHER", clue: "A person who helps students learn at school." },
    { id: `${id(21)}-5`, word: "ISLAND", clue: "Land with water all around it." },
  ],
};

const wordSearch: Question = {
  ...base(id(22), 3, rt("Find six school things in the word search."), ka("იპოვეთ ექვსი სასკოლო ნივთის სახელი ასოების ბადეში.")),
  type: "word-search",
  words: ["BOOK", "PEN", "DESK", "RULER", "PAPER", "CHAIR"],
  size: 10,
  allDirections: false,
  seed: 11,
};

const essay: Question = {
  ...base(
    id(24),
    10,
    rt("You spent a weekend with friends. Write an email to your English-speaking friend about it."),
    ka("შაბათ-კვირა მეგობრებთან ერთად გაატარეთ. მისწერეთ ამის შესახებ ელფოსტა ინგლისურენოვან მეგობარს."),
  ),
  type: "essay",
  lines: 12,
  guide: ["where you went", "what you did", "how you felt"],
  length: "100–120 words",
};

const speaking: Question = {
  ...base(id(26), 0, rt("Speaking cards: cut out the cards and give one to each student."), {
    ...ka("საუბრის ბარათები: ამოჭერით ბარათები და თითო ბარათი მიეცით თითოეულ მოსწავლეს."),
    tip: "საუბრის ბარათები ცალკე გვერდზე იბეჭდება (2 ან 4 ერთ გვერდზე) საჭრელი ხაზებით.",
  }),
  type: "speaking",
  perPage: 2,
  cards: [
    { id: `${id(26)}-1`, title: "My free time", prompts: "What do you do in your free time?\nWho do you spend it with?\nWhat new hobby would you like to try? Why?" },
    { id: `${id(26)}-2`, title: "Travelling", prompts: "Where did you go on your last trip?\nHow did you travel?\nWhich place in Georgia would you show a friend from abroad? Why?" },
  ],
};

export const englishSample = () =>
  sampleTest({
    subjectId: "english",
    title: "Sample test — Unit 3: Free time and travel",
    subject: "English",
    grade: "Grade 9",
    level: "B1",
    labelStyle: "latin",
    timeLimitMinutes: 60,
    instructions: "Read all the instructions carefully. Write your answers clearly. Use a pen, not a pencil.",
    printOptions: { bilingual: true },
    questions: [
      section(1, "reading", "სექციის ქულა თავისით ითვლება მის შემდეგ კითხვებზე. „ქართული ინსტრუქციები“ (ბეჭდვის პარამეტრი) ყოველ დავალებას ქართულ თარგმანს უმატებს."),
      passage,
      tf(id(3), 1, rt("The library bus visits five villages every week."), true, { notGiven: true, ...ka("მართალია, მცდარია თუ ტექსტში არ არის ნათქვამი?") }),
      tf(id(4), 1, rt("Nino drives the bus herself."), "not-given", { notGiven: true, ...ka("მართალია, მცდარია თუ ტექსტში არ არის ნათქვამი?") }),
      mc(id(5), 1, rt("Who repaired the engine of the bus?"), ["a mechanic", "Nino", "a group of children", "the bus driver"], 0, ka("აირჩიეთ სწორი პასუხი.")),
      short(id(6), 1, rt("In which paragraph (A–D) does Nino talk about her childhood?"), "B", ka("რომელ აბზაცში (A–D) საუბრობს ნინო თავის ბავშვობაზე?")),
      open(id(7), 2, rt("Would you like a library like this in your town? Why? Write 2–3 sentences."), 3, ka("ისურვებდით ასეთ ბიბლიოთეკას თქვენს ქალაქში? რატომ? დაწერეთ 2–3 წინადადება.")),
      section(8, "listening"),
      listening,
      order(id(10), 2, rt("Put the events in the order Tom talks about them."), ["They put up the tent.", "They went fishing.", "They played cards.", "They walked to the top of the hill."], ka("დაალაგეთ მოვლენები იმ რიგით, როგორც ტომი ყვება.")),
      short(id(11), 1, rt("Why did they play cards in the tent?"), "Because it started to rain.", ka("რატომ ითამაშეს კარტი კარავში?")),
      section(12, "use-of-english"),
      fillBlank(
        id(13),
        3,
        rt("Choose the correct answer, A, B or C, for each gap."),
        "Last summer I went to Batumi with my family. We stayed at a small hotel which was very close to the sea. Every day we swam and played volleyball on the beach.",
        [
          { word: "went", options: ["go", "have gone"] },
          { word: "which", options: ["who", "what"] },
          { word: "swam", options: ["swim", "swimming"] },
        ],
        { mode: "choice" },
        ka("თითოეული გამოტოვებისთვის აირჩიეთ სწორი პასუხი (A, B ან C).", "„არჩევითი“ რეჟიმი: მიუთითეთ არასწორი ვარიანტები — ისინი ყველა ვარიანტში აირევა, გამოტოვებები კი ადგილზე რჩება."),
      ),
      transformation,
      wordFormation,
      findMistake,
      section(17, "vocabulary"),
      pictureMatch,
      oddOneOut,
      matching(
        id(27),
        2,
        rt("Match the words from the text (1–4) to their meanings (A–E). There is one extra meaning."),
        ["Word", "Meaning"],
        [
          ["borrow", "take something and give it back later"],
          ["engine", "the part of a vehicle that makes it move"],
          ["shelf", "a flat board on a wall or in a cupboard for keeping things on"],
          ["region", "a part of a country"],
        ],
        ["a person who repairs cars"],
        ka("შეუსაბამეთ ტექსტის სიტყვები (1–4) მათ მნიშვნელობებს (A–E). ერთი მნიშვნელობა ზედმეტია."),
      ),
      labelPicture,
      crossword,
      wordSearch,
      section(23, "writing"),
      essay,
      section(25, "speaking"),
      speaking,
    ],
  });
