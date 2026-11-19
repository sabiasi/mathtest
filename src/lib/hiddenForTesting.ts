/**
 * HIDDEN FOR TESTING — features switched off while the first teachers try the site.
 *
 * Nothing is deleted: the code is all still there. `true` = hidden.
 * To bring a feature back, change its `true` to `false` (or remove the whole file's
 * effect by setting everything to false). Search the project for "HIDDEN_FOR_TESTING"
 * to see every place that reads these switches.
 */
export const HIDDEN_FOR_TESTING = {
  /** "AI-ით შექმნა" — the AI question generator in the editor. */
  aiGenerator: true,
  /** The personal question bank (/bank, "Save to my bank", "Insert from bank"). */
  questionBank: true,
  /** Share a test with colleagues (Share button, "Shared with me", links). */
  sharing: true,
  /**
   * Everything about Premium / School: everyone is on the Free plan, the pricing page,
   * plan badges, upgrade windows, Settings → My plan / My school / paper header,
   * Word export and the landing page's prices are hidden.
   */
  premium: true,
} as const;
