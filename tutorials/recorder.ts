import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Browser, CDPSession, Locator, Page } from "@playwright/test";
import { TUTORIAL_SIZE } from "../src/features/tutorials/tutorials";

/**
 * Records a "how to use it" video of the REAL app (see playwright.tutorials.config.ts).
 *
 * How: Chrome sends a picture of the page every time it changes (the DevTools
 * "screencast"); we keep them with their times and turn them into a 25-frames-
 * a-second WebM video with the ffmpeg that Playwright downloads
 * (`npx playwright install ffmpeg`). Recording starts only once the page is ready,
 * so the video has no loading screen. A drawn mouse pointer and captions are put
 * on the page itself (a screencast shows no real pointer).
 */

export type Language = "ka" | "en";
const FPS = 25;
const { width: WIDTH, height: HEIGHT } = TUTORIAL_SIZE;

/** Playwright's own small ffmpeg (it can read JPEG pictures and write VP9 WebM). */
function findFfmpeg(): string {
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), process.platform === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  const folder = existsSync(cache) ? readdirSync(cache).filter((name) => name.startsWith("ffmpeg")).sort().pop() : undefined;
  const binary = folder && readdirSync(join(cache, folder)).find((name) => name.startsWith("ffmpeg"));
  if (!folder || !binary) throw new Error("No ffmpeg found: run `npx playwright install ffmpeg` once, then try again.");
  return join(cache, folder, binary);
}

/** Everything a tutorial script can do: point, click, type, show captions. */
export class Director {
  private frames: { data: Buffer; time: number }[] = [];
  private cdp: CDPSession | null = null;
  private stoppedAt = 0;

  constructor(readonly page: Page, readonly language: Language) {}

