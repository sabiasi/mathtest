@AGENTS.md

# MathTest

A web app for school teachers in Georgia (the country) to create tests,
quizzes and exams in **any subject** (Mathematics, Physics, Chemistry, Biology,
History, Georgian Language & Literature, English as a foreign language; more later), then print them or export them as
PDF to hand out in class. Today teachers use Microsoft Word, where typing math
(and other special content) is painful. MathTest must make it fast and easy.
Visitors can try everything without an account (guest mode).

## Users

- School teachers, many not very technical. The UI must be simple, clean,
  forgiving, with big clear buttons and no jargon.
- UI language: **Georgian (ქართული) by default**, English second.
- The project owner is a beginner programmer learning through this project:
  explain new terms simply, explain errors and how they were debugged, and
  work phase by phase (plan → OK → build one phase → stop for review).

## Core features (built step by step)

1. **Test editor**: title, subject, grade, date, instructions, list of questions.
2. **Subject toolkits**: each subject has its own tools. Mathematics: a visual
   toolbar with fractions, powers, roots, sin/cos/tan, log, π, ≤ ≥ ≠ ±, × ÷,
   integrals, limits, matrices, Greek letters… Teachers click a button and
   type into the slots. No LaTeX knowledge needed. Physics: the math toolbar
   plus units, constants, formulas, Given/Find/Solution problems, circuit and
   force diagrams. History: date/century tools, chronology, timelines,
   sources, maps. Georgian: reading texts with numbered lines, poems,
   grammar exercises, essays, Georgian typography. Chemistry: formulas typed
   like H2SO4, reactions, periodic table, balancing, structural formulas.
3. **Question types**: common to all subjects — multiple choice, true/false,
   short answer, open answer, matching, fill-in-the-blank; plus each
   subject's own (see the toolkits).
4. **Points** per question with an automatic total.
5. **Print / PDF** that looks like a professional printed exam on A4, plus a
   separate **answer key** version for the teacher.

## Phases

- [x] **Phase 0**: project setup, CLAUDE.md, Georgian layout, "My tests" home
  (empty state + create button), empty editor page, localStorage repository.
- [x] **Phase 1**: test header form (school, title, subject, grade, date,
  time, instructions, A/B/C/D or ა/ბ/გ/დ labels) with debounced autosave;
  add/duplicate/delete/drag-and-drop questions; question types multiple
  choice, true/false, short answer, open answer; points + total; home cards
  with edit/duplicate/delete.
  - `totalPoints` was a practice task; the owner asked Claude to write it
    during the first-time-teacher review.
- [x] **Phase 2**: rich text (text + inline formulas) in question text, options
  and short answers (TipTap + MathLive); "ფორმულა" button + Alt+= (like Word);
  sticky math toolbar with 7 tabs and Georgian tooltips; read-only preview
  with static math.
- [x] **Phase 3 (print)**: `/print/[id]` with real A4 sheets, student version and
  answer key, font size / points / columns options, Print (print CSS) and
  Download PDF (headless Chrome via `/api/pdf`).
- [x] **Variants**: up to 6 variants (A = original order, B–F shuffled with a
  seeded, repeatable shuffle), per-question "lock options", variant badge on
  every paper, per-variant answer keys, "all variants" view/PDF with an
  answer table first, optional blank pages for double-sided printing.
- [x] **Images & grids**: several pictures per question (upload, paste, drop;
  resize; above/right), stored in IndexedDB; an answer grid (graph paper or
  coordinate plane, 5 mm squares, SVG) on any question; print + PDF support.
- [x] **First-time-teacher review**: sample test ("მაგალითი", added once on
  first visit + button), welcome guide, Georgian confirm dialogs, day/month/
  year date picker, toolbar only while editing a question, print-page
  warnings, readability and tablet fixes.
- [x] **Redesign**: design tokens (light + dark) in globals.css, shadcn/ui
  components, theme switcher (Light / Dark / Like my computer, next-themes),
  Motion animations, landing page (`/`, `/about`), "My tests" moved to
  `/tests` with new cards and a "…" menu, skeleton loading states, toasts
  (sonner) with Undo for deleted tests/questions. Paper stays white.
- [x] **Accounts (Supabase)**: email + password and Google sign-in, email
  confirmation, forgot/reset password, user menu, settings page (name,
  school, default subject, language, theme), protected pages (proxy.ts),
  tests + pictures in the cloud with Row Level Security, one-time import of
  old browser tests, cloud autosave indicator. Logo → /about.
  Needs the owner's Supabase project (supabase/schema.sql, .env / .env.local).
- [x] **Guest mode**: "Try without signing up" (landing) → /tests, editor,
  print and PDF work without an account; tests in localStorage, pictures in
  IndexedDB; a small dismissible banner (never a popup); on sign-up/sign-in
  guest tests + pictures move into the account automatically and are removed
  from the browser once saved. PDF route rate-limited (see Tech decisions).
- [x] **Multi-subject platform**: `subjectId` on every test (old tests: guessed
  from the printed name, else math); subject toolkits in `src/subjects/`
  (toolbar, question types, print class/CSS); "Which subject?" dialog when
  creating a test; subject picker in the test header and as Settings default;
  subject icons on cards; landing page for all subjects. Math = the full
  toolbar; physics/chemistry borrow some math tabs; history/Georgian have no
  formula toolbar. Placeholders say "special tools coming soon".
