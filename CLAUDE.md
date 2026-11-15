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
- [x] **First-time-teacher review**: sample test ("მაგალითი"; since replaced
  by the per-subject samples below), welcome guide, Georgian confirm dialogs, day/month/
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
- [x] **Geography toolkit**: subject id `geography` (Earth icon, olive
  `--subject-geography`, Georgian typography). Types: `map` (shared with
  history; MapEditor offers the built-in "outline map of Georgia"),
  `scale-calc` (1 : denominator shown numeric / named "1 სმ-ში 500 მ" /
  scale bar of 1 cm segments; rows map cm → ground or ground → map cm,
  answers computed; optional "write the scale in the other form"),
  `climate-chart` (12 months °C + mm → SVG chart, line + hatched B&W bars,
  shared grid lines; optional table; questions warmest / coldest / range /
  mean / total / wettest / driest with computed answers). `lib/geography.ts`
  (pure maths, decimal comma in Georgian). Toolbar: Coordinates tab (tool:
  degrees + minutes + side → "41°43′ ჩ. გ., 44°47′ აღმ. გრძ." or
  "41°43′N, 44°47′E"; ° ′ ″; Georgian/Latin), Units tab (კმ … კაცი/კმ²,
  "1 : ", Georgian/Latin), math basic.
- [x] **My tests by subject + samples**: `/tests` is organised by subject
  (never mixed): sidebar (desktop) / scrolling tabs (phone) from the
  registry with icon, colour, count; "All tests" grouped under subject
  headings; empty subjects hidden unless "Show all subjects"; last view
  remembered (`mathtest:home-view`). Inside a subject: search by title,
  grade filter, sort (last edited / created / title), folders (`test.folder`,
  synced; empty folders in `mathtest:folders:v1`, this browser only),
  drag a card onto a folder chip or "…" → Move to folder; rename / delete
  folder (tests are kept). "New test" inside a subject skips the subject
  dialog. Samples ("ნიმუში"): one per subject in `src/samples/<id>.ts`,
  fixed id `sample-<id>`, read-only (editor `inert` + banner, never saved),
  each uses every question type of its toolkit (samples.test.ts), editor-only
  `tip` on questions, Preview / Print (`?print=1`) / Use as template
  (editable copy with new ids). Landing: "See a sample test" + subject chips
  open their sample paper. The old auto-added math sample is gone.
- [x] **Quality pass** (3 phases): (1) bugs — the toolbar never moves the
  page, undo steps, print fixes, Playwright tests; (2) Word-like toolbars —
  symbol search, typing shortcuts, more symbols in every
  subject; (3) "calm light" redesign — new landing page with a live demo,
  shared backdrop, subject-coloured cards. See Tech decisions: Editor
  scrolling, Browser tests, Toolbar (Word-like), Visual design, Landing page.
