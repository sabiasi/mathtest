# Physics teacher tour (video)

A silent 117-second tour of MathTest's physics tools for teachers:
`output/teacher-tour.mp4` (1920×1080, 30 fps, H.264, no audio).
The plan, the feature list and every caption are in [storyboard.md](storyboard.md).

It is made in two steps:

1. **Capture**: a script uses the real site in Chrome (as a guest, so no account and
   no real data) and records each scene. It saves the frames, plus where the mouse was,
   what was clicked and highlighted, the captions and the camera moves.
2. **Compose**: [Remotion](https://www.remotion.dev) (React → video) puts it together:
   intro, title cards, zoom, dimming, highlight boxes, a big cursor with click ripples,
   captions and the recap grid.

This folder is its own small project (own `package.json`), so the app's packages are
not touched. The app's `tsconfig.json` and `eslint.config.mjs` ignore `video/`.

## Re-make the video after the site changes

```bash
# 1. Build and start the site (from the project root, in its own terminal)
npm run build
GUEST_TRIALS_PER_IP_PER_DAY=100000 npx next start -p 3210
#   (PowerShell: $env:GUEST_TRIALS_PER_IP_PER_DAY="100000"; npx next start -p 3210)
#   Production, not `npm run dev`: the dev server shows a "Compiling" badge.
#   The limit is lifted because every scene is a new guest's free trial test.

# 2. In video/ (first time: npm install)
npm run capture            # all scenes (about 3 minutes)
npm run capture -- circuit # or just the scenes that changed
npm run stills             # check pictures in out/stills/ (one per caption)
npm run render             # → ../output/teacher-tour.mp4 (about 10 minutes)
npm run studio             # optional: preview and scrub in the browser
```

`npm run capture` prints each scene's length. If a scene fails, the script saves
`out/failed-<scene>.png` showing what the page looked like.

## Where to change things

| What | File |
| --- | --- |
| Scene steps, captions, title text, what gets highlighted | `capture/scenes.mjs` |
| How clicks, typing, highlights and the camera are recorded | `capture/director.mjs` |
| Overall speed, intro / title / recap lengths | `src/timeline.ts` (`FOOTAGE_SPEED`, `INTRO`, `TITLE`, `RECAP`) |
| Cursor, ripple, highlight box, dimming, captions | `src/Footage.tsx` |
| Intro, title cards, recap grid | `src/Cards.tsx` |
| Colours and font (taken from the app) | `src/theme.ts` |

After changing `scenes.mjs`, capture that scene again. After changing anything in
`src/`, just render again (no new capture needed).

**Length**: the tour must stay between 60 and 120 seconds. `npx remotion compositions
src/index.ts` prints the length without rendering. If a change makes it too long, raise
`FOOTAGE_SPEED` a little or remove a step.

## Good to know

- Typing is real, but it plays fast-forwarded (`typeFast` in the scenes). Waiting for
  pages to load is cut out (`skip`). All overlays follow the same clock, so they stay
  in sync with the footage.
- `npm run render` has two steps: Remotion renders `out/tour-raw.mp4`, then `npm run finish`
  converts it to standard-range `yuv420p` H.264 (Remotion's own output is full-range
  `yuvj420p`, which some players and upload sites show wrongly).
- Chrome needs `--force-device-scale-factor=2`. Without it the screencast sends
  half-size frames, and zoomed-in text goes blurry.
- The captured frames (`public/capture/`, about 240 MB), `out/` and the rendered
  `output/` are not committed (see `.gitignore`). `src/data/capture.json` is committed,
  so the timing can be read without capturing again.
- Remotion is free for individuals and companies with up to 3 people. A bigger company
  needs a Remotion company licence.
- A voiceover can be added later in any video editor, without re-editing. Every scene
  starts with a title card and holds on each result.

## Promo video

A second video in the same project: **"How Rapido works"** (4:07, calm pace, the owner's Georgian voice,
no captions yet). Plan and scenes: [promo-storyboard.md](promo-storyboard.md).
The landing page shows it in a small corner card (`src/features/promo/` in the app).

It shows a made-up signed-in teacher (`capture/account.mjs`): everything the page asks
Supabase is answered inside the recording browser, so no real account or data is used.

```bash
# 1. Build and start the site (project root). Production, not `npm run dev`.
npm run build
GUEST_TRIALS_PER_IP_PER_DAY=100000 npx next start -p 3210

# 2. In video/
npm run capture:promo              # all 10 scenes (about 4 minutes)
npm run capture:promo -- chemistry # or only some scenes
npm run stills:promo               # check pictures → out/promo-stills/
npm run render:promo               # → ../output/rapido-promo.mp4, then the website copy:
                                   #   ../public/promo/rapido-promo.mp4 + .jpg (npm run web:promo)
```

**Checking changes quickly** (no need to wait for the full render):

- `npm run studio` opens the video in the browser: drag along the timeline and play it. Changes to the
  title cards, intro / outro, speed or highlights show up within seconds. Nothing is rendered.
- `npm run draft:promo` renders a quick, smaller copy (960×540, lower quality, all processor cores) to
  `../output/rapido-promo-draft.mp4`. For checking only: it does NOT update the website copy.
- `npm run render:promo` only for the final version (full quality + the website copy).

| What | File |
| --- | --- |
| Scene steps, title texts, subject colour of a title card | `capture/promo-scenes.mjs` |
| The made-up teacher, the "choose an account" card | `capture/account.mjs` |
| Speed, intro / title / outro lengths | `src/promo/timeline.ts` |
| Intro, title cards, outro | `src/promo/PromoCards.tsx` |

The "My tests" scene uses tests made from the samples; they are kept in `out/promo-seed.json`
(delete it to make them again). The frames go to `public/promo/` (not committed).

### Voice

The owner read [promo-voiceover.ka.md](promo-voiceover.ka.md) in ONE recording, saying each scene's label
("zero intro", "one signup"…) before its words: `voice/promo-recording.ka.m4a`.
[promo-voice.json](promo-voice.json) says where each scene's words are in it (labels, retakes and false
starts are left out). `npm run voice:promo` (`scripts/promo-voice.ts`) cuts them, shortens pauses longer
than 0.7 s, puts each scene's words 0.4 s after its title card (a little earlier, or at most 8 % faster,
only when they don't fit), evens the loudness (−16 LUFS) → `out/promo-voice.wav`. `npm run finish:promo`
adds it to the video (and the website copy keeps it). `render:promo` runs both.

- New recording: replace the file, find the new times (listen, or the speech-to-text in
  `tutorials/.venv`: faster-whisper in English mode hears the labels), fix `promo-voice.json`, then
  `npm run voice:promo && npm run finish:promo` (no new render needed).
- If the scenes change length (new capture, `timeline.ts`), just run `voice:promo` again: the places
  come from the timeline. It stops with an error if a scene's words no longer fit.
- Needs a FULL ffmpeg (Remotion's own lacks the compressor): the app's `ffmpeg-static` or FFMPEG_PATH.