- [x] **Physics toolkit**: toolbar = all math tabs + Units (Latin "m/s" /
  Georgian "მ/წმ" switch, remembered; prefixes n μ m k M), Vectors/Δ/a·10ⁿ,
  Constants (tooltips with values), Formulas (28 ready-made); special question
  type `given-find` (მოცემულია / საპოვნელია | ამოხსნა frame, teacher's
  solution + answer only on the key and in the answer table); diagrams:
  circuits on a snap grid (wire, battery, resistor, lamp, switch open/closed,
  ammeter, voltmeter; labels R1 → R₁; junction dots automatic) and force
  diagrams (box/ball; nothing/floor/incline; presets mg, N, F_ხ, F, T that
  turn with the surface; vector arrows over letters). `\text{}` in formulas
  now uses Noto Sans Georgian (`--text-font-family`).
- [x] **History toolkit + matching**: `matching` is a common type (every
  subject): pairs + extra items, right column shuffled & lettered, answer
  boxes 1–[ ]; toolkits may add `matchingTemplates` (history: Person ↔ Date…).
  History types: `order` (events stored in the right order, shown shuffled
  and lettered, letters into boxes), `timeline` (evenly spaced, per event
  hide nothing / date / event), `source` (quote + caption + parts ა) ბ) with
  lines and key answers), `map` (uploaded map + numbered markers in %,
  optional word bank, numbered answer lines). Toolbar "Dates and centuries":
  TEXT buttons (Georgian ძვ. წ., ახ. წ., ს.… / English BC, AD, c.…, marks
  – „“ … […]) + the century tool (12 or 1121 → XII / XII ს.). Captions on
  every picture (all subjects).
- [x] **Georgian toolkit + fill-in-the-blank**: `fill-blank` is common
  (teacher writes the full text, clicks the words to blank, optional hint
  "(წერა)" and word bank). Georgian: text blocks `passage` (one paragraph per
  line, every 5th printed line numbered) and `poem` (verses/stanzas kept,
  every 5th verse numbered) — no number, no points, continue across pages;
  `mark-words` (key underlines), `grammar-table` (templates: ბრუნვა 7 cases,
  მწკრივი 11 screeves, მეტყველების ნაწილი, პირი და რიცხვი), `find-mistake`,
  `sentence-analysis` (roles ქვემდებარე/შემასმენელი/დამატება…, click words to
  fill), `essay` (up to 60 lines, guiding points, length); toolbar with „“ — –
  … and "(სტრ. )" line references; matching templates ავტორი ↔ ნაწარმოები ↔
  პერსონაჟი (three 2-column ones). Paper uses Georgian typography. No
  literary texts are built in: teachers paste their own.
- [x] **Chemistry toolkit**: chemistry formulas = math nodes whose LaTeX is
  `\ce{…}` (mhchem; MathLive renders it natively — no KaTeX), edited in a
  plain text box ("H2SO4", "2H2 + O2 -> 2H2O") with a live preview;
  `fixCharges` turns "Fe3+" into Fe^3+. Toolbar: "ქიმიური ფორმულა" button,
  tabs Formulas (periodic table popup with Georgian names, states, ↑ ↓,
  charges, hydrate, common substances), Reactions (arrows, t°, catalyst, hν,
  "=", arrow-with-conditions tool), Oxidation states (tool: element + state
  → \overset), plus math basic/algebra/greek. Question type `balance`
  (teacher types the balanced equation; atoms are counted to verify it;
  paper shows a box before each substance, key the coefficients).
  Structural formulas as a diagram (`structure`: atoms on grid dots, bonds
  1/2/3 on gaps, templates methane … acetic acid). All five subjects ready.