  /** Starts recording (call when the page is ready). */
  async start() {
    await this.installOverlay();
    await this.page.mouse.move(WIDTH / 2, HEIGHT / 2); // the drawn pointer starts here too
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", (frame) => {
      this.frames.push({ data: Buffer.from(frame.data, "base64"), time: frame.metadata.timestamp ?? Date.now() / 1000 });
      void this.cdp?.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => undefined);
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });
  }

  /** Stops recording and writes the video. */
  async finish(file: string) {
    this.stoppedAt = Date.now() / 1000;
    await this.cdp?.send("Page.stopScreencast");
    if (this.frames.length === 0) throw new Error("Nothing was recorded");
    mkdirSync(dirname(file), { recursive: true });
    await encode(this.frames, this.stoppedAt, file);
  }

  /** Waits (lets the viewer read / see what happened). */
  pause(ms: number) {
    return this.page.waitForTimeout(ms);
  }

  /** A caption at the bottom: "2  Write the question". `null` hides it. */
  async caption(step: number | null, text: string | null) {
    await this.page.evaluate(
      ([step, text]) => {
        const box = document.getElementById("tut-caption")!;
        if (text === null) {
          box.dataset.show = "false";
          return;
        }
        box.querySelector("b")!.textContent = step === null ? "✓" : String(step);
        box.querySelector("span")!.textContent = text;
        box.dataset.show = "true";
      },
      [step, text] as const,
    );
    await this.pause(350);
  }

  /** A full-screen title (start and end of the video); fades out with `hideTitle`. */
  async title(heading: string, sub: string) {
    await this.page.evaluate(
      ([heading, sub]) => {
        const card = document.getElementById("tut-title")!;
        card.querySelector("h1")!.textContent = heading;
        card.querySelector("p")!.textContent = sub;
        card.dataset.show = "true";
      },
      [heading, sub] as const,
    );
  }

  async hideTitle() {
    await this.page.evaluate(() => (document.getElementById("tut-title")!.dataset.show = "false"));
    await this.pause(450);
  }

  /** Scrolls gently so that `target` is in the middle of the window. */
  async scrollTo(target: Locator, block: "center" | "start" = "center") {
    await target.evaluate((el, block) => el.scrollIntoView({ behavior: "smooth", block }), block);
    await this.pause(800);
  }

  /** Scrolls gently so that `target`'s top sits `gap` px under `cover` (e.g. the toolbar hanging over the page). */
  async scrollBelow(target: Locator, cover: Locator, gap = 14) {
    const top = (await target.boundingBox())!.y;
    const bottom = (await cover.boundingBox())!.y + (await cover.boundingBox())!.height;
    await this.page.evaluate((by) => window.scrollBy({ top: by, behavior: "smooth" }), top - bottom - gap);
    await this.pause(800);
  }

  /** Moves the pointer to the middle of `target` (or a point inside it, 0–1). */
  async pointAt(target: Locator, at: { x: number; y: number } = { x: 0.5, y: 0.5 }) {
    const box = await target.boundingBox();
    if (!box) throw new Error("Can't point at something that isn't on the screen");
    const x = box.x + box.width * at.x;
    const y = box.y + box.height * at.y;
    const from = await this.page.evaluate(() => ({ x: Number(document.getElementById("tut-cursor")!.dataset.x), y: Number(document.getElementById("tut-cursor")!.dataset.y) }));
    const distance = Math.hypot(x - from.x, y - from.y);
    await this.page.mouse.move(x, y, { steps: Math.max(8, Math.min(40, Math.round(distance / 18))) });
    await this.pause(200);
  }

  /** Points at `target` and clicks it (with a small ring, like a click). */
  async click(target: Locator, at?: { x: number; y: number }) {
    await this.pointAt(target, at);
    await this.page.mouse.down();
    await this.page.mouse.up();
    await this.pause(350);
  }

  /** Types like a person (a little slower than a robot). */
  async type(text: string, delay = 75) {
    await this.page.keyboard.type(text, { delay });
    await this.pause(250);
  }

  async press(key: string) {
    await this.page.keyboard.press(key);
    await this.pause(180);
  }

  /** The pointer, captions and title card (on the page, above everything). */
  private async installOverlay() {
    await this.page.addStyleTag({
      content: `
        #tut-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; width: 26px; height: 26px;
          transform: translate(var(--x, 560px), var(--y, 350px)); filter: drop-shadow(0 2px 3px rgb(0 0 0 / .35)); }
        #tut-cursor .ring { position: absolute; left: -18px; top: -18px; width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid #4f46e5; opacity: 0; transform: scale(.4); }
        #tut-cursor.click .ring { animation: tut-ring .45s ease-out; }
        @keyframes tut-ring { 0% { opacity: .9; transform: scale(.4); } 100% { opacity: 0; transform: scale(1.4); } }
        #tut-caption { position: fixed; left: 0; right: 0; margin-inline: auto; width: fit-content; bottom: 22px; z-index: 2147483646; pointer-events: none; display: flex; align-items: center; gap: 12px;
          max-width: 92%; padding: 12px 22px 12px 12px; border-radius: 999px; background: rgb(17 24 39 / .92); color: white;
          font: 600 21px/1.3 var(--font-sans, sans-serif); box-shadow: 0 10px 30px rgb(0 0 0 / .25);
          transform: translateY(16px); opacity: 0; transition: opacity .3s, transform .3s; }
        #tut-caption[data-show="true"] { opacity: 1; transform: none; }
        #tut-caption b { display: grid; place-items: center; min-width: 34px; height: 34px; border-radius: 50%; background: #4f46e5; font-size: 18px; }
        #tut-title { position: fixed; inset: 0; z-index: 2147483645; display: grid; place-content: center; gap: 10px; text-align: center;
          background: linear-gradient(160deg, #eef2ff, #ffffff 60%); color: #111827; font-family: var(--font-sans, sans-serif);
          opacity: 0; transition: opacity .4s; pointer-events: none; }
        #tut-title[data-show="true"] { opacity: 1; }
        #tut-title h1 { font-size: 40px; font-weight: 700; margin: 0; }
        #tut-title p { font-size: 22px; color: #4b5563; margin: 0; }
      `,
    });
    await this.page.evaluate(() => {
      const cursor = document.createElement("div");
      cursor.id = "tut-cursor";
      cursor.dataset.x = "560";
      cursor.dataset.y = "350";
      // A plain arrow pointer (black with a white edge), the tip at the top-left corner.
      cursor.innerHTML = `<span class="ring"></span><svg width="26" height="26" viewBox="0 0 26 26"><path d="M2 2 L2 21 L7.5 16 L11.5 24.5 L15 23 L11 14.8 L18.5 14.8 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
      const caption = document.createElement("div");
      caption.id = "tut-caption";
      caption.innerHTML = "<b></b><span></span>";
      const title = document.createElement("div");
      title.id = "tut-title";
      title.innerHTML = "<h1></h1><p></p>";
      document.body.append(title, caption, cursor);
      window.addEventListener("mousemove", (event) => {
        cursor.dataset.x = String(event.clientX);
        cursor.dataset.y = String(event.clientY);
        cursor.style.setProperty("--x", `${event.clientX}px`);
        cursor.style.setProperty("--y", `${event.clientY}px`);
      }, true);
      window.addEventListener("mousedown", () => {
        cursor.classList.remove("click");
        void cursor.offsetWidth; // restart the animation
        cursor.classList.add("click");
      }, true);
    });
  }
}

/** Pictures with times → a steady 25 fps WebM (each picture repeated until the next one). */
function encode(frames: { data: Buffer; time: number }[], end: number, file: string): Promise<void> {
  const ffmpeg = spawn(findFfmpeg(), [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0",
    "-vf", `scale=${WIDTH}:${HEIGHT}`, "-pix_fmt", "yuv420p",
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-deadline", "good", "-cpu-used", "2", "-row-mt", "1",
    "-an", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise<void>((resolve, reject) => {
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg stopped with code ${code}`))));
  });
  const start = frames[0].time;
  let next = 0;
  for (let n = 0; start + n / FPS <= end; n++) {
    while (next + 1 < frames.length && frames[next + 1].time <= start + n / FPS) next++;
    ffmpeg.stdin.write(frames[next].data);
  }
  ffmpeg.stdin.end();
  return done;
}

/** A fresh browser window in `language`, light theme, with `localStorage` filled in before the app starts. */
export async function openWindow(browser: Browser, language: Language, storage: Record<string, string>) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2, // drawn at double size, then scaled down: sharp letters
    locale: language === "ka" ? "ka-GE" : "en-US",
    colorScheme: "light",
  });
  await context.addInitScript((storage) => {
    // Only once: a reload must not undo what the video did.
    if (sessionStorage.getItem("tut:ready")) return;
    sessionStorage.setItem("tut:ready", "1");
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
    sessionStorage.setItem("mathtest:guest-banner-hidden", "1"); // the "sign up" banner is not part of the lesson
  }, { "mathtest:language": language, "mathtest:theme": "light", ...storage });
  const page = await context.newPage();
  return { context, page, director: new Director(page, language) };
}
