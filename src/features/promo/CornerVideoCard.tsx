"use client";

import { Play, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/language";
import { PROMO_DELAY_MS, PROMO_VISIBLE_SECONDS, cardShownThisVisit, rememberCardShown } from "./promoVideo";

/**
 * A small card in the bottom corner that invites to watch a video: the promo (landing page, My tests:
 * PromoVideoCard) and a subject's guide video (the editor: GuideVideoCard). It slides in ONCE per
 * visit (`seenKey` in sessionStorage, see promoVideo.ts) and leaves by itself after 10 seconds (the
 * countdown waits while the mouse or keyboard focus is on it). × closes it at once; a click calls
 * `onWatch` (which opens the video window). Never a blocking popup.
 *
 * Drawn into <body> (a portal): a page wrapper with a transform (PageTransition) would otherwise move
 * a `fixed` card. Every card keeps the `data-promo-*` attributes (browser tests; the promo recording
 * hides `[data-promo-card]`), `data-video-card` tells them apart.
 */
export function CornerVideoCard({
  id,
  seenKey,
  label,
  title,
  text,
  length,
  poster,
  onWatch,
}: {
  id: string;
  seenKey: string;
  label: string;
  title: string;
  text: string;
  /** Shown on the picture, e.g. "4 წთ". */
  length: string;
  poster: string;
  onWatch: () => void;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  /**
   * Tenths of a second the card has been on screen (only counted while not paused).
   * Whole numbers on purpose: adding 0.1 a hundred times gives 9.9999…, never 10.
   */
  const [ticks, setTicks] = useState(0);
  /** The portal needs <body>: browser only (the server, and hydration, render nothing). */
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);

  // Once per visit: after a moment, unless it already came up in this tab.
  // Counted when it really appears, so leaving the page within the first moment doesn't use it up.
  useEffect(() => {
    if (cardShownThisVisit(seenKey)) return;
    const timer = window.setTimeout(() => {
      if (cardShownThisVisit(seenKey)) return;
      rememberCardShown(seenKey);
      setTicks(0);
      setPaused(false);
      setVisible(true);
    }, PROMO_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setVisible(false);
    };
  }, [seenKey]);

  // The countdown: ticks only while the card is up and not being looked at. When it runs out, the card goes.
  const timeUp = ticks >= PROMO_VISIBLE_SECONDS * 10;
  const shown = visible && !timeUp;
  useEffect(() => {
    if (!shown || paused) return;
    const timer = window.setInterval(() => setTicks((n) => n + 1), 100);
    return () => window.clearInterval(timer);
  }, [shown, paused]);

  const left = Math.max(0, 1 - ticks / (PROMO_VISIBLE_SECONDS * 10));
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {shown && (
        <motion.aside
          aria-label={label}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
          }}
          className="fixed right-4 bottom-4 z-40 w-[18.5rem] overflow-hidden rounded-2xl border bg-card shadow-xl max-sm:left-4 max-sm:w-auto print:hidden"
          data-promo-card=""
          data-video-card={id}
        >
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onWatch();
            }}
            className="group flex w-full flex-col text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset max-sm:flex-row max-sm:items-center"
            data-promo-watch=""
          >
            {/* Phones: a small picture on the left, so the card doesn't cover the page. */}
            <span className="relative block aspect-video overflow-hidden bg-muted max-sm:w-28 max-sm:shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- a small static poster, no optimisation needed */}
              <img src={poster} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 grid place-items-center bg-black/15">
                <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-110 max-sm:size-9">
                  <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
                </span>
              </span>
              <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums max-sm:hidden">
                {length}
              </span>
            </span>
            <span className="block px-4 pt-3 pb-3.5 max-sm:py-2.5 max-sm:pr-11 max-sm:pl-3">
              <span className="block font-semibold text-foreground">{title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label={t("promo.close")}
            className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-10"
            data-promo-close=""
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          {/* Time left before it goes away by itself. */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-muted">
            <span data-promo-time-left="" className="block h-full origin-left bg-primary/70 transition-transform duration-100 ease-linear" style={{ transform: `scaleX(${left})` }} />
          </span>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const noSubscription = () => () => undefined;
