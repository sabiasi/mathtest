# Promo video: "How Rapido works" (storyboard, as built)

Status: **built** (2026-11-22). **The owner's own Georgian voice** (script: [promo-voiceover.ka.md](promo-voiceover.ka.md),
added 2026-11-22, see README → Voice), no captions yet. 4:07, 1920×1080, 30 fps, H.264.

- Master: `output/rapido-promo.mp4` (not committed)
- Website copy: `public/promo/rapido-promo.mp4` (≈ 14 MB) + poster `public/promo/rapido-promo.jpg`,
  played by the corner card on the landing page (`src/features/promo/`)

How to re-make it: [README.md](README.md#promo-video). Scenes: `capture/promo-scenes.mjs`.

## The made-up teacher

The video shows a signed-in teacher with a placeholder name, **სახელი გვარი**
(saxeli.gvari@gmail.com; the owner asked for a neutral name, not a specific person). `capture/account.mjs` answers everything the page asks Supabase inside the recording
browser, so no real account is used and nothing reaches the real project. "Continue with
Google" leads to a plain "choose an account" card made by us (not Google's page).
The site's own promo card (it shows on every visit) is hidden in the recording with CSS (`noPromoCard`).

## Scenes

Every scene opens with a 2.5 s title card ("N / 10" in the subject's colour + the title).
Calm pace (the owner asked for a normal tempo, room for a voice): the cursor rests ~0.8 s on each
button before clicking, typing is shown at real speed, holds are 1.8× longer (`PACE` in
`capture/promo-scenes.mjs`). Footage plays at 1.1× (`PROMO_SPEED`); page loads are cut out.

| # | id | Title card | What happens |
|---|---|---|---|
| — | intro | Rapido · ტესტები ყველა საგანში — წუთებში | logo, the 8 subject chips |
| 1 | signup | რეგისტრაცია — ერთი დაწკაპუნებით | landing → „რეგისტრაცია“ → „Google-ით გაგრძელება“ → choose the account → signed in |
| 2 | subjects | აირჩიეთ თქვენი საგანი | "Which subject do you teach?" → მათემატიკა → შენახვა |
| 3 | mytests | ჩემი ტესტები — თქვენი სამუშაო მაგიდა | subject sidebar (highlighted), მათემატიკა, folders I / II სემესტრი, „ახალი ტესტი“ |
| 4 | math | მათემატიკა — ფორმულები ღილაკებით | new test → multiple choice → „ფორმულა“ → fraction → x/2 + 3 = 7 → a look through the symbol tabs → answers, correct one marked |
| 5 | geometry | გეომეტრიული ფიგურები | figure window: circle, trapezoid, hexagon, right triangle with 5 სმ / 12 სმ / x → in the question |
| 6 | physics | ფიზიკა — წრედები და ძალების ნახაზი | circuit: resistor R₁ + lamp; force diagram: incline + friction |
| 7 | chemistry | ქიმია — ფორმულები და მენდელეევის ცხრილი | „ქიმიური ფორმულა“, periodic table → Na, then "+ Cl2 -> 2NaCl" → 2Na + Cl₂ ⟶ 2NaCl |
| 8 | english | ინგლისური — კროსვორდი წამებში | crossword: 4 words + clues, „ახალი განლაგება“ twice |
| 9 | paper | წერთ — და მაშინვე ხედავთ ფურცელზე | „ქაღალდზე ნახვა“: typing and a √49 appear on the A4 page at once |
| 10 | print | ბეჭდვა, PDF და ვარიანტები | 3 variants → variant II → its answer key → "all" (answer table) → Download PDF |
| — | outro | Rapido · ✓ 5 points · „დაიწყეთ უფასოდ“ | |

Room for a voice: each title card is 2.5 s with nothing but the title, and each result holds 1–2 s.
