# Physics teacher tour — feature inventory and storyboard

Status: **approved and built** (2026-11-19). Video: `output/teacher-tour.mp4`, 117.2 s.
How to re-make it: [README.md](README.md). Section 2 shows the video as built.

Source: this repo plus a scripted walk through the running site as a **guest** (no account,
no real data). The UI is shown in Georgian, the default. Labels below are the real button
text, with English in brackets.

## 1. Feature inventory (what a physics teacher can use today)

Hidden on the live site right now (`src/lib/hiddenForTesting.ts`), so **not in the video**:
the AI question generator, the question bank, sharing with colleagues, Premium/pricing,
Word export, the custom paper header.

| # | Feature | Where it is | What it does (for a teacher) | Shortest demo path |
|---|---|---|---|---|
| 1 | New physics test | My tests → „ახალი ტესტის შექმნა“ (Create new test) → subject window → „ფიზიკა“ | Starts an empty physics test with the physics tools switched on. | /tests → Create → Physics |
| 2 | Sample test / use as template | My tests → „ნიმუშის გახსნა“ (Open sample) → banner button | Opens a finished 9th-grade physics test you can copy and change. | /tests → Open sample → Use as template |
| 3 | Test details | Editor → „ტესტის მონაცემები“ card | School, title, subject, grade, date („დღეს“ = today), time, instructions, answer letters ა/ბ/გ/დ or A/B/C/D. | Type a title, click „დღეს“ |
| 4 | Questions and types | Editor → question card → type menu | Multiple choice, true/false, short answer, open answer, matching, fill-in-the-blank, Given/Find problem. | Add question → pick a type |
| 5 | Points and total | Question card → „ქულა“ box; bar shows „სულ: N ქულა“ | Points per question, total updates by itself. | Change 1 → 3, watch the total |
| 6 | Arrange questions | Card: ⋮⋮ handle, ↑↓ arrows, copy, bin, „⋯“ menu | Reorder, duplicate, delete (with Undo). | Click ↑ on a card |
| 7 | Formula button | Toolbar „Σ ფორმულა“ (Alt+=) | Puts a formula box in the text; click buttons, type into the slots. No LaTeX needed. | Click in a question → Formula → fraction |
| 8 | Symbol search + shortcuts | Toolbar search box, „სწრაფი აკრეფა“ (Quick typing) | Find any symbol by name; typing shortcuts like `sqrt`. | Type „ფესვი“ → Enter |
| 9 | Units | Toolbar tab „ერთეულები“ | Units in Georgian (მ/წმ) or Latin (m/s) letters, prefixes n μ m k M; choice is remembered. | Units tab → switch → click მ/წმ |
| 10 | Vectors, Δ, 10ⁿ | Tab „ვექტორები, Δ, 10ⁿ“ | Vector arrows, Δ, numbers like 3·10⁸. | Tab → vector arrow |
| 11 | Constants | Tab „მუდმივები“ | g, c, G, h, e… — hover shows the value. | Tab → hover „c“ |
| 12 | Ready formulas | Tab „ფორმულები“ | 28 ready physics formulas (F = ma, v = s/t…). | Tab → F = ma |
| 13 | Given / Find problem | Type „ამოცანა (მოცემულია / საპოვნელია)“ | School-notebook frame: Given / Find / Solution. The teacher's solution and answer appear only on the answer key. | Pick type → fill Given, Find |
| 14 | Circuit diagram | Under a question: „ელექტრული წრედი“ | Build a circuit on dots: wire, battery, resistor, lamp, switch, ammeter, voltmeter; R1 prints as R₁. | Button → battery → click gap → resistor → Save |
| 15 | Force diagram | Under a question: „ძალების ნახაზი“ | Box or ball on floor / incline; buttons for mg, N, friction, F, T that turn with the slope. | Button → incline → mg, N → Save |
| 16 | Pictures | „სურათის დამატება“ (or paste / drop) | Add pictures to a question, place above or right, resize. | Click the button (file dialog not shown) |
| 17 | Answer grid | „ბადე პასუხისთვის“: „უჯრედები“ / „კოორდინატთა სიბრტყე“ | Graph paper or coordinate plane for the student's answer. | Click „კოორდინატთა სიბრტყე“ |
| 18 | Paper view | Editor bar „ქაღალდზე ნახვა“ | The real A4 pages beside the editor, updating as you type. | Click it, type a word |
| 19 | Print / PDF | Editor bar „ბეჭდვა / PDF“ → print page | A4 paper: student version or answer key, font normal/large, points shown/hidden, 1 or 2 columns; Print or „PDF-ის ჩამოტვირთვა“. | Bar button → Answer key → Download PDF |
| 20 | Variants | Print page „ვარიანტები: 1–6“ | Up to 6 variants (I, II, III…) with shuffled questions/answers, each with its own key. | Click 3 |
| 21 | Autosave | Editor bar „შენახულია …“ | Everything saves by itself. | Shown in passing, no scene |