- [x] **Guest trial + reordering** (2026-11-15):
  - **One free trial test for guests** (`lib/guestTrial.ts`,
    `features/auth/GuestTrial.tsx`): a signed-out visitor (accounts
    configured) may create ONE test (new / "Use as template"); then New
    test, Duplicate and Use as template open the "უფასო ცდა გამოყენებულია"
    window (sign up / Google / sign in). The flag lives in localStorage
    `mathtest:guest-trial`, IndexedDB `mathtest-trial`/`flags`/`used` and
    the cookie `mathtest_trial` (400 days); any one restores the others.
    A guest who already has a test counts as used. `useGuestTrial()`:
    `check()` only looks (before "which subject?"), `request()` starts the
    trial right before creating (POST `/api/guest-trial`: per-IP daily
    limit in memory, `GUEST_TRIALS_PER_IP_PER_DAY`, default 30 — schools
    share IPs; 429 → the window; network errors don't block). Samples never
    count. Signing up moves the trial test in (existing migration). Editor:
    `TrialNote`. `/privacy` (features/legal) explains the cookie; footer
    link. e2e: `openSampleCopy` calls `forgetGuestTrial` (leaves the editor
    first — it saves on the way out — then clears the flags and guest
    tests), so each copy is a fresh trial; playwright lifts the IP limit.
  - **Reordering**: `components/ReorderArrows.tsx` (ChevronUp/Down in a
    rounded pill, labels `list.up`/`list.down` = „ზემოთ/ქვემოთ
    გადატანა“) on question cards (vertical, right edge, opacity 0 until
    hover / focus-within, always on `pointer-coarse`), multiple-choice
    options, matching pairs and every `RowControls` list (order, timeline…).
    Cards also get a "⋯" menu (move to top / bottom, duplicate, delete) and
    Alt+↑/↓ (`onKeyDownCapture` on the card). `TestEditor.moveQuestion`:
    arrayMove, `moveTick` (+1 per arrow/menu/key move), Undo toast (old id
    order, keeps edits), `useLayoutEffect` gives focus back (React moves DOM
    nodes) and scrolls gently only when the card's top left the window.
    The card's inner `motion.div` has `layout="position"` with
    `layoutDependency={moveTick}`: only those moves glide (not typing, not
    drag-and-drop; off with reduced motion). Drag handle ⋮⋮ stays.
    `e2e/reorder.spec.ts`, `e2e/guest-trial.spec.ts`.
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
  - [x] **B3 — molecular, ecology, classification**: `lib/molecular.ts`
    (readSequence: DNA has T, RNA has U, ≤ 42 bases; complement, transcribe
    from the template or coding strand, the genetic code, translate stops at
    Stop, `sequenceRows`). Question `sequence` (given strand + tasks
    complement / mrna / protein, `example` = first codon given; bases in
    boxes grouped by codon, 8 codons per line, 4 on two-column papers).
    Block `codon-table` (a text block: no number, no points — drawn in
    `pieces.tsx`; 4×4 table + optional Georgian legend). `lib/ecology.ts`:
    question `food-web` (organisms on a 5×5 grid, arrows food → eater,
    edge-to-edge, hidden boxes; samples chain / web) and `pyramid` (levels
    bottom first, hide name / value / both; samples energy / biomass /
    numbers). `lib/dichotomous.ts`: question `dichotomous-key` (couplets
    with yes / no leads → next question or organism; list or tree layout;
    loops end safely) and `taxonomy` (8 ranks, plants → "განყოფილება",
    Latin genus / species in italics; default = human with 3 ranks hidden).
    Print styles in `subjects/biology/BiologyPrint.css`.
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
  - [x] **Stage 2 — payments (TEST MODE; no real money until the owner goes
    live, see docs/GO_LIVE.md)**: provider adapter `lib/payments/`
    (`PaymentProvider`: createCheckout, chargeRenewal, verifyWebhook,
    parseEvent, cancel, getInvoice) with `mock` (own bank page
    `/checkout/mock`: success / success-then-renewals-fail / declined /
    3-D Secure fails; signed webhook over HTTP to our own route), `flitt`
    and `bog` (BoG Payments API; both written from the public docs, NOT yet
    run against a real merchant). `PAYMENT_PROVIDER` picks one (dev: mock;
    production: off unless set; mock never runs in production outside the
    sandbox). Database (`migrations/20261116_payments.sql`):
    `payment_customers`, `payments` (= receipts), `payment_events` (unique
    provider + event id → idempotent), `email_log`, `subscription_changes`
    (audit) + `changed_by / changed_reason / changed_at` on subscriptions,
    `server_secrets` (hash only). Every plan change is a `security definer`
    function that demands `BILLING_SERVER_SECRET` (`billing_start_checkout`,
    `billing_record_event`, `billing_start_renewal`, `billing_set_cancel`,
    `billing_set_period`, `billing_sweep`, `billing_summary`, `email_claim`).
    Routes: `/api/billing/{checkout,cancel,resume,change-plan,summary}`,
    `/api/billing/webhook/[provider]`, `/api/billing/return/[provider]`,
    `/api/cron/billing` (CRON_SECRET), pages `/billing/success`,
    `/billing/failed`, `/billing/receipt/[id]`. Lifecycle: trial → paid,
    renewals by our cron, failed renewal → retries on days 1 / 3 / 5
    (`RENEWAL_RETRY_DAYS`) → grace (`GRACE_DAYS`) → Free; cancel at period
    end / resume; refund ends the period it paid for. Emails `lib/email/`
    (Resend, or "console" when no key: nothing leaves the computer), 9
    templates ka + en, each sent once (`email_log`). UI: Buy buttons, TEST
    MODE banner, Settings → My plan (`features/billing/BillingSection`), the
    upgrade dialog's Buy button. Receipts use `lib/payments/seller.ts`
    (EMPTY: the owner fills it in). `/terms`, `/refund`, `/privacy` carry a
    "draft" notice. `ONLINE_PAYMENTS` stays false until go-live.
  - [x] **Stage 3 — AI question generator** ("AI-ით შექმნა", `READY.aiGenerator`):
    button above "add a question" in the editor → `features/ai/AiGenerateDialog`
    (topic, grade, types, count ≤ 10, difficulty, language, optional pasted
    text ≤ 8000 chars) → `POST /api/ai/generate` → review (remove / "another
    one" / insert). Server: `lib/ai/service.ts` (signed-in only; 6 / min and
    40 / hour per teacher, 30 / min per IP), `claude.ts` (official
    `@anthropic-ai/sdk`, model id in ONE constant `AI_MODEL`, structured
    output with `wire.ts`'s JSON schema, refusal fallback), `mock.ts` (no
    `ANTHROPIC_API_KEY` = mock mode: ready-made samples, clearly labelled),
    `convert.ts` (every item rebuilt with `createQuestion`, formulas checked
    with MathLive, equations with `checkBalance`, then `normalizeTest`;
    anything broken is dropped). Database (`migrations/20261117_ai_usage.sql`):
    `ai_usage` (no question text) + `ai_consume` / `ai_finish` /
    `ai_regenerate` / `ai_status` (server secret): the plan's
    `aiGenerationsPerMonth` is checked and counted there, the month runs by
    Tbilisi time, a failed or empty generation is given back, only the
    teacher's active teaching subjects. Replacing one question is free (5 per
    generation). Guests get the sign-up window. AI types: `AI_TYPES` ∩ the
    toolkit's question types (multiple choice, true/false, short, open,
    matching, fill-blank, order, given-find, balance).
  - [x] **Stage 4 — Premium features** (every `READY` flag of Premium is on):
    - **customHeader**: `lib/paperHeader.ts` (logo, school name, ≤ 3 extra
      lines, logo left / centre / right), saved in `profiles.paper_header`
      (trigger `check_paper_header`: only a plan with the feature may CHANGE
      it; a saved header is kept when the plan ends, just not printed).
      Settings → `PaperHeaderSettings` (live small paper), `usePaperHeader()`
      on the print page; the PDF / Word servers get it as `paperHeader` and
      check the plan again. The logo is a normal picture (counts in picture
      space; kept by picture clean-up via `keepImages("header")`).
    - **allTemplates**: `/templates` (`features/templates/TemplatesView`):
      16 original templates; `src/templates/catalog.ts` (titles only, safe
      for the browser) + `content.ts` (questions, SERVER only);
      `GET /api/templates/[id]` checks the plan (Free: the first
      `limits.templates` = 5; guests too) and is rate-limited. Add new
      templates at the END of the catalog (the first five are the free ones).
    - **questionBank**: `bank_questions` (one question per row, owner-only
      RLS, adding / changing needs the feature, ≤ 2000), `lib/bank/` (pure
      `bank.ts` + `bankStore.ts`, loaded after sign-in like tests), `/bank`
      (search, subject / grade / type / tag filters, preview drawn with the
      real print code), "Save to my bank" in the question card's menu,
      "Insert from bank" in the editor (copies with new ids). Pictures in
      bank questions are kept by `keepImages("bank")`.
    - **docxExport**: `POST /api/docx` (signed in + plan checked on the
      server, 20 / 10 min per teacher, 2 at once). `lib/docx/`: `fromTest.ts`
      (multiple choice, true/false, short, open, matching → real Word text),
      `omml.ts` (LaTeX → MathML via MathLive → Word equations; unknown →
      null), `shoot.ts` (every other question type = a sharp picture of the
      printed block from headless Chrome), `document.ts` + `zip.ts` (the
      .docx itself, no extra package). Student / key / all variants.
    - **sharing**: see "Sharing and co-editing" in Tech decisions.
  - [ ] **Stage 5 — School plan + founders' admin**: seats, invites (email or
    code), remove teachers, usage, shared bank per subject/department,
    invoice payment activated by hand; `/admin` (users, subscriptions,
    trials, revenue per month, AI usage, school requests, manual plan
    changes).
