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

/**
 * OPEN FOR TESTING — rules relaxed while the first teachers try the site.
 *
 * `allSubjectsEditable`: every signed-in teacher may create and edit tests in EVERY
 * subject. Teachers still choose the subject(s) they teach once (that choice is kept
 * and its subjects are shown first), it just doesn't lock the others any more.
 * The database has the same switch: `public.app_switches` ('all_subjects_editable'),
 * see supabase/migrations/20261122_all_subjects_editable.sql. Change BOTH together.
 */
export const OPEN_FOR_TESTING = {
  allSubjectsEditable: true,
} as const;
