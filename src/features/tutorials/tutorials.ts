import type { Language } from "@/i18n/dictionaries";

/** Video size (3 : 2): the recording script (tutorials/) uses the same, the window shows it at that shape. */
export const TUTORIAL_SIZE = { width: 1200, height: 800 } as const;

/**
 * The languages the videos are recorded in (Georgian only for now). Add "en" here
 * (and record) to give the English interface its own videos; until then it plays
 * the Georgian ones.
 */
export const TUTORIAL_LANGUAGES: readonly Language[] = ["ka"];

/** The recorded language closest to the interface language. */
const recorded = (language: Language): Language => (TUTORIAL_LANGUAGES.includes(language) ? language : TUTORIAL_LANGUAGES[0]);

/** Where a tutorial video lives (public/tutorials/), in the interface language if it was recorded in it. */
export function tutorialSrc(name: string, language: Language): string {
  return `/tutorials/${name}.${recorded(language)}.webm`;
}

/** Its chapters (written by the recorder; only longer videos have them). */
export function tutorialChaptersSrc(name: string, language: Language): string {
  return `/tutorials/${name}.${recorded(language)}.json`;
}

/** The guide's picture for its corner card (GuideVideoCard): a frame of the video, made with ffmpeg. */
export function tutorialPosterSrc(name: string, language: Language): string {
  return `/tutorials/${name}.${recorded(language)}.jpg`;
}

/** Remembers (sessionStorage) that this guide's corner card came up in this visit. */
export const guideCardShownKey = (name: string) => `mathtest:guide-card-shown:${name}`;

/** A part of a longer video: its title and where it starts (seconds). */
export type Chapter = { title: string; start: number };

/** The chapter file's contents → chapters in order (anything broken is left out). */
export function readChapters(data: unknown): Chapter[] {
  const list = data && typeof data === "object" && Array.isArray((data as { chapters?: unknown }).chapters) ? (data as { chapters: unknown[] }).chapters : [];
  return list
    .filter((c): c is Chapter => !!c && typeof (c as Chapter).title === "string" && typeof (c as Chapter).start === "number" && (c as Chapter).start >= 0)
    .map((c) => ({ title: c.title, start: c.start }))
    .sort((a, b) => a.start - b.start);
}

/** Which chapter is playing at `time` (-1 = before the first). */
export function chapterIndexAt(chapters: Chapter[], time: number): number {
  let index = -1;
  chapters.forEach((chapter, i) => {
    if (chapter.start <= time + 0.05) index = i;
  });
  return index;
}

/** 75 → "1:15". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