- [ ] Later: backup import/export, own email service (SMTP) and hosting.

## Teaching-subject access (Phase 1 complete)

- `teacher_subjects` stores explicit onboarding and subject assignments, separate
  from administrator roles. `set_teaching_subjects(chosen, preferred)` is the
  only authenticated write path. Free selects one subject once; Premium/School
  use the `multipleSubjects` plan feature, including existing trial/grace rules.
- Existing `default_subject` is only a suggestion until onboarding is complete.
  After expiration, multi-subject accounts choose one previously assigned subject.
  Other account tests remain readable/printable and their editors are inert.
- `TeachingSubjectsProvider` loads account assignments, handles onboarding and
  Settings, and guards creation/template/copy/subject-change actions. The
  repository also checks the current account's subject assignments. RLS checks
  both the old and new test subject, preventing reclassification as a bypass.
- Apply generated `supabase/plans.sql`, then
  `supabase/migrations/20261114_teaching_subjects.sql` to existing installations.
  Fresh setup: full `schema.sql`, then `plans.sql`. Never apply production SQL
  automatically. The full schema includes the standalone migration verbatim.
- Guest editing still works in every subject. Migration now runs in
  `TeachingSubjectsProvider` after assignments and cloud tests load, not directly
  in AuthProvider. Only assigned subjects migrate; confirmed picture uploads and
  successful test saves precede removal. Other guest tests remain on the device
  and appear in `RetainedGuestTests`; `device~<id>` editor/print routes are read-only.
  Keep pictures used by remaining guest tests. Do not describe retained work as
  a cloud backup. Print options for read-only tests live in local component state.
- `auth/teachingSubjectsSql.test.ts` runs real app SQL/RLS in PGlite, with only
  Supabase infrastructure stubbed. Account browser contracts are mocked in
  `e2e/teaching-subjects.spec.ts`; no production accounts are modified.
- **Plan preview ("View as Free")**: `subscriptions.preview_free` (+
  `preview_subjects`), written only by `set_plan_preview(free)` (security
  definer, own row). `plan_of` returns Free while it's on (the LAST `plan_of`
  in schema.sql, from `migrations/20261115_plan_preview.sql`, is the real one).
  Off restores the teaching subjects saved when it was switched on.
  `Entitlements.previewOf` = the real plan; Settings → My plan switch,
  `PlanPreviewBar` on /tests. Can only lower a plan. `PLAN_PREVIEW` flag.
  `loadSubscription` retries without the column on old databases (42703).
- **Phase 2 (Georgian first), done**: toolbar writing styles use
  `features/editor/toolbarStyles.ts` (`orderedStyles`, `chosenStyle`): the
  option with id `"georgian"` is shown first and is the default with the
  Georgian interface (English interface: the others first); a saved choice
  always wins. Every styled tab must have a "georgian" option
  (toolbarStyles.test.ts). Widgets get the tab's `style` (CoordinateTool:
  Georgian side buttons ჩ./სამხ./აღმ./დას. and the Georgian insert first;
  CenturyTool: ს. or c. by style). Saved content is never rewritten.
  `e2e/georgian-first.spec.ts`. Dictionary coverage: `en` is
  `Record<MessageKey, string>`, so tsc fails on a missing or extra key.
