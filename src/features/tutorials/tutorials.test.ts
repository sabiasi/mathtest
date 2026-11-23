import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUBJECTS } from "@/subjects/registry";
import { TUTORIAL_LANGUAGES, chapterIndexAt, formatClock, readChapters, tutorialChaptersSrc, tutorialPosterSrc, tutorialSrc } from "./tutorials";

const file = (src: string) => join(process.cwd(), "public", src);
/** The video has a voice: a WebM file names its sound format ("A_OPUS") in its header. */
const hasVoice = (path: string) => readFileSync(path).subarray(0, 64 * 1024).includes("A_OPUS");

// Every video button must have its video, in every interface language (recorded by
// `npm run tutorials`). A missing file would open an empty window.
describe("tutorial videos", () => {
  const perType = SUBJECTS.flatMap((toolkit) =>
    Object.entries(toolkit.tutorials ?? {}).map(([type, name]) => ({ subject: toolkit.id, type, name: name! })),
  );
  const guides = SUBJECTS.filter((toolkit) => toolkit.guideVideo).map((toolkit) => ({ subject: toolkit.id, name: toolkit.guideVideo! }));

  it("math has the all-types guide (one video for every question type)", () => {
    expect(guides).toContainEqual({ subject: "math", name: "math-all-types" });
    expect(perType.filter((video) => video.subject === "math")).toEqual([]);
  });

  // Per-type videos ("▶ How to use it?" on a card): none at the moment.
  if (perType.length > 0) it.each(perType)("$subject / $type: the video exists in every language and is small", ({ subject, type, name }) => {
    expect(SUBJECTS.find((toolkit) => toolkit.id === subject)!.questionTypes).toContain(type);
    for (const language of TUTORIAL_LANGUAGES) {
      const video = file(tutorialSrc(name, language));
      expect(existsSync(video), video).toBe(true);
      expect(hasVoice(video), `${video} has no voice: npm run tutorials (docs/TUTORIAL_VIDEOS.md)`).toBe(true);
      // Teachers on school internet: a one-type video stays under 2 MB.
      expect(statSync(video).size).toBeLessThan(2 * 1024 * 1024);
    }
  });

  it.each(guides)("$subject guide: video + chapters in every language", ({ name }) => {
    for (const language of TUTORIAL_LANGUAGES) {
      const video = file(tutorialSrc(name, language));
      expect(existsSync(video), video).toBe(true);
      expect(hasVoice(video), `${video} has no voice: npm run tutorials (docs/TUTORIAL_VIDEOS.md)`).toBe(true);
      expect(statSync(video).size).toBeLessThan(6 * 1024 * 1024);
      const chapters = readChapters(JSON.parse(readFileSync(file(tutorialChaptersSrc(name, language)), "utf8")));
      expect(chapters.length).toBeGreaterThanOrEqual(3);
      expect(chapters.every((c) => c.title.trim() !== "")).toBe(true);
    }
  });
});

describe("guide corner cards", () => {
  const withCard = SUBJECTS.filter((toolkit) => toolkit.guideCard);

  it("history invites to its guide from the editor's corner", () => {
    expect(withCard.map((toolkit) => toolkit.id)).toContain("history");
  });

  it.each(withCard.map((toolkit) => ({ subject: toolkit.id, name: toolkit.guideVideo })))("$subject: has a guide video and its picture", ({ name }) => {
    expect(name).toBeTruthy();
    for (const language of TUTORIAL_LANGUAGES) {
      const poster = file(tutorialPosterSrc(name!, language));
      expect(existsSync(poster), poster).toBe(true);
      expect(statSync(poster).size).toBeLessThan(200 * 1024);
    }
  });
});

describe("video language", () => {
  it("the English interface plays the Georgian video until English ones are recorded", () => {
    expect(TUTORIAL_LANGUAGES).toEqual(["ka"]);
    expect(tutorialSrc("math-all-types", "en")).toBe("/tutorials/math-all-types.ka.webm");
    expect(tutorialChaptersSrc("math-all-types", "en")).toBe("/tutorials/math-all-types.ka.json");
  });
});

describe("chapters", () => {
  const chapters = [
    { title: "A", start: 2 },
    { title: "B", start: 20 },
  ];

  it("reads only good chapters, in order", () => {
    expect(readChapters({ chapters: [{ title: "B", start: 20 }, { title: "A", start: 2 }, { title: 3, start: 1 }, { title: "C", start: -1 }] })).toEqual(chapters);
    expect(readChapters(null)).toEqual([]);
    expect(readChapters({ chapters: "no" })).toEqual([]);
  });

  it("knows which chapter is playing", () => {
    expect(chapterIndexAt(chapters, 0)).toBe(-1);
    expect(chapterIndexAt(chapters, 2)).toBe(0);
    expect(chapterIndexAt(chapters, 19.9)).toBe(0);
    expect(chapterIndexAt(chapters, 75)).toBe(1);
  });

  it("writes times like a video player", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75.6)).toBe("1:15");
  });
});