Also on the site but not physics-specific (shown only in passing or cut): My tests folders /
search / filters, light/dark theme, Georgian/English switch, accounts and cloud saving,
the guest "one free test" limit, toolbar size handle.

## 2. Storyboard (as built: 117.2 s)

Every scene opens with a 2 s title card ("N / 12" + name) that cross-fades with the
footage around it. Then comes real footage: a caption (≤ 8 words), a big cursor with a click
ripple, an indigo box on each button before it is clicked (the rest dimmed), the camera
zooming to the active area, and a 1–2 s hold on each result. Footage plays at 1.35×.
Typing is real but fast-forwarded. Page loads are cut out.

| # | Scene | Starts | Sec | On screen | Captions (English meaning) |
|---|---|---|---|---|---|
| 0 | Intro | 0:00 | 5 | Logo, "MathTest", „ფიზიკა“ chip + „პლატფორმის ტური მასწავლებლებისთვის“ | — |
| 1 | ტესტის შექმნა | 0:05 | 7 | /tests → "Open sample" pointed at → Create → "Which subject?" → Physics → editor | მზა ნიმუში — ან ახალი ტესტი (A sample — or a new test) · დააჭირეთ „ახალი ტესტის შექმნა“ (Click "Create new test") · აირჩიეთ საგანი — ფიზიკა (Choose the subject: Physics) · ტესტი მზადაა — ფიზიკის ხელსაწყოებით (Ready, with the physics tools) |
| 2 | ტესტის მონაცემები | 0:12 | 9 | Title and grade typed, "Today" clicked, the save indicator | ჩაწერეთ სათაური და კლასი (Write the title and grade) · თარიღი — ერთი დაწკაპუნებით (Date in one click) · ყველაფერი თავისით ინახება (Everything saves itself) |
| 3 | კითხვები და ქულები | 0:21 | 7 | The 7 question types, add multiple choice, points 1 → 3, total "სულ: 3 ქულა" | აირჩიეთ კითხვის ტიპი (Pick a question type) · მიუთითეთ ქულა — ჯამი თავად ითვლება (Set points — the total adds up itself) |
| 4 | ფორმულები | 0:28 | 9 | Σ Formula → fraction → 3/4; symbol search "ფესვი" → √ | „ფორმულა“ ღილაკი ან Alt+= ("Formula" button or Alt+=) · აირჩიეთ წილადი და შეავსეთ უჯრები (Pick a fraction, fill the boxes) · ან მოძებნეთ ნებისმიერი სიმბოლო (Or search any symbol) |
| 5 | ფიზიკის ხელსაწყოები | 0:37 | 13 | Units: Latin ↔ Georgian, მ/წმ inserted; Vectors tab; Constants: hover c → value tooltip; Formulas → F = ma | ერთეულები ქართულად ან ლათინურად (Units in Georgian or Latin) · ვექტორები, Δ და 10-ის ხარისხები (Vectors, Δ and powers of 10) · მუდმივა: მაუსი აჩვენებს მნიშვნელობას (Constant: hover shows the value) · 28 მზა ფიზიკური ფორმულა (28 ready physics formulas) |
| 6 | ამოცანა: მოცემულია / საპოვნელია | 0:51 | 10 | Add the type, its frame preview, open the teacher's part, fill Given / Find / Solution | ამოხსნის ჩარჩო, როგორც რვეულში (A solution frame, like in a notebook) · ჩაწერეთ მოცემულობა და საპოვნელი (Write Given and Find) · ამოხსნა ჩანს მხოლოდ პასუხების ფურცელზე (The solution shows only on the answer key) |
| 7 | ელექტრული წრედი | 1:01 | 9 | Circuit tool: resistor into a gap, label R1 → R₁, insert → drawing in the question | „ელექტრული წრედი“ — ნახაზი ბადეზე ("Circuit": drawn on a grid) · აირჩიეთ ნაწილი, დააწკაპუნეთ ადგილს (Pick a part, click its place) · R1 დაიბეჭდება როგორც R₁ (R1 prints as R₁) · ჩასვით — ნახაზი კითხვაშია (Insert: the drawing is in the question) |
| 8 | ძალების ნახაზი | 1:10 | 10 | Force tool: floor → incline (mg, N turn), + friction, insert | აირჩიეთ სხეული და ზედაპირი (Choose body and surface) · ძალები თავად შემობრუნდება დახრილობით (Forces turn with the slope) · ხახუნის ძალა — ერთი დაწკაპუნებით (Friction in one click) · ნახაზი კითხვაშია (The drawing is in the question) |
| 9 | სურათები და ბადე | 1:20 | 6 | "Add picture" pointed at (no file window), "Coordinate plane" → grid preview | დაამატეთ სურათი — ან უბრალოდ ჩასვით (Add a picture — or just paste it) · ბადე ან კოორდინატთა სიბრტყე პასუხისთვის (Grid or coordinate plane for answers) |
| 10 | ქაღალდზე ნახვა | 1:26 | 10 | Paper view splits the screen; typing in question 1 updates the A4 page | ნახეთ ნამდვილი ფურცელი აკრეფისას (See the real page while typing) · ცვლილება მაშინვე ჩანს ქაღალდზე (Changes show on the paper at once) |
| 11 | ბეჭდვა და PDF | 1:36 | 9 | Print / PDF → answer key → 2 columns → Download PDF | ბეჭდვა / PDF — ერთი ღილაკით (Print / PDF: one button) · მოსწავლის ფურცელი ან პასუხები (Student paper or answer key) · ერთი ან ორი სვეტი (One or two columns) · დაბეჭდეთ ან ჩამოტვირთეთ PDF (Print or download a PDF) |
| 12 | ვარიანტები | 1:45 | 7 | Variants 3 → variant II (badge "ვარიანტი II", shuffled) → its answer key | 6-მდე ვარიანტი, არეული კითხვებით (Up to 6 variants, shuffled) · თითოეულ ვარიანტს — თავისი პასუხები (Each variant has its own key) |
| 13 | Recap | 1:52 | 5 | „ყველაფერი, რაც ნახეთ“ + 12 thumbnails (4 × 3) with names | — |

