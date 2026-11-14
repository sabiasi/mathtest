/**
 * How tall the toolbar's symbol panel is (pure — no React).
 *
 * The teacher chooses: collapsed (no symbols, only the top row), "compact"
 * (two rows of buttons — the default), "expanded" (four rows), or any height
 * in between by dragging the handle under the toolbar. The choice is
 * remembered in this browser, for every subject.
 *
 * The CHOSEN height is kept as it is; what is shown is that height fitted to
 * the window (`fitHeight`), so a small window never loses the box being
 * edited and a bigger window gets the chosen height back.
 */

/** One row of symbol buttons with its gap (px); touch screens have slightly bigger buttons. */
export const ROW = 44;

/** The smallest panel: one row of buttons. */
export const MIN_HEIGHT = 48;
/** "Compact": two rows. */
export const COMPACT_HEIGHT = 2 * ROW + 4;
/** "Expanded": four rows. */
export const EXPANDED_HEIGHT = 4 * ROW + 4;
/** Never taller than this, however big the window is. */
const HARD_MAX = 420;
/** …and never more than this share of the window's height. */
const MAX_SHARE = 0.4;
/** Room (px) that must stay free under the toolbar for the box being edited. */
const ROOM_BELOW = 200;

/** One press of an arrow key on the resize handle (px); Page Up / Down move a whole row. */
export const KEY_STEP = 16;

export type ToolbarSize = { height: number; collapsed: boolean };
export const DEFAULT_SIZE: ToolbarSize = { height: COMPACT_HEIGHT, collapsed: false };

const STORAGE_KEY = "mathtest:toolbar-size:v1";

/**
 * The tallest the panel may be in this window. `above` = everything over the
 * panel plus the toolbar's own rows (px): the editor's bar, the buttons row,
 * the tabs, the handle.
 */
export function maxHeight(windowHeight: number, above: number): number {
  const room = Math.floor(windowHeight - above - ROOM_BELOW);
  return Math.max(MIN_HEIGHT, Math.min(HARD_MAX, room, Math.floor(windowHeight * MAX_SHARE)));
}

/** The chosen height, fitted between the smallest and the tallest allowed. */
export function fitHeight(height: number, max: number): number {
  if (!Number.isFinite(height)) return Math.min(COMPACT_HEIGHT, max);
  return Math.round(Math.max(MIN_HEIGHT, Math.min(max, height)));
}

/** Which ready-made size a height is (for the two size buttons), if any. */
export function presetOf(height: number): "compact" | "expanded" | null {
  if (Math.abs(height - COMPACT_HEIGHT) < 1) return "compact";
  if (Math.abs(height - EXPANDED_HEIGHT) < 1) return "expanded";
  return null;
}

/** Anything read from storage → a valid size (the default when it is missing or broken). */
export function parseSize(raw: unknown): ToolbarSize {
  if (typeof raw !== "object" || raw === null) return DEFAULT_SIZE;
  const { height, collapsed } = raw as Record<string, unknown>;
  return {
    height: typeof height === "number" && Number.isFinite(height) ? Math.max(MIN_HEIGHT, Math.min(HARD_MAX, Math.round(height))) : DEFAULT_SIZE.height,
    collapsed: collapsed === true,
  };
}

export function readSize(): ToolbarSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseSize(JSON.parse(saved)) : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE; // storage blocked or broken data: the default size
  }
}

export function writeSize(size: ToolbarSize) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
  } catch {
    // storage blocked: remembered until the page is closed
  }
}
