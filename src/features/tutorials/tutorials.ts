import type { Language } from "@/i18n/dictionaries";

/** Video size (3 : 2): the recording script (tutorials/) uses the same, the window shows it at that shape. */
export const TUTORIAL_SIZE = { width: 1200, height: 800 } as const;

/** Where a tutorial video lives (public/tutorials/), in the interface language. */
export function tutorialSrc(name: string, language: Language): string {
  return `/tutorials/${name}.${language}.webm`;
}