- **Phase 3 (live paper view), done** — changed on the owner's request
  from a per-question preview to the WHOLE test: "ქაღალდზე ნახვა" in the
  editor's sticky bar (`[data-paper-view-toggle]`) splits the screen
  (≥ 64rem, `SPLIT_QUERY`): editor left, A4 pages right (`PANEL_WIDTH`
  min(48vw, 62rem), sticky under the bar via `--editor-bar`, scrolls on
  its own); narrower windows: the pages cover the editor (fixed). The pages
  are the print page's own `PrintedVariant` (exported; new props `zoom` —
  only the sheets are zoomed, never the measuring copy — and `highlight`),
  variant A, plan footer, subject print class + `LanguageOverride` +
  `TypographyProvider`. `features/editor/preview/`: `PreviewProvider` (TWO
  contexts: control vs. the live test), `LivePreview` (student / key, link to
  /print; redraws 250 ms after the last change + `useDeferredValue`; old
  pages stay while measuring). `FollowFocus` in TestEditor sets the edited
  question from `[data-question-id]` (cards) / `[data-test-header]`; the
  paper outlines it (`.live-preview [data-editing]`, screen only) and
  scrolls ONLY its own panel to it. `SplitView`, `BarRow`, `ToolbarArea`
  keep the same elements open or closed (editors are never re-created); the
  symbol toolbar never covers the paper. Every printed block carries
  `data-print-block={key}`. `e2e/live-preview.spec.ts` compares the paper
  view with the print page for every sample (student + key, page count). Stop for the owner's review between phases.

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
| Guests | Signed out (or Supabase not configured) = guest: `AuthProvider` starts the repository with `localTestsBackend()` (localStorage key `mathtest:tests:v1`) and `setImageUser(null)` (pictures in IndexedDB store `images`). On sign-in: `stopSync()` → cloud → teaching-subject selection → `moveGuestTestsIntoAccount(allowedSubjects)` (lib/onboarding.ts; after subject onboarding): upload pictures, `importTests` (newer local version of an existing id → added as a copy), then after `waitUntilSaved` remove the browser copies. `useAuth().guest`, `useStorageKind()` ("cloud" / "device") |
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
| Upgrade UX | `useUpgrade()("variants" \| "images" \| "footer" \| "header" \| "templates" \| "bank" \| "docx" \| "sharing" …)` opens a small dialog only after a click on a Premium feature; it changes nothing and loses nothing. `PremiumBadge` (gold `--premium-*` tokens). Guests are offered "create a free account" (= 14-day trial) |
| Payments | Only a verified webhook changes a paid plan: `webhook route → provider.verifyWebhook → parseEvent → db.rpc("billing_record_event")` (stored first; a repeated event id = "duplicate"; a wrong amount = "amountMismatch", no plan). The browser sends only the PERIOD; plan and price come from plans.ts on the server (`priceTetri`). Amounts are tetri (integers). Order ids: `mt-c-<uuid>` checkout, `mt-r-<uuid>` renewal. Renewals are charged by OUR cron with the saved card token (`payment_customers.card_token`, never sent to the browser); `billing_start_renewal` re-checks dueness under a row lock, so two jobs can't double-charge. Period ends: `periodEnd()` in `lib/plans/billing.ts` = `billing_period_end` in SQL (schoolYear → end of 30 June, Tbilisi time) — change both together; same for `RENEWAL_RETRY_DAYS` and `billing_mark_failed`. BoG repeats the first order's amount (`canChangeAmount: false`): no monthly ↔ yearly switch there. Payments are "enabled" when a provider is chosen + configured + the secret is set, and (real providers) `ONLINE_PAYMENTS` is true (`paymentsStatus`) |
| Server database access | `lib/server/db.ts` `serverDb()` → `{ user, rpc }`: Supabase with the visitor's cookie and the PUBLIC key (still no service_role), or the sandbox. Functions that change plans are executable by anon/authenticated but refuse without the secret (`require_server_secret`; the database stores only its SHA-256, set once with `select public.set_server_secret('billing', '…')` in the SQL Editor) |
| Sandbox | `MATHTEST_SANDBOX=1` (+ `NEXT_PUBLIC_MATHTEST_SANDBOX=1`; `npm run dev:sandbox`, and the Playwright server): the billing routes use PGlite in the server's memory, loaded with the REAL schema.sql + plans.sql (`lib/server/sandbox.ts`, stubs in `supabaseStubs.ts`), only the mock provider, and trust the sign-in cookie unverified (fine: no real data). PlanProvider then reads the plan from `/api/billing/summary`. Test tools under My plan (`SandboxTools`, `/api/sandbox`): skip days (shifts that account's dates), run the job for that account, refund, reset, list of "sent" emails. Everything is forgotten when the server stops. NEVER on a real site |
| AI generator | The AI never writes our stored data: it answers in a flat "wire format" (`lib/ai/wire.ts`; formulas as `$…$` LaTeX inside strings, chemistry `$\ce{…}$`, equations to balance as plain "2H2 + O2 -> 2H2O"), and `convert.ts` builds questions from it. Repairs: `\(…\)`, `\[…\]`, `$$…$$` → formula; `\tan`/`\cot` → `\operatorname{tg}`/`{ctg}` in Georgian; gap words not in the text are skipped; unbalanced equations left out. A question with a formula MathLive can't draw (`ML__error`, unbalanced braces) is dropped. Count first (`ai_consume`), ask second, `ai_finish(false)` on failure. Nothing about the request or the answer is logged — only counts and error kinds. To add a type: `AI_TYPES`, the schema + `readItems`, a `toQuestion` case, a line in the system prompt, mock samples (the test checks every subject × type × language) |
| Label the diagram | `LabelDiagramQuestion` (`picture`: `{kind:"builtin", drawing}` or `{kind:"upload", imageId, width, height}`). Positions (`x,y` = where the line points, `lx,ly` = the label) are in % of the DRAWING AREA = picture + `SIDE` (0.32 × width) room left/right + `PAD` above/below (`lib/labelDiagram.ts`: `PICTURE_BOX`, `areaAspect`, `placeLabel`, `labelsForParts` → `spreadAlongSide` + `uncross`, `printedBank`, `labelLetters`). Paper and editor share `LabelArea` (`subjects/biology/LabelDiagramView.tsx`): picture, SVG lines (viewBox 1000 wide), labels as HTML (boxes sized in mm; styles in `LabelDiagramView.css`, imported by the component). Browser check of the print positions: `PRINT_TEST_URL=http://localhost:3000 npx vitest run src/subjects/biology/LabelDiagramPrint.browser.test.ts` (skipped in a normal `npm test`). Built-in drawings are `<img src="data:image/svg+xml…">` (`drawingUrl`), no storage used. Uploaded pictures count in `usedImageIds` |
| Samples | `src/samples/`: `build.ts` (helpers `rt`, `m`, `ce`, `mc`, `tf`, `short`, `open`, `matching`, `fillBlank`, `order`; `sampleTest` runs `normalizeTest`; `SAMPLE_PREFIX`, `isSampleId`, `templateTitle`), one file per subject, `index.ts` (`sampleFor`, `getSample`). Content data (like `drawings.ts`), not dictionaries. `useTest` returns samples without the repository (after hydration; it prefers an injected copy so PDFs keep the page's options). `saveTest` / `setTestFolder` ignore sample ids; PrintView keeps a sample's options in local state. `createTestFromTemplate` = "Use as template" |
| Built-in pictures | `lib/images/builtinPictures.ts`: image id `builtin:<name>` (georgia-map, room, triangle-abc, umbrella, clock, key, cup), original SVG, black on white, no words; `getImageUrl` returns a data URL, `usedImageIds` skips them (never uploaded, cleaned up or counted). Georgia outline from lon/lat (`georgiaPoint`, `georgiaPercent`, `GEORGIA_PLACES`) |
| Tips | `QuestionBase.tip`: a note for the teacher shown in the question card (dismissable in own tests), never printed |
| My tests | `lib/myTests.ts` (pure: counts, filter, sort, grades, folders, groups), `features/home/` HomeView, SubjectNav, SubjectSection (FolderBar), FilterBar, CardGrid, SampleCard, TestCard (`TEST_DRAG_TYPE`), `folders.ts` (empty-folder store) |
| Editor scrolling | The page moves only when the cursor is really hidden, by the minimum (`features/editor/keepVisible.ts`: `scrollNeeded`, `reveal`, `revealFocused`). The subject toolbar is an OVERLAY hanging under the sticky bar (`absolute top-full`, solid background; the teacher sets its height — see Toolbar size): opening / closing it or switching tabs never shifts the content. `--editor-top` (bar + toolbar height, set by TestEditor) feeds `scroll-margin-top` on focusable things in the editor — never a page-wide `scroll-padding` (things inside the sticky bar can't move, so focusing them made the page jump up). RichTextInput replaces ProseMirror's scrolling via `handleScrollToSelection`. Toolbar inserts start a new undo step (`closeHistory`) |
| Browser tests | Playwright (`npm run test:e2e`, config `playwright.config.ts`, tests in `e2e/`): builds, serves on :3210, uses the installed Chrome (`channel: "chrome"`), runs as a guest. `e2e/helpers.ts`: `openSampleCopy(page, subject)` (a long editable test), `editor(page)` = the VISIBLE editor (hidden Activity pages stay in the DOM), `boxContent` (text + formula LaTeX + chemistry). Toolbar buttons carry `data-kind` (format / chem / text / math). vitest excludes `e2e/` |
| Toolbar (Word-like) | `SubjectToolbar`: top row = Σ Formula / chemistry button, B I U ▭ (`FORMAT_BUTTONS`, every subject — toolkits no longer list them), symbol search, "typing shortcuts" help; then tabs and the panel (tab / search results / shortcuts). There is NO "recently used" row any more (removed on the owner's request). `features/editor/toolbarSearch.ts` (pure): `allButtons(toolkit)` = shown tabs + `toolkit.searchExtra` (math tabs a subject doesn't show are still FOUND), `searchButtons` (Georgian + English names, `keywords`, LaTeX; Enter inserts the best match). `buttonKey(button)` (`subjects/types.ts`) names a button (`m:` formula, `t:` text, `h:` chemistry, `f:` format, `c:` command) — also `data-key` in the DOM. A button may run a MathLive `command` on the formula being edited (matrix: add / remove row or column; shows `label`, toast when no formula is open). Typing shortcuts are MathLive's inline shortcuts + ours (tg, ctg, arctg, arcctg, lg in `mathlive.ts`); the list teachers see is `MATH_SHORTCUTS` (`toolkit.typingShortcuts`), and `e2e/shortcuts.spec.ts` types each one. `toolbars.test.ts`: every button has ka + en names, draws, inserts drawable LaTeX, and sits in ONE tab per subject (`ALLOWED_TWICE` for deliberate repeats) |
| Visual design ("calm light", Linear-style) | White / soft grey, ONE indigo accent + the subject colours, thin borders, soft glow. Screen-only helpers in globals.css: tokens `--glow`, `--glass`; classes `.bg-grid` (faded grid), `.glass` (frosted: header, hero demo), `.text-gradient` (headline words), `.accent-card` (set `--accent-color`, e.g. `var(--subject-<id>)`: border, top line and glow take that colour on hover — test cards, subject and feature cards), `.hero-in`, `.demo-caret`. The primary button has a top highlight and a glow on hover. `components/PageBackdrop.tsx` puts the same soft light (+ grid on "front" pages: sign-in, pricing) behind the top of a page — first child of a `relative` wrapper. The question card being edited gets a brand border + glow (`focus-within`). Font stays Noto Sans Georgian everywhere (the paper needs it; one family keeps the site fast). Animations 150–320 ms; none are needed to read the page |
| Landing page | `features/landing/LandingView.tsx`: hero (CSS fade `.hero-in`, never JavaScript — the headline is the first big thing a slow phone paints) → `HeroDemo` + tilted paper → subject cards (open the sample paper) → features → steps → pricing teaser (numbers from `lib/plans`) → testimonials → call to action. `HeroDemo.tsx`: a pretend editor driven by ONE counter (`tick`, 55 ms): text types, a toolbar button is pressed, the formula and answers appear; scenes math → physics → chemistry. `aria-hidden`; runs only while on screen and the tab is visible; "reduce motion" shows a finished question; the server renders a finished question too. TESTIMONIALS ARE PLACEHOLDERS (`data-landing-testimonials="placeholder"`, texts `landing.testimonial*`): replace them with real reviews, never invent any. Lighthouse (`/about`, production build): desktop 96 / 100 / 100 / 100; simulated slow phone 80 (it was 76 before the redesign) |
| Toolbar size | `features/editor/toolbarSize.ts` (pure): the symbol panel is collapsed (only the top row: formatting, search, expand button), "compact" (2 rows, the default), "expanded" (4 rows) or any height set with the handle under the toolbar (drag by mouse / touch; arrow keys, Page Up / Down, Home / End). Saved in `mathtest:toolbar-size:v1` (all subjects; broken / blocked storage → compact). The CHOSEN height is kept; what is shown is `fitHeight(height, maxHeight(window, above))` (≤ 40 % of the window, ≤ 420 px, 200 px left for the box), recomputed when the window changes. `keepVisible.rememberEditing` = the box that must stay visible while focus is on the toolbar itself |
| Formatting buttons | B / I / U / ▭ show the editor's REAL state (`MathEditingContext` listens to the active TipTap editor's transactions; `aria-pressed` + `.is-active` style). Cursor only: the marks the next typed letter gets (stored marks included). Selection: lit only when ALL selected text has the mark (mixed = not lit; a click then formats everything, the next click removes it). Switched off inside a formula and when no box is active |
| Narrow paper columns | Two-column papers are about 62 mm wide per question. Print pieces that need a different layout there use CSS container queries (`container-type: inline-size` on a wrapper + `@container (max-width: …mm)`): matching lists stacked, timeline running downward, taxonomy with smaller steps, sentence parts one per line, climate answer lines after the words, key answers with a formula on their own row, smaller diagram label boxes. A container rule must come AFTER the base rule it overrides. `RichTextView` shrinks a formula that is wider than its question (≥ 55 %). A block taller than a whole page is drawn smaller (`shrinkToFit`, CSS `zoom`, ≥ 50 %); on page 1 a block that only fits a full-height column moves to page 2 (`paginate`). `e2e/print-layout.spec.ts` checks every sample in 1 / 2 columns, normal / large, student / key / all variants |
| Sharing and co-editing | SQL: `migrations/20261120_sharing.sql`. `test_shares` (owner, test, colleague's EMAIL, role `view` / `edit`; the colleague is whoever signs in with that confirmed email — `my_email()`), `test_links` (64-character token → `test_by_link(token)` for anyone, also signed out), `tests_shared_with_me()`, pictures via `picture_is_shared` / `shared_picture_path`. Sharing needs the OWNER's plan to have `sharing`; when it ends the rows stay but stop working (the owner can still remove them). An editor may only change tests of a subject they teach (`can_edit_test_subject`). No server route: the browser talks to Supabase, RLS decides. App: shared tests live in the repository but APART from `tests` (`SharedTest`, id inside the app = `shared~<owner>~<test id>`; link tests `link~<token>`; `lib/storage/sharedTests.ts` is their cloud side), `lib/sharing/` (`sharing.ts` pure, `sharesStore.ts` = who I shared with, `pictures.ts` = finds a picture in a colleague's folder; registered with `setPictureFinder`), `features/sharing/` (`ShareProvider` + `useShare()` window, `SharedWithMe` on /tests, `useCopyShared` = "make my own copy" incl. pictures, `SharedLinkView` = `/shared/[token]` → the print page, `useCoEditing`, `ConflictDialog`). Pictures an editor adds live in the EDITOR's folder: `keepImages("shared")` protects them from clean-up |
| Versions and conflicts | `tests.version` goes up on every save (trigger `bump_test_version`; it also pins `user_id` and `id`). The cloud backends save with "…where version = the one I know" (`supabaseTests.ts` keeps a `versions` map; a database without the column → saves the old way). Zero rows changed + a newer version = `VersionConflictError` → the repository keeps the write OUT of the queue as a `Conflict` (`getConflicts`, `resolveConflict(id, "mine" \| "theirs")`); the global `ConflictDialog` (in Providers, can't be closed without choosing) asks. While it is open, more typing only updates `mine`. `refreshTest(id)` (when the editor opens, and "load the new version") replaces the copy in memory only when nothing of mine is on its way, and bumps `getRevision(id)` — part of the editor's `key`, so the editor restarts with the new test. This also covers ONE teacher with two tabs or devices |
| Co-editing presence | `useCoEditing(testId)`: Supabase Realtime channel `test:<owner>:<test id>`, joined only for tests that are really shared (mine with ≥ 1 colleague, or a colleague's). Presence = who has it open (badges in the editor bar, `othersPresent`); after each successful save a `saved` broadcast → the others see "changed by … / load the new version". No test content goes through the channel. The channels are public by name (the name contains two unguessable ids); move to private channels (Realtime Authorization) if names must be hidden |
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
  features/landing/     LandingView (hero, subjects, features, steps, pricing teaser, testimonial
                        placeholders), HeroDemo (the animated "test being built")
  lib/onboarding.ts     guestTestCount, moveGuestTestsIntoAccount (guest → account)
  i18n/                 dictionaries.ts (ka + en text), language.ts (useT, useLanguage)
  features/editor/      EditorView → TestEditor (state + autosave), TestHeaderForm,
                        SubjectToolbar (tabs from the toolkit), questions/ (QuestionList with dnd-kit, QuestionCard, one editor per type)
  features/print/       PrintView (controls + sheets), PrintBlocks (header, questions),
                        usePrintLayout (measure → paginate), downloadPdf
  app/api/pdf/route.ts  PDF generation; lib/server/chrome.ts finds/launches Chrome
  lib/paginate.ts       Pure page packing (never splits a question)
  lib/checks.ts         findProblems(test): empty questions, missing answers (print-page warnings)
  samples/              one sample test per subject + build helpers (see Tech decisions)
  subjects/geography/   toolbar + CoordinateTool, GeographyEditors, GeographyPrint (scale, climate)
  lib/geography.ts      scale and climate maths; lib/myTests.ts "My tests" logic
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
  lib/payments/         types (PaymentProvider), mock / flitt / bog adapters, config (which one),
                        service (checkout, events, cron job), http (route helpers), summary
                        (browser types), seller (receipt details — owner fills in)
  lib/email/            templates (ka + en), send (Resend or console; once per key)
  lib/ai/               request (types, limits, checks), wire (AI answer format + schema),
                        convert (→ our questions), prompt, mock, claude (the API call), service
  features/ai/          AiGenerateDialog, AiQuestionPreview
  lib/server/           db.ts (serverDb, billingSecret), sandbox.ts, supabaseStubs.ts
  lib/plans/billing.ts  priceTetri, periodEnd
  features/sharing/     ShareDialog (ShareProvider, useShare), SharedWithMe, SharedLinkView,
                        ConflictDialog, useCoEditing, useCopyShared, useShares
  lib/sharing/          sharing (pure), sharesStore, pictures; lib/storage/sharedTests.ts
  features/bank/, lib/bank/        the question bank (/bank)
  features/templates/, src/templates/   the template library (/templates)
  lib/docx/             Word export (fromTest, omml, shoot, document, zip); app/api/docx
  lib/paperHeader.ts    the custom paper header; features/settings/PaperHeaderSettings
  features/billing/     useBilling, BillingSection, SandboxTools, TestModeBanner,
                        MockCheckoutView, BillingResultViews, ReceiptView
  features/legal/       PrivacyView, LegalViews (terms, refund, DraftNotice)
  e2e/account.ts        a made-up signed-in teacher + sandbox helpers (billing.spec.ts)
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
- **Guests are first-class** (but get ONE trial test, see "Guest trial"; any
  new way to create / copy a test must call `useGuestTrial().request()`):
  anything on /tests, /editor, /print must work
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
- Samples are never in the tests list: a fresh browser starts with 0 tests.
  `profiles.sample_added` is no longer used (kept so old rows stay valid).
- A sample's editor is wrapped in `inert` (still readable, can't be focused);
  things that must disappear there use the `[[inert]_&]:hidden` class.
- Adding a subject: also write its sample (`src/samples/<id>.ts`); the unit
  test fails until it uses every question type of the toolkit.
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
- Never set `scroll-padding-top` on the page for a sticky bar: focusing or
  scrolling-into-view anything INSIDE the bar then scrolls the whole page up.
- Playwright on a Mac: `End` scrolls the page (use `Meta+ArrowDown` for the
  cursor); Playwright's own `click()` scrolls elements into view, so a
  "nothing scrolled" check also catches scroll-padding mistakes.
- The key's answer (`.print-key-answer`) is in the flow and the line grows
  with it; one long formula can't wrap, so write several short ones.
- Math tabs: `mathTab(id)` / `mathTabsExcept(...ids)` (math/toolbar.ts) — a
  subject shows a few math tabs and puts the rest in `searchExtra`; a test
  checks every subject with formulas can still reach every math symbol.
- Content above the fold must not start at `opacity: 0` waiting for Motion
  (`whileInView` / `initial`): it stays invisible until all scripts load
  (7 s on a slow phone). Use a CSS animation there; `Reveal` is for sections
  further down. Full-page screenshots must scroll first, or those sections
  look empty.
- `buttonVariants({ className })` doesn't merge conflicting classes: to
  recolour a button, mark the overrides important (`bg-white! text-…!`).
- MathLive: READING `mf.inlineShortcuts` before the field is mounted throws
  "Mathfield not mounted" too (it crashed every test with a formula): set
  shortcuts in the `mount` event, next to `menuItems`.
- The toolbar's symbol panel has the height the TEACHER chose (see Toolbar
  size) and scrolls inside; tabs, search and the shortcuts list never change
  it. A toolbar that grows by itself covers the box being edited and makes
  the page move. `revealFocused` leaves 12 px of extra room so a formula
  (taller than a text line) doesn't cause a 3 px scroll.
- Browser tests: after a click that focuses a box, wait for `toBeFocused()`
  before typing, or the first letter is lost. If many fail with timeouts, the
  computer is overloaded: `npx playwright test --workers=3`.
- Toolbar command buttons have no LaTeX: compare buttons with `buttonKey`,
  never `latex + display`.
- PGlite is a devDependency: if `node_modules/@electric-sql` is missing, the
  SQL tests fail with "Cannot find package" — run `npm install`.
- Sandbox function calls use named arguments (`name => $1`): argument names
  may contain digits (`card_last4`).
- plpgsql: a function argument and a column with the same name are
  ambiguous inside UPDATE / WHERE — qualify them (`billing_set_period.billing_period`,
  `s.billing_period`).
- Audit stamp: our functions set `changed_by`, `changed_reason` and
  `changed_at = null`; the trigger treats an untouched `changed_at` as
  "system". (Comparing clock values failed: two writes can share a timestamp.)
- Email text lives in `lib/email/templates.ts`, not the dictionaries
  (server-only; a deliberate exception to the dictionary rule).
- `.env.example` lists every server setting with an EMPTY value;
  envSafety.test.ts fails on a filled-in one, and on anything but the two
  public values in `.env`.
- Flitt's documentation prints a signature hash that is NOT the SHA-1 of its
  own example string; our test checks the documented STRING. Confirm with a
  test-merchant payment before going live.
- The mocked account can open /settings only because proxy.ts accepts the
  unverified cookie in sandbox mode; `page.getByRole("group")` also matches
  the header's language switch — scope it to `main`.
- Billing browser tests share one sandbox database: each test signs in as a
  random account, and the sandbox "run job" works on that account only.
- vitest hides `console.log` from test files here: to inspect a value, write
  it to a file in the scratch folder.
- The AI dialog keeps its suggestions when closed by accident; "Back"
  starts over. Browser tests click `[data-ai-back]` before generating again.
- In browser tests "Use as template" does nothing until the account's
  teaching subjects have loaded: retry the click (`toPass`), see e2e/ai.spec.ts.
- Claude Opus 5.5 rejects forced tool use and a thinking budget: JSON comes
  from `output_config.format` (json_schema), depth from `output_config.effort`.
- SQL in schema.sql can be tried locally in Docker (postgres image) with
  small stand-ins for `auth.users`, `auth.uid()` and `storage.objects`.

- Sharing: the app-side id of a colleague's test is `shared~<owner>~<id>`
  and the REAL id goes back into `data` when saving (`sharedTests.ts`). The
  PDF server is handed the test under the app-side id, so `useTest` first
  looks for a handed-over copy for `shared~` / `link~` ids.
- `toUpperCase()` turns Georgian letters into Mtavruli (ნ → Ნ): capitalise
  only Latin letters (see `initials`).
- A `type="email"` input inside a `<form>` shows the BROWSER's own (English)
  bubble on a wrong address: add `noValidate` and show our message.
- Browser tests with several teachers: `newCloud()` + `signIn(page, { cloud })`
  in separate browser contexts (e2e/account.ts). It imitates tests with
  versions, shares, links and the Realtime rooms (`page.routeWebSocket`;
  client broadcasts arrive as BINARY frames, everything else as JSON
  arrays). Without a cloud, `signIn` refuses the Realtime connection, so no
  test ever reaches the real project.
- `DialogContent closeLabel={null}` = a window without × (needs an answer).
- The repository's `revisions` are never reset (tests compare before / after).

## Commands

```bash
npm run dev     # start the dev server at http://localhost:3000
npm test        # run unit tests once (npm run test:watch to keep watching)
npm run lint    # check code style and common mistakes
npm run build   # production build (also type-checks)
npm run test:e2e   # browser tests (Playwright): builds the app, then clicks through it in Chrome
npm run plans:sql  # regenerate supabase/plans.sql after changing lib/plans/plans.ts
npm run dev:sandbox  # dev server with the pretend billing database + mock payments (test mode)
```

## History

The previous project in this repo (DevPath) is preserved at git tag
`devpath-phase1`.
