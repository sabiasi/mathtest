/**
 * Writing styles of a toolbar tab (units "მ/წმ" or "m/s", coordinates
 * "ჩ. გ." or "N", dates "ძვ. წ." or "BC"): which one shows first, and which
 * one is used before the teacher has chosen one.
 *
 * Georgian first: with the Georgian interface the option with id "georgian"
 * comes first and is the default, so nobody has to press "ქართული" before
 * using Georgian units. With the English interface the other options come
 * first. A choice the teacher saved always wins. (Pure, no React.)
 */
import type { Language } from "@/i18n/dictionaries";

/** The id every toolkit uses for its Georgian writing style. */
export const GEORGIAN_STYLE = "georgian";

/** The options in the order shown: the interface language's style first (otherwise as listed). */
export function orderedStyles<T extends { id: string }>(options: readonly T[], language: Language): T[] {
  const georgian = (o: T) => (o.id === GEORGIAN_STYLE) === (language === "ka");
  return [...options.filter(georgian), ...options.filter((o) => !georgian(o))];
}

/** The style in use: the saved one if it still exists, else the first in `orderedStyles`. */
export function chosenStyle<T extends { id: string }>(options: readonly T[], saved: string | null, language: Language): T | undefined {
  return options.find((o) => o.id === saved) ?? orderedStyles(options, language)[0];
}
