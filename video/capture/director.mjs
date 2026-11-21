/**
 * The "director": records one scene of real footage and logs what happens in it.
 *
 * Footage: Chrome's screencast (CDP `Page.startScreencast`) sends a JPEG every time the
 * page repaints. Each frame is saved with the time it arrived. Nothing is drawn on the
 * page itself: the cursor, click ripples, highlight boxes, captions and zoom are logged
 * here (positions in CSS pixels of the viewport, times in seconds from the scene start)
 * and drawn later by Remotion (src/), so they can be restyled without re-recording.
 */
import fs from "node:fs";
import path from "node:path";

export const VIEWPORT = { width: 1440, height: 810 };
export const SCALE = 2; // device pixel ratio: frames are 2880×1620, so zooming in stays sharp

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export class Director {
  constructor(page, framesDir) {
    this.page = page;
    this.framesDir = framesDir;
    this.frames = [];
    this.writes = [];
    this.mouse = { x: VIEWPORT.width * 0.62, y: VIEWPORT.height * 0.55 };
    this.events = { mouse: [], clicks: [], highlights: [], captions: [], camera: [], skips: [], marks: {} };
  }

  now() {
    return (performance.now() - this.t0) / 1000;
  }

  async start() {
    fs.rmSync(this.framesDir, { recursive: true, force: true });
    fs.mkdirSync(this.framesDir, { recursive: true });
    await this.page.mouse.move(this.mouse.x, this.mouse.y);
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
      const t = this.now();
      const file = `f${String(this.frames.length).padStart(5, "0")}.jpg`;
      this.frames.push({ t: Math.max(0, t - 0.03), file });
      this.writes.push(fs.promises.writeFile(path.join(this.framesDir, file), Buffer.from(data, "base64")));
      this.cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    this.t0 = performance.now();
    await this.cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 90,
      maxWidth: VIEWPORT.width * SCALE,
      maxHeight: VIEWPORT.height * SCALE,
      everyNthFrame: 1,
    });
    this.events.mouse.push({ t: 0, ...this.mouse });
    // A tiny scroll nudge forces a first frame even on a still page.
    await this.page.evaluate(() => window.scrollBy(0, 1));
    await this.page.evaluate(() => window.scrollBy(0, -1));
    await sleep(300);
  }

  async stop() {
    this.endCaption();
    await sleep(150);
    await this.cdp.send("Page.stopScreencast");
    await Promise.all(this.writes);
    const duration = this.now();
    if (this.frames.length === 0) throw new Error("No frames were recorded");
    return { duration, frames: this.frames, viewport: VIEWPORT, scale: SCALE, ...this.events };
  }

  /* ---------- low-level ---------- */

  wait(seconds) {
    return sleep(seconds * 1000);
  }

  /** Moves the visible cursor smoothly (and the real mouse, so hover effects happen). */
  async moveTo(x, y, seconds = 0.45) {
    // Clock-based: each step takes as long as Chrome needs, the move still lasts `seconds`.
    const from = { ...this.mouse };
    const start = this.now();
    for (;;) {
      const p = Math.min(1, (this.now() - start) / seconds);
      const at = { x: from.x + (x - from.x) * ease(p), y: from.y + (y - from.y) * ease(p) };
      await this.page.mouse.move(at.x, at.y);
      this.mouse = at;
      this.events.mouse.push({ t: this.now(), ...at });
      if (p >= 1) break;
      await sleep(12);
    }
  }

  /**
   * Scrolls smoothly so the element sits comfortably in view. `top` keeps it below the
   * editor's sticky bar AND the symbol toolbar that hangs under it (~300 px when open).
   */
  async reveal(locator, { top = 300, bottom = 90, place = 0.45 } = {}) {
    await locator.waitFor({ state: "visible", timeout: 30000 });
    const box = await locator.boundingBox();
    if (!box) throw new Error("Element has no box");
    if (box.y >= top && box.y + Math.min(box.height, 300) <= VIEWPORT.height - bottom) return;
    const delta = box.y - VIEWPORT.height * place;
    await this.page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "smooth" }), delta);
    await this.settleScroll();
  }

  async scrollBy(dy) {
    await this.page.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), dy);
    await this.settleScroll();
  }

  async settleScroll() {
    let last = -1;
    for (let i = 0; i < 40; i++) {
      await sleep(80);
      const y = await this.page.evaluate(() => window.scrollY);
      if (y === last) break;
      last = y;
    }
    await sleep(120);
  }

  async box(locator) {
    const b = await locator.boundingBox();
    if (!b) throw new Error("Element has no box");
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }

  /* ---------- what the viewer sees ---------- */

  /** A caption at the bottom; stays until the next caption (or `endCaption`). */
  caption(text) {
    this.endCaption();
    this.events.captions.push({ t0: this.now(), t1: null, text });
  }

  endCaption() {
    const open = this.events.captions.find((c) => c.t1 === null);
    if (open) open.t1 = this.now();
  }

  /** Zoom the camera onto a box (or a locator); `null` = the whole screen. */
  async camera(target, { pad = 48, maxZoom = 1.6 } = {}) {
    const box = target === null ? null : typeof target.boundingBox === "function" ? await this.box(target) : target;
    this.events.camera.push({ t: this.now(), box, pad, maxZoom });
  }

  /** Dims everything except a box for a while (the "look here" moment on a result). */
  spot(box, seconds) {
    const t0 = this.now();
    this.events.highlights.push({ t0, t1: t0 + seconds, box, outline: false });
  }

  /** Remember this moment as the scene's thumbnail for the recap. */
  mark(name = "thumb") {
    this.events.marks[name] = this.now();
  }

  /** Runs something whose waiting the viewer should not see (page loads); it's cut out. */
  async skip(fn) {
    const t0 = this.now();
    await fn();
    await sleep(250);
    this.events.skips.push({ t0, t1: this.now(), rate: 0 });
  }

  /** Runs something the viewer should see, but faster (typing): played `rate` times as fast. */
  async fast(fn, rate = 3) {
    const t0 = this.now();
    await fn();
    this.events.skips.push({ t0, t1: this.now(), rate });
  }

  /** Types quickly-but-visibly: real typing, played back fast-forwarded. */
  async typeFast(text, rate = 3) {
    await this.fast(() => this.page.keyboard.type(text, { delay: 45 }), rate);
  }

  /* ---------- actions ---------- */

  /** Highlight → move the cursor there → click (with a ripple). */
  async click(locator, { reveal = true, dwell = 0.3, after = 0.25, offset } = {}) {
    if (reveal) await this.reveal(locator);
    const b = await this.box(locator);
    const x = b.x + (offset ? offset.x : b.w / 2);
    const y = b.y + (offset ? offset.y : b.h / 2);
    const h = { t0: this.now(), t1: 0, box: b, outline: true };
    this.events.highlights.push(h);
    await this.moveTo(x, y);
    await sleep(dwell * 1000);
    await this.page.mouse.down();
    await this.page.mouse.up();
    this.events.clicks.push({ t: this.now(), x, y });
    h.t1 = this.now() + 0.15;
    await sleep(after * 1000);
  }

  /** Points at something without clicking it (highlight + cursor rests on it). */
  async point(locator, seconds = 1.2) {
    await this.reveal(locator);
    const b = await this.box(locator);
    const h = { t0: this.now(), t1: 0, box: b, outline: true };
    this.events.highlights.push(h);
    await this.moveTo(b.x + b.w / 2, b.y + b.h / 2);
    await sleep(seconds * 1000);
    h.t1 = this.now();
  }

  /** Types at a calm human pace into whatever has focus. */
  async type(text, { delay = 55 } = {}) {
    await this.page.keyboard.type(text, { delay });
  }

  async press(key) {
    await this.page.keyboard.press(key);
    await sleep(120);
  }
}
