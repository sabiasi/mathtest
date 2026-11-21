# Tutorial videos (with a Georgian voice)

The "▶ How to use it?" and "▶ Video" buttons in the editor play short videos
recorded from the real app by `npm run tutorials`. The scripts live in
`tutorials/*.spec.ts`; each caption has a sentence that is spoken.

Videos are recorded in Georgian only for now (`TUTORIAL_LANGUAGES` in
`src/features/tutorials/tutorials.ts`); the English interface plays them too.
Add `"en"` there to record English versions (the scripts already have the texts).

The voice is Microsoft Azure's neural text-to-speech: Georgian **Eka**
(`ka-GE-EkaNeural`) and an English voice for the English videos. Azure is only
used on the computer that records the videos — never by the website.

## Quick start (no account): edge-tts

The same Eka voice through `edge-tts`, the free "Read Aloud" service of the
Edge browser. No account, no key — two commands once:

```bash
python3 -m venv tutorials/.venv && tutorials/.venv/bin/pip install edge-tts
npm run tutorials
```

It is NOT Microsoft's official service for apps (it may change or stop). Before
the site goes live, make the voice once with the official Azure service below:
the code uses Azure automatically as soon as the key is in `.env.local`.

## One-time setup (official: Azure)

1. **Azure account**: <https://azure.microsoft.com/free> (a card is asked for
   identity; the free Speech tier costs nothing).
2. **Speech resource**: in <https://portal.azure.com> → *Create a resource* →
   search **Speech** → *Speech service* → *Create*.
   - Resource group: new, e.g. `mathtest`
   - Region: e.g. **West Europe**
   - Pricing tier: **Free F0**
3. When it's created: open it → **Keys and Endpoint**. Copy **KEY 1** and the
   **Location/Region** (e.g. `westeurope`).
4. Put them in `.env.local` (never committed):

   ```bash
   AZURE_SPEECH_KEY=paste-key-1-here
   AZURE_SPEECH_REGION=westeurope
   ```

5. A full ffmpeg (Playwright's own can't add sound) is the `ffmpeg-static` dev
   package (already in package.json). If `npm install` skipped its download:
   `npm install-scripts approve ffmpeg-static`, then `npm install` again.

## Recording

```bash
npm run tutorials                                   # every video, both languages
npx playwright test -c playwright.tutorials.config.ts -g "multiple choice \(ka\)"   # just one
```

- Each sentence is made once and kept in `tutorials/.voice-cache/`, so
  recording again is free and sounds the same. Change a sentence → only that
  one is made again.
- The next caption waits until the previous sentence has ended, so the voice
  always matches what happens on screen.
- The sound is evened out (-16 LUFS, like most online videos) and stored as
  Opus inside the same `.webm` file.

## Settings (optional, in `.env.local`)

| Setting | What it does |
| --- | --- |
| `TUTORIAL_VOICE_KA` | another Georgian voice, e.g. `ka-GE-GiorgiNeural` (male) |
| `TUTORIAL_VOICE_EN` | another English voice (default `en-US-AvaNeural`) |
| `TUTORIAL_VOICE_RATE` | speed, default `-5%` (a little calmer than normal) |
| `TUTORIAL_VOICE=none` | silent videos |
| `TUTORIAL_VOICE=say` | the Mac's own English voice — only to check timing |

## When something goes wrong

- `401`: wrong key, or the region doesn't match the key's resource.
- `Adding the voice needs a full ffmpeg`: run `npm i -D ffmpeg-static`.
- A failed recording leaves the old video as it was.
