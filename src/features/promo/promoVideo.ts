/**
 * The promo video ("How Rapido works", about 2 minutes) and the timing of its small
 * card in the corner of the landing page (PromoVideoCard.tsx).
 *
 * The video itself is made in video/ (`npm run render:promo`), which also writes
 * the web copy and its poster picture into public/promo/.
 */

export const PROMO_VIDEO_SRC = "/promo/rapido-promo.mp4";
export const PROMO_POSTER_SRC = "/promo/rapido-promo.jpg";

/** How long the card stays in the corner (seconds; paused while the mouse is on it). */
export const PROMO_VISIBLE_SECONDS = 10;
/** Waits this long after the page opens, so the page itself is seen first. */
export const PROMO_DELAY_MS = 1500;
