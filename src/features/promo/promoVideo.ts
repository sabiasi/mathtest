/**
 * The promo video ("How Rapido works", about 2 minutes) and the timing of its small
 * card in the corner of the landing page (PromoVideoCard.tsx).
 *
 * The video itself is made in video/ (`npm run render:promo`), which also writes
 * the web copy and its poster picture into public/promo/.
 */

export const PROMO_VIDEO_SRC = "/promo/rapido-promo.mp4";
export const PROMO_POSTER_SRC = "/promo/rapido-promo.jpg";

/** How long a corner card stays in the corner (seconds; paused while the mouse is on it). */
export const PROMO_VISIBLE_SECONDS = 10;
/** A corner card waits this long after the page opens, so the page itself is seen first. */
export const PROMO_DELAY_MS = 1500;

/**
 * A corner card (CornerVideoCard) comes up ONCE per visit (= per browser tab: sessionStorage forgets it
 * when the tab closes). Moving between pages or reloading doesn't bring it back; a new visit does. The
 * video buttons (PromoVideoButton, the editor's guide button) open the video at any time.
 */
export const promoCardShownKey = "mathtest:promo-card-shown";
/** Set by the video recorders (tutorials/recorder.ts): no corner card in a recording. */
export const VIDEO_CARDS_OFF_KEY = "mathtest:video-cards-off";

export function cardShownThisVisit(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1" || window.sessionStorage.getItem(VIDEO_CARDS_OFF_KEY) === "1";
  } catch {
    return false; // storage blocked: show it (nothing to remember with)
  }
}

export function rememberCardShown(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // storage blocked: nothing to do
  }
}

export const promoCardShownThisVisit = () => cardShownThisVisit(promoCardShownKey);
export const rememberPromoCardShown = () => rememberCardShown(promoCardShownKey);
