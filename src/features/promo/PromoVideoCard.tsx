"use client";

import { Play, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/language";
import {
  PROMO_DELAY_MS,
  PROMO_POSTER_SRC,
  PROMO_VIDEO_SRC,
  PROMO_VISIBLE_SECONDS,
  promoCardShownThisVisit,
  rememberPromoCardShown,
} from "./promoVideo";

/**
 * A small card in the bottom corner of the landing page and My tests: "See how Rapido works · 4 min".
 * It slides in ONCE per visit (the first of those pages opened in this tab; see promoVideo.ts) and
 * leaves by itself after 10 seconds (the countdown waits while the mouse or keyboard focus is on
 * it). × closes it at once; a click opens the video in a window. Never a blocking popup.
 */
export function PromoVideoCard() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  /**
   * Tenths of a second the card has been on screen (only counted while not paused).
   * Whole numbers on purpose: adding 0.1 a hundred times gives 9.9999…, never 10.
   */
  const [ticks, setTicks] = useState(0);

  // Once per visit: after a moment, unless it already came up in this tab (on this page or the other one).
  // Counted when it really appears, so leaving the page within the first moment doesn't use it up.
  // In the browser only: the server renders nothing, so there is no hydration mismatch.
  useEffect(() => {
    if (promoCardShownThisVisit()) return;
    const timer = window.setTimeout(() => {
      if (promoCardShownThisVisit()) return;
      rememberPromoCardShown();
      setTicks(0);
      setPaused(false);
      setVisible(true);
    }, PROMO_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setVisible(false);
    };
  }, []);

  // The countdown: ticks only while the card is up and not being looked at. When it runs out, the card goes.
  const timeUp = ticks >= PROMO_VISIBLE_SECONDS * 10;
  const shown = visible && !timeUp;
  useEffect(() => {
    if (!shown || paused || open) return;
    const timer = window.setInterval(() => setTicks((n) => n + 1), 100);
    return () => window.clearInterval(timer);
  }, [shown, paused, open]);

  function close() {
    setVisible(false);
  }
  function watch() {
    setVisible(false);
    setOpen(true);
  }

  const left = Math.max(0, 1 - ticks / (PROMO_VISIBLE_SECONDS * 10));

  return (
    <>
      <AnimatePresence>
        {shown && (
          <motion.aside
            aria-label={t("promo.cardLabel")}
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
          >
            <button
              type="button"
              onClick={watch}
              className="group flex w-full flex-col text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset max-sm:flex-row max-sm:items-center"
              data-promo-watch=""
            >
              {/* Phones: a small picture on the left, so the card doesn't cover the page. */}
              <span className="relative block aspect-video overflow-hidden bg-muted max-sm:w-28 max-sm:shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- a small static poster, no optimisation needed */}
                <img src={PROMO_POSTER_SRC} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <span className="absolute inset-0 grid place-items-center bg-black/15">
                  <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-110 max-sm:size-9">
                    <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
                  </span>
                </span>
                <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums max-sm:hidden">
                  {t("promo.length")}
                </span>
              </span>
              <span className="block px-4 pt-3 pb-3.5 max-sm:py-2.5 max-sm:pr-11 max-sm:pl-3">
                <span className="block font-semibold text-foreground">{t("promo.cardTitle")}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{t("promo.cardText")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={close}
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
      </AnimatePresence>
      <PromoVideoDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** The video in a window. It starts by itself (muted if the browser insists). Also used by PromoVideoButton. */
export function PromoVideoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  function start(v: HTMLVideoElement) {
    v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => undefined);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFailed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent closeLabel={t("promo.close")} className="gap-4 sm:max-w-5xl" data-promo-dialog="">
        <div>
          <DialogTitle>{t("promo.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("promo.dialogText")}</DialogDescription>
        </div>
        {failed ? (
          <p role="alert" className="rounded-xl border bg-muted p-4 text-sm text-soft-foreground">
            {t("promo.failed")}
          </p>
        ) : (
          <video
            ref={video}
            src={PROMO_VIDEO_SRC}
            poster={PROMO_POSTER_SRC}
            className="aspect-video w-full rounded-xl border bg-muted"
            playsInline
            controls
            preload="auto"
            onLoadedData={(event) => start(event.currentTarget)}
            onError={() => setFailed(true)}
            data-promo-video=""
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