Voiceover room: each title card is 2 s of nothing but the name, and each result holds
for 1–2 s. A voice track can go over it later without re-cutting.

### Grouped
- Pictures + answer grid (scene 9). Symbol search inside "Formulas". Samples inside
  "Start a test". Units, vectors, constants, ready formulas = one "Physics toolbar" scene.

### Changed while building (to stay under 120 s)
- **Questions**: the reorder arrows (↑↓) were cut. Writing a question's text is shown in
  other scenes.
- **Circuit**: only the resistor is placed (the ammeter step was cut).
- **Given / Find**: the question text is not typed. The scene goes straight to the frame
  and the teacher's part.
- **Physics toolbar**: the Vectors tab is shown, but no vector is inserted (that step
  wrote into the wrong formula).

### Cut
- AI generator, question bank, sharing, Premium, Word export (hidden on the site now).
- Matching / fill-in-the-blank editing in detail (visible only in the type list).
- Folders, search and filters on My tests; theme and language switches; accounts.
- Typing shortcuts list, toolbar size handle, "lock options" for variants, blank pages
  for double-sided printing.

## 3. How it is built

See [README.md](README.md). In short: Playwright drives the production site in Chrome
(as a guest) and records Chrome's screencast at 2880×1620. Remotion composes the
video and renders it to `output/teacher-tour.mp4` (1920×1080, 30 fps, H.264, no audio).