- [x] **English toolkit** (EFL, A1–C1): subject id `english`; paper in
  English (`print.language: "en"` → `LanguageOverride` around the sheets),
  optional Georgian instructions (`instructionKa` on any question, print
  option `bilingual`), CEFR `test.level`, `lang="en"` on the editor for
  spellcheck, Latin letters by default. Non-question blocks: `section`
  (points = sum of following questions, `sectionPoints`), `listening` (public
  link → QR via qrcode-generator, plays 1–3×, transcript on the key only;
  an audio file can be played from the computer, never uploaded), `speaking`
  (cue cards, 2/4 per 220 mm page, cut lines). New types: transformation,
  word-formation, picture-match, odd-one-out, crossword, word-search
  (`lib/puzzles.ts`, seeded; "New layout" = new seed). Extended: true/false
  `notGiven`, passage `paragraphLetters`, fill-blank `mode` open/bank/choice
  + `numbered` + `extras` + per-gap `options` (bank and choices shuffled in
  every variant, gaps never), find-mistake `style: "abcd"` with `parts`.
  Rich text marks bold/italic/underline/box (all subjects; ⌘B/I/U). Toolkit
  extras: `instructionTemplates` (menu in the card), `typeLabels`, `presets`
  (Verb forms, True/False/Not Given), `markersOnPicture` (map → "Label the
  picture"). Section headings keep with the next block.
- [ ] **Biology toolkit** (in phases; stop for review after each):
  - [x] **B1 — subject + "Label the diagram"**: subject id `biology` (Dna
    icon, green `--subject-biology`, Georgian typography, `chemistry: true`).
    Question type `label-diagram`: a built-in drawing (8 original SVG line
    drawings in `subjects/biology/drawings.ts`: animal cell, plant cell,
    flower, leaf cross-section, heart, digestive system, neuron, DNA; each
    with named `parts`) or an uploaded picture; click to add pointer lines,
    drag point and label separately; "add all parts" (spread on both sides,
    no crossing lines, numbered top to bottom); modes `boxes` (empty boxes on
    the drawing), `numbers` (numbered lines below), `match` (lettered word
    box, shuffled per variant via `shownBank`; letters computed from it);
    optional alphabetical word bank + extra words. Toolbar: ♂ ♀ → ⇌ × %,
    units μm/nm (Latin) or მკმ/ნმ (Georgian, remembered), magnification
    formulas, Latin-name tool (inserted in italics, "homo SAPIENS" →
    *Homo sapiens*), chemistry tab (H₂O, CO₂, O₂, C₆H₁₂O₆, ATP,
    photosynthesis/respiration equations as mhchem), math basic. Georgian
    instruction templates; `order` offered as "stages in order".
  - [x] **B2 — genetics**: `lib/genetics.ts` reads genotypes typed like
    Aa, AaBb, XAXa / XᴬXᵃ / X^AX^a, XaY (≤ 3 genes, one gene on X, complete
    dominance only), makes gametes (with counts, AA → "A" ×2), the square
    (rows = ♀ gametes, columns = ♂), genotype / phenotype ratios (reduced;
    "A_"/"aa" or the teacher's trait names; sex-linked labels with ♀/♂).
    Question `punnett` (mother, father, `shown` = cells given to students,
    blankGametes, showParents, askRatios, traits). Question `pedigree`
    (`lib/pedigree.ts`: people with gen + slot, couples with children;
    addPartner / addChild / movePerson / removePerson / tidy; layout with
    marriage, drop and sibling lines; numbers "II-3"); symbols □ ○ ◇, filled
    = affected, left half filled = carrier, slash = deceased; a box under a
    person for the student's genotype (key fills it); legend of the symbols
    used. Toolbar tab "გენეტიკა": genotype tool (XAXa → \mathrm{X}^{A}…),
    Xᴬ Xᵃ Y, Iᴬ Iᴮ i, P F₁ F₂ G, ×, ratios.
  - [ ] **B3 — molecular, ecology, classification**: DNA/RNA sequence tasks
    (complementary strand, mRNA, translation; key computed), printable codon
    table (3-letter amino acids + Georgian legend), food chain/web, ecological
    pyramid, dichotomous key, taxonomy ranks template.
  - [ ] **B4 — processes and data**: stages in order with pictures (+ ready
    sets: mitosis, meiosis, digestion, circulation, nerve impulse), cycle
    diagrams, data table → line/bar chart (B&W patterns) + questions,
    experiment design frame (hypothesis, variables, conclusion).
- [ ] **Business: Free / Premium / School plans** (built in stages; stop for
  review after each):
  - [x] **Stage 1 — plans, limits, pricing**: one config file
    `lib/plans/plans.ts` (prices in GEL, limits, features, trial 14 days,
    grace 7 days, `READY` = which features are built, `ONLINE_PAYMENTS`);
    `entitlements.ts` (subscription + date → what the user may do now);
    `subscriptions` table (read-only for teachers), trial on sign-up and
    for accounts that existed before; `plan_limits` / `plan_settings`
    filled from the generated `supabase/plans.sql`; picture space checked by
    the database; PDF route caps variants and adds "Made with MathTest" on
    Free; `/pricing` (monthly / yearly / school year, cards, comparison,
    FAQ, School request form → `school_requests`); `usePlan()`,
    `PremiumBadge`, `useUpgrade()` dialog; Settings → "My plan"; account
    menu shows the plan. Not-yet-built features show "Soon".
  - [ ] **Stage 2 — payments (test mode)**: provider adapter, Flitt first
    (BoG iPay possible later); recurring GEL subscriptions; status changed
    only by verified server callbacks; failed payment → retries, email,
    7-day grace, then Free; invoices list, cancel / change plan in Settings.
    Needs an email service (e.g. Resend) for the payment emails.
  - [ ] **Stage 3 — AI question generator** ("AI-ით შექმნა"): Claude API from
    the server only, monthly count per plan checked by the database, abuse
    limits, Georgian/English output, formulas in our LaTeX format.
  - [ ] **Stage 4 — Premium features**: school logo + custom header,
    templates, personal question bank, Word (.docx) export, sharing and
    co-editing. Switch each `READY` flag on when done.
  - [ ] **Stage 5 — School plan + founders' admin**: seats, invites (email or
    code), remove teachers, usage, shared bank per subject/department,
    invoice payment activated by hand; `/admin` (users, subscriptions,
    trials, revenue per month, AI usage, school requests, manual plan
    changes).
- [ ] Later: backup import/export, own email service (SMTP) and hosting.

## Tech decisions

| Area | Decision |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (configured in `src/app/globals.css`, no tailwind.config). Design tokens (colours, radius, shadows) are CSS variables there, light in `:root`, dark in `.dark` |
| UI components | shadcn/ui (Radix) copied into `src/components/ui/` (button, alert-dialog, dialog, dropdown-menu, input, textarea, tabs, tooltip, sonner, skeleton) + our `icon-button`, `form` (Field, SegmentedControl). `cn()` in `lib/utils.ts` |
| Theme | next-themes, `attribute="class"`, storage key `mathtest:theme`, default "system". Switch cross-fades with the View Transitions API |
| Animation | Motion (`motion/react`, the new name of Framer Motion) inside `MotionConfig reducedMotion="user"`; Radix pieces use tw-animate-css classes; global reduce-motion CSS rule |
| Toasts | sonner (`toast(...)`), only after real actions; autosave stays quiet |
| Font | Noto Sans Georgian via `next/font/google` (self-hosted at build time). Must also be used in print/PDF output. |
| Icons | lucide-react |
| Rich text | TipTap v3 (ProseMirror) with a custom inline `math` node (`src/features/math/MathNode.ts`) |
| Math input | MathLive `<math-field>` inside that node; our own toolbar (MathLive's keyboard and menu are hidden). The formula node is shared by all subjects; which toolbar shows comes from the subject toolkit |
| Subjects | `src/subjects/`: `ids.ts` (SUBJECT_IDS, subjectFromText; plain data, no React), `types.ts` (SubjectToolkit: Icon, colours, status ready/placeholder, formulas, toolbar tabs, questionTypes, print.className), one folder per subject (`index.ts` + `print.css`, imported in globals.css), `registry.ts` (getToolkit, SUBJECTS; steps for adding a subject are at its top). A toolkit also lists `diagrams` (drawing tools offered under each question) and optional `matchingTemplates`. Toolbar tabs may have `styles` (switchable button sets, remembered in localStorage, e.g. units Latin/Georgian), a `Widget` (React tool shown first, gets `insertText`); a button may start a `group` (small heading) and may insert plain `text` (with `caretBack`) instead of LaTeX. The toolbar shows when a toolkit has tabs or formulas; the "Σ Formula" button only when `formulas`. `insertText` adds a space automatically after a word / "." / closing quote |
| Shuffled items | Order and matching items are shuffled in EVERY variant, A included: `buildVariants` puts `shownOrder` on the printed copies (seed = test seed ^ question id for A), never equal to the answer order. Print code reads `shownOrder`; answers (`orderAnswer`, `matchingAnswers`) are computed from it, so key + answer table always match the paper Colours: `--subject-<id>` tokens. Profile `default_subject` stores a subject id |
| Math rendering | MathLive `convertLatexToMarkup` (same engine as input). Fonts/styles: `mathlive/fonts.css` + `mathlive/static.css` imported in `layout.tsx`, bundled and self-hosted; `MathfieldElement.fontsDirectory = null` |
| Accounts | Supabase Auth via `@supabase/ssr` (sign-in kept in cookies). `src/proxy.ts` refreshes the sign-in and redirects (protected: only /settings; /tests, /editor, /print are open to guests). `/auth/callback` swaps email/Google links for a session. Only the publishable key (`NEXT_PUBLIC_SUPABASE_*` in `.env.local`), never a secret key |
| Guests | Signed out (or Supabase not configured) = guest: `AuthProvider` starts the repository with `localTestsBackend()` (localStorage key `mathtest:tests:v1`) and `setImageUser(null)` (pictures in IndexedDB store `images`). On sign-in: `stopSync()` → cloud → `moveGuestTestsIntoAccount()` (lib/onboarding.ts): upload pictures, `importTests` (newer local version of an existing id → added as a copy), then after `waitUntilSaved` remove the browser copies. `useAuth().guest`, `useStorageKind()` ("cloud" / "device") |
| Storage | Supabase Postgres: `profiles`, `tests` (whole test as JSON in `data`, PK user_id+id), Row Level Security on everything (`supabase/schema.sql`). Pictures: Storage bucket `images`, path `<user id>/<picture id>`, plus a browser copy in IndexedDB store `cache` |
| Chemistry | `lib/chem.ts`: `chemLatex`/`chemSource` (\ce wrapper), `fixCharges`, `parseEquation`, `countAtoms`, `checkBalance`. In `MathNode.ts` a node whose LaTeX starts with `\ce{` gets `chemNodeView` (input[data-chem] + preview) instead of a math-field. `MathEditingContext.insertChem` types into the last focused chemistry box or starts one (`startChem`). Toolbar buttons with `chem: "..."` type mhchem code; toolkit flag `chemistry` shows the button. Elements in `subjects/chemistry/elements.ts` |
| Diagrams | Stored as DATA inside `QuestionImage.diagram` (with `imageId: ""`), so they reuse picture placement (above/right, size %) and print layout. Kinds: circuit, forces (physics), structure (chemistry, `subjects/chemistry/structure/`). Grid gaps "h:x:y"/"v:x:y" via `lib/gridEdges.ts`. Drawn as inline SVG by `subjects/physics/diagrams/DiagramView.tsx` (the shared entry point) (page font → Georgian labels work; black on white). Pure geometry in `geometry.ts`, validation/defaults in `normalize.ts` (called from migrate.ts). Editors open in `DiagramDialog` and work on a draft (Cancel = no change). `diagramSize()` sets width/height (aspect ratio) on save |
| Print blocks | `features/print/blocks.ts`: `printBlocks(questions)` = what `paginate` packs. One block per question, except: `passage` → one per paragraph (`id~p0…`), `poem` → one per stanza (`id~s0…`), `essay` → the question + blocks of 10 lines (`id~l0…`). Continuations (`flowsOn`) get `gap: 0` in paginate and are pulled up over the flex gap when not first in a column. `pieces.tsx` `renderBlock` draws a block. Reading-text line numbers: every line has the same height (line-height 1.65 = PASSAGE_LINE_HEIGHT), `usePrintLayout` measures each paragraph's height ÷ line height → `lineStarts`; numbers are positioned at n × 1.65em (on a wrapper with the text's font size) and clipped. Question numbers come from `questionNumbers()` (texts get none); the answer table skips texts; variants shuffle only the questions between texts (`shuffleAroundTexts`) |
| Rich text marks | `RichText` text segments may have `marks` (bold, italic, underline, box); TipTap Bold/Italic/Underline + our `BoxMark`; `RichTextView` wraps them. Toolbar buttons with `format` toggle a mark |
| Print language | `LanguageOverride` (i18n/language.ts) makes `useT`/`useLanguage` return a fixed language inside the sheets (English tests). The app around them stays in the interface language |
| Typography | `lib/typography.ts` `georgianTypography` („“, —, …) applied at print time when the toolkit has `print.typography: "georgian"`, via `TypographyProvider` / `useTypography()` (RichTextView, header, Georgian blocks). Editors show text as typed |
| Words | `lib/words.ts`: `tokenize`, clicked words saved as `WordRef { word, occurrence }` (survives edits elsewhere); `WordPicker` in the editor |
| Print | Our own pagination (`src/lib/paginate.ts` + `usePrintLayout`) into fixed 210×297mm `.sheet`s; `@page { size: A4; margin: 0 }` |
| PDF | `POST /api/pdf` (guests too) → puppeteer-core opens the same `/print` page with the test injected as `window.__MATHTEST_PRINT__` (no sign-in cookies are passed) → `page.pdf()`. Limits (`lib/server/rateLimit.ts`, in memory): 10 PDFs / 10 min per guest IP, 200 / 10 min for all guests together, 40 / 10 min per signed-in teacher, at most 3 PDFs at once (503), body ≤ 25 MB, ≤ 300 questions (413). 429 has `Retry-After`; the print page explains it. With several servers / serverless, move the counters to a shared store (e.g. Upstash Redis). Chrome found by `findChrome()` / `CHROME_PATH`; hosting will need e.g. @sparticuz/chromium. No Chrome → 501 → client falls back to `window.print()` |
| Fonts | Noto Sans Georgian + Noto Sans (backup for №, Cyrillic…), both via next/font; math fonts from MathLive CSS. PDFs must embed only these. |
| Drag and drop | @dnd-kit (core + sortable), handle-only, keyboard accessible |
| Plans | `src/lib/plans/plans.ts` is the ONLY place for prices, limits and features (plain data). `entitlementsFor(subscription, now)` → `{ plan, state: guest/free/trial/active/ending/grace, limits, features, trialDaysLeft, renewsAt, endsAt }`. Guests = Free. A plan ending never deletes anything: only Premium features lock (e.g. a 5-variant test keeps its setting but prints 2) |
| Plans in the database | `subscriptions` (one row per user; teachers may only SELECT their own row — no insert/update grants), `plan_limits` + `plan_settings` (filled by `supabase/plans.sql`, GENERATED by `npm run plans:sql`; `plansSql.test.ts` fails when it's out of date). `public.plan_of(uid)` mirrors `entitlements.ts` in SQL (internal: execute revoked); `my_plan()`, `my_image_storage()`, `image_upload_allowed()` for the signed-in user. Trigger `start_trial` on new users (never blocks a sign-up) |
| Plan enforcement | The server decides, the browser only shows: `/api/pdf` reads the plan (`serverEntitlements`, Free if unknown), caps the variant, and injects `entitlements` into `window.__MATHTEST_PRINT__`; the print page reads them via `usePlan()`. Picture uploads are refused by the storage policy once `image_upload_allowed()` is false (`addImage` checks first → `ImageStorageFullError`). The browser's own Print button can't be controlled (documented) |
| Privileged writes | Still NO service_role key. Plan changes come from `security definer` database functions; stage 2 will add narrow functions that require a server-only secret (env var) for verified payment callbacks |
| Upgrade UX | `useUpgrade()("variants" \| "images" \| "footer")` opens a small dialog only after a click on a Premium feature; it changes nothing and loses nothing. `PremiumBadge` (gold `--premium-*` tokens). Guests are offered "create a free account" (= 14-day trial) |
| Label the diagram | `LabelDiagramQuestion` (`picture`: `{kind:"builtin", drawing}` or `{kind:"upload", imageId, width, height}`). Positions (`x,y` = where the line points, `lx,ly` = the label) are in % of the DRAWING AREA = picture + `SIDE` (0.32 × width) room left/right + `PAD` above/below (`lib/labelDiagram.ts`: `PICTURE_BOX`, `areaAspect`, `placeLabel`, `labelsForParts` → `spreadAlongSide` + `uncross`, `printedBank`, `labelLetters`). Paper and editor share `LabelArea` (`subjects/biology/LabelDiagramView.tsx`): picture, SVG lines (viewBox 1000 wide), labels as HTML (boxes sized in mm; styles in `LabelDiagramView.css`, imported by the component). Browser check of the print positions: `PRINT_TEST_URL=http://localhost:3000 npx vitest run src/subjects/biology/LabelDiagramPrint.browser.test.ts` (skipped in a normal `npm test`). Built-in drawings are `<img src="data:image/svg+xml…">` (`drawingUrl`), no storage used. Uploaded pictures count in `usedImageIds` |
| Tests | Vitest + jsdom (`npm test`) |

Next.js 16 notes (see AGENTS.md: read `node_modules/next/dist/docs/` before
using unfamiliar APIs):
- `cacheComponents` is on. Client hooks that read the URL (`useParams`,
  `useSearchParams`) must sit inside `<Suspense>`, or the build fails.
- Route `params` are Promises; types like `LayoutProps<"/">` / `PageProps<…>`
  are generated by `next dev` / `next build` (so run one before `tsc`).
- Visited routes stay mounted but hidden (React `<Activity>`), so state survives
  back/forward navigation.

## Architecture and conventions

```
src/
  app/                  Routes only, kept tiny (page.tsx renders a feature view)
    page.tsx            /              → features/landing/LandingView (signed in → /tests via proxy)
    tests/page.tsx      /tests         → features/home/HomeView ("My tests", guests too)
    about/page.tsx      /about         → features/landing/LandingView (always)
    editor/[id]/page.tsx /editor/:id   → features/editor/EditorView
  features/<name>/      Page-level UI for one feature
  features/math/        RichTextInput (TipTap box), MathNode, MathEditingContext (which box
                        is active), RichTextView (static), mathlive.ts — shared by all subjects
  subjects/             Subject toolkits: ids, types, registry, <id>/index.ts + print.css,
                        math/toolbar.ts (the 7 math tabs)
  subjects/history/     toolbar.ts (dates tab), CenturyTool, HistoryPrint (order, timeline,
                        source, map + orderAnswer), editors/ (Order, Timeline, Source, Map,
                        RowControls ↑↓✕)
  features/editor/questions/MatchingEditor + features/print/MatchingPrint (common matching)
  lib/roman.ts          toRoman, centuryOf
  subjects/physics/     toolbar.ts (math + physics tabs), GivenFindEditor/GivenFindPrint,
                        diagrams/ (normalize, geometry, DiagramView, CircuitEditor,
                        ForceEditor, DiagramDialog)
  features/subjects/    SubjectPicker + SubjectIcon, NewTestDialog ("which subject?")
  components/           Shared UI: AppHeader/HeaderNav/AppFooter, Providers (theme, motion,
                        tooltips, confirm, toaster), ThemeSwitcher, PageTransition,
                        EmptyState, ConfirmDialog, DateField, GuestBanner, ui/ (shadcn)
  features/landing/     LandingView (hero, try button, subjects, paper preview, features)
  lib/onboarding.ts     guestTestCount, moveGuestTestsIntoAccount (guest → account)
  i18n/                 dictionaries.ts (ka + en text), language.ts (useT, useLanguage)
  features/editor/      EditorView → TestEditor (state + autosave), TestHeaderForm,
                        SubjectToolbar (tabs from the toolkit), questions/ (QuestionList with dnd-kit, QuestionCard, one editor per type)
  features/print/       PrintView (controls + sheets), PrintBlocks (header, questions),
                        usePrintLayout (measure → paginate), downloadPdf
  app/api/pdf/route.ts  PDF generation; lib/server/chrome.ts finds/launches Chrome
  lib/paginate.ts       Pure page packing (never splits a question)
  lib/checks.ts         findProblems(test): empty questions, missing answers (print-page warnings)
  lib/sample.ts         createSampleTest(language): the "მაგალითი" test
  lib/images/           imageStore (IndexedDB, resize, data URLs for PDF, clean-up), imageMath (pure)
  components/           … GridArea (SVG grid in mm), QuestionImageView (picture with fixed aspect ratio)
  lib/variants.ts       buildVariants(test) → [A (original), B…]; seededRandom + shuffle
  lib/richText.ts       RichText = [{type:"text"} | {type:"math", latex}] + conversions to/from TipTap docs
  lib/questions.ts      Pure helpers: create/duplicate/change type, totals, labels
  lib/storage/          types.ts, migrate.ts (normalizeTest), testsRepository.ts (memory + send
                        queue to a backend), supabaseTests.ts (cloud), localTests.ts (guests),
                        useTests.ts
  lib/supabase/         config (env), client (browser), server (route handlers)
  lib/auth/             routes (protected paths, safeNext), errors (→ Georgian messages), profile
  lib/server/           chrome.ts (PDF Chrome), rateLimit.ts (limits for /api/pdf)
  lib/plans/            plans.ts (THE config), entitlements.ts, pricing.ts, subscription.ts
                        (load row / picture space), server.ts (server-only), plansSql.ts
  subjects/biology/     drawings.ts (+ drawingIds.ts), LabelDiagramEditor, LabelDiagramView
                        (paper + shared area), toolbar.ts, BioTools (Latin name), latin.ts
  lib/labelDiagram.ts   label positions, word box, letters (pure)
  features/plans/       PlanProvider (usePlan), UpgradeDialog (useUpgrade), PremiumBadge,
                        PlanSummary (Settings → My plan), useImageError
  features/pricing/     PricingView (/pricing), SchoolRequestForm (→ /api/school-request)
  lib/schoolRequest.ts  parseSchoolRequest (checks the School request form)
  features/auth/        AuthProvider (useAuth, guest or cloud sync), AuthParts, SignIn/SignUp/
                        ForgotPassword/ResetPassword views
  features/settings/    SettingsView
  src/proxy.ts          sign-in refresh + redirects (Next 16's "middleware")
  supabase/schema.sql   tables, RLS policies, trigger, storage bucket (paste into SQL Editor)
  lib/format.ts         Date formatting (Georgian by hand)
```

- **Never use raw Tailwind colours** (slate-500, indigo-600…): use tokens
  (`bg-card`, `text-muted-foreground`, `text-brand`, `bg-primary-soft`,
  `border-input`, `text-destructive-text`, `bg-success`…), so dark mode works.
  Exceptions: things on white paper (`.sheet`, `.paper`) use neutral/black.
- **Paper is always white**: `.sheet` and `.paper` re-declare the light tokens;
  picture, grid and line previews in the editor sit on `.paper`. The PDF route
  forces light mode. Never use `dark:` classes inside print components.
- **All user-visible text goes in `src/i18n/dictionaries.ts`** (Georgian first,
  English with the same keys). Never hard-code UI text in components.
- **Only `src/lib/storage/testsRepository.ts` reads or writes tests.**
  Components use `useTests()` / `useTest(id)` / `useSaveState(id)` and the
  repository functions (sync API: memory first, cloud in the background).
  Every loaded test passes through `normalizeTest` (migrate.ts): when adding
  a field, give it a default there so older saved tests keep working.
- **Privacy is enforced by RLS in the database**, not by the UI. Every new
  table gets RLS + policies on `(select auth.uid())`. Never use or add the
  service_role / secret key in this app.
- Question text, options and short answers are `RichText` (our own format, not
  TipTap JSON). Formulas are stored as LaTeX. Use `RichTextInput` to edit and
  `RichTextView` to display. Exception to the dictionary rule: toolbar
  tooltips live in the toolkit's toolbar file, e.g. `src/subjects/math/toolbar.ts`
  (ka + en per button). Subject names are in the dictionaries (`subject.<id>`).
- **Never check a subject by name in shared code** (no `if (subjectId === "math")`
  in the editor/print): put the difference in the toolkit and read it via
  `getToolkit(test.subjectId)`.
- **Guests are first-class**: anything on /tests, /editor, /print must work
  with `useStorageKind() === "device"` (no user id, no profile). Only pages
  that really need an account go in `PROTECTED_PREFIXES`. Anything new that
  costs the server work must get a rate limit (lib/server/rateLimit.ts).
- Georgian schools write tg / ctg (not tan / cot) and ";" in intervals.
- Chrome has no Georgian `Intl` date data: use `src/lib/format.ts`, never
  `toLocaleDateString("ka-GE")`.
- Pages that read localStorage are client components; the server renders a
  "loading" state (snapshot `null`) to avoid hydration mismatches.
- Small, clearly described git commits. Run `npm test`, `npm run lint` and
  `npm run build` before committing.

## Gotchas learned the hard way

- MathLive only exists in the browser: import `MathfieldElement` via
  `loadMathLive()` (dynamic import), never at the top of a module.
  `convertLatexToMarkup` is fine to import normally (SSR build has it).
- Setting `mf.menuItems` before the math-field is mounted throws
  "Mathfield not mounted" and silently cancels the ProseMirror transaction.
  Set it in the `mount` event.
- ProseMirror's `state.selection` lags the DOM by a moment after arrow keys.
  Key handlers next to formulas read the DOM selection (`posAtDOM`).
- Toolbar buttons use `onMouseDown={preventDefault}` so focus stays in the box.
- After `npm install`, Turbopack's watcher can miss CSS edits; restart
  `npm run dev` if styles look stale.
- On macOS, Home/End don't move the caret in browsers; tests use Cmd+←/→.
- Turbopack keeps a disk cache in `.next/`; changes to `@theme` or next/font
  options were missed even after restarting. If output looks stale:
  stop the server, `rm -rf .next`, start again.
- next/font adds an Arial-based "… Fallback" face that claims every character,
  and Turbopack ignores `adjustFontFallback: false`. layout.tsx therefore
  builds the font list itself (`--font-georgian-only`, then `--font-fallback`).
- Unlayered CSS in globals.css beats Tailwind utilities (they live in
  `@layer utilities`); use inline styles or `!` when a utility must win.
- Print measurement: `[data-print-ready="true"]` is set only when the pages
  match the current data and fonts; the PDF route waits for it.
- Check which real font Chrome used: CDP `CSS.getPlatformFontsForNode`.
- Pictures keep their natural width/height in the test, and are shown with
  CSS `aspect-ratio`, so print layout can be measured before they load.
- The PDF route gets pictures as data URLs and injects them as
  `window.__MATHTEST_IMAGES__`; `getImageUrl` checks that first.
- Paste: if the clipboard has text too (e.g. from Word), paste text, not a picture.
- Async edits to a question (image upload) use `onPatch(fn)` so they apply to
  the newest version and don't overwrite text typed meanwhile.
- Browser tests: wait for a condition (`waitForFunction`), not a fixed time.
- Never use window.confirm: use `useConfirm()` (components/ConfirmDialog.tsx).
- Never use <input type="date">: use components/DateField.tsx (dd / month / yyyy).
- The math toolbar only renders while a rich-text box is active
  (MathEditingContext clears it on focus elsewhere). Browser tests wait for
  `[data-editor-ready="true"]`, not for the toolbar.
- The sample test is created once per browser (flag `mathtest:sample-added`);
  browser tests that start from an empty browser set that flag first.
- Touch screens get bigger targets via Tailwind's `pointer-coarse:` variant.
- Variants must stay repeatable: never use Math.random() for them; change the
  seed only via "Shuffle again" (it warns that printed papers won't match).
- The PDF route waits with `waitForFunction(..., { polling: 250 })`; puppeteer's
  `waitForSelector` missed the ready flag with many variants.
- PDFs are slow on `npm run dev` (30–45 s for all variants) because the dev
  server compiles on demand; production takes about 1 s. Measure speed on
  `next build && next start`.

- A client file's exports are all a server component can use: a property
  hung on an exported function (`HeaderNav.Fallback`) is `undefined` on the
  server ("Element type is invalid"). Export it as its own function.
- Hidden (Activity) pages stay in the DOM: in browser tests `ol > li` also
  matches the hidden "My tests" guide. Use `ol:has([data-question-card]) > li`.
- Opening a dialog from a Radix dropdown item: give the menu `modal={false}`,
  or the page can stay unclickable.
- Radix Tabs switch on mouse-down; the math toolbar prevents mouse-down (to
  keep focus in the box) and switches tabs in onClick instead.
- MathLive takes colours from the computer's dark setting, not our switch:
  globals.css sets `--caret-color`, `--selection-background-color`, … on
  `math-field` from our tokens.
- `shadcn add` imported `cn` from an npm package named `cn` (shadcn's new
  helper); we use `@/lib/utils` instead. After adding a component, replace
  `from "cn"` with `from "@/lib/utils"`.
- Question cards: the outer `motion.li` is moved by dnd-kit (transform) and
  grown/shrunk by Motion (height/opacity); the visual card is the inner
  `[data-question-card]` div (also the paste/drop target).

- `for (const x of map)` visits entries re-added during the loop: the send
  queue loops over a snapshot (`[...queue]`) or failed saves retry at once.
- Next.js adds a hidden `role="alert"` route announcer: browser tests select
  our message boxes with `[role=alert].rounded-xl`.
- Supabase's built-in email only sends to the project team's addresses and
  only a few per hour: real teachers need custom SMTP (e.g. Resend).
- Browser tests can run as a guest (fresh browser = empty localStorage);
  only the account parts (sign-in, moving guest tests) need a Supabase test
  account.
- Pictures vs diagrams: anything that reads `image.imageId` must skip
  diagrams (`usedImageIds` does). Map questions keep their picture in
  `question.map.imageId`; `usedImageIds` counts it — without that, picture
  clean-up would delete maps. A diagram with broken data is dropped by
  `normalizeTest`.
- SVG click targets: use a `<rect>`, not a thick transparent `<line>` — a
  straight line's box has zero width, so browser tests (and some screen
  readers) treat it as invisible.
- iCloud syncs the Desktop folder: it can create "file 3.ts" copies (seen in
  `.next/` and `.git/`). If `tsc` complains about duplicates in `.next/types`,
  delete those " 3" copies (or `.next` when no dev server runs). Better: keep
  the project outside iCloud-synced folders.
- CSS `em` in `top:` is relative to the element's OWN font size: line numbers
  are positioned on a wrapper with the text's font size, the smaller number
  is inside it.
- `.answer-table` and print blocks also exist as invisible measuring copies:
  browser tests select `.sheet …`.
- A `display: none` input can't take focus: show it first (chemistry chips
  add `.is-editing` in `openChem` before `focus()`).
- TipTap's `chain().focus()` focuses a frame LATER when the editor isn't
  focused — it then steals focus from anything focused meanwhile (e.g. a new
  chemistry box after the periodic-table window). Don't chain `.focus()` there.
- Toolbar windows (periodic table) carry `data-keep-editing`, or the toolbar
  would close (and unmount the window) when focus moves into them.
- A RichTextInput only reads `value` when created: to replace the text from
  outside (instruction templates), change its `key` (QuestionCard `textVersion`).
- Non-question blocks (`isTextBlock`): passage, poem, section, listening,
  speaking — no number, no points, skipped by the answer table, fixed in
  shuffled variants. Pieces may depend on the version (`printBlocks(questions,
  version)`): the transcript exists on the key only.
- Pictures used by `picture-match` live in `q.pictures`; `usedImageIds` counts
  them (like maps).
- This project has no Prettier: don't run `npx prettier` (it downloads one
  and re-wraps whole files at 80 columns). Match the existing ~140-column style.
- `cleanUpImages(tests)` must only run once tests are loaded (`tests !== null`):
  while loading the list is empty and every picture looks unused.
- Placeholder subject colours: `bg-subject-<id>/12` (the opacity modifier works
  on our colour tokens); class names are written out in full in each toolkit
  so Tailwind finds them.
- The PUBLIC Supabase URL + publishable key live in the shared, committed
  `.env` (so collaborators can run the app after `git pull`); `.env.local`
  (never committed) can override them. `envSafety.test.ts` fails if a
  secret ever lands in `.env`.
- Without Supabase values the app still runs: public pages work, and
  account pages show "not connected yet" (SetupGate / SetupNotice).
- Plans: after changing `lib/plans/plans.ts`, run `npm run plans:sql` and
  paste `supabase/plans.sql` into Supabase, or the database keeps the old
  limits. The plan rules exist twice (entitlements.ts and `plan_of` in
  schema.sql): change both together.
- `usePlan().ready` is false while a signed-in teacher's plan loads: the
  print page then shows everything (no flicker for Premium) and the footer
  only once it's known. The PDF route never depends on this.
- Supabase functions in `public` are executable by anon/authenticated by
  default: helper functions that take a user id must `revoke execute`.
- Instruction templates: the PAPER's language goes into the question
  (`toolkit.print.language === "en"` → `en`, else `ka`); only bilingual
  toolkits (English) also fill `instructionKa`.
- Toolbar widgets can insert formatted text: `insertText(text, caretBack,
  ["italic"])` adds a plain space after it, so typing continues unformatted.
- SVG text (pedigree) must get the `font-sans` class: with only
  `font-family: inherit` Latin letters fell back to a serif font.
- Genetics letters: one letter can't name an autosomal gene and the gene on
  the X at once ("AaXᴬXᵃ" → error "sameLetter"); use AaXᴮXᵇ.
- Built-in biology drawings and their part names live in
  `subjects/biology/drawings.ts` (content data, like `elements.ts`), not in
  the dictionaries. Drawings have no words on them; keep them black/grey on
  white. To check a drawing, bundle drawings.ts with `npx rolldown` and
  render it in headless Chrome.
- SQL in schema.sql can be tried locally in Docker (postgres image) with
  small stand-ins for `auth.users`, `auth.uid()` and `storage.objects`.

## Commands

```bash
npm run dev     # start the dev server at http://localhost:3000
npm test        # run unit tests once (npm run test:watch to keep watching)
npm run lint    # check code style and common mistakes
npm run build   # production build (also type-checks)
npm run plans:sql  # regenerate supabase/plans.sql after changing lib/plans/plans.ts
```

## History

The previous project in this repo (DevPath) is preserved at git tag
`devpath-phase1`.
