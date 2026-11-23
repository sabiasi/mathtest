"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/language";
import { CornerVideoCard } from "./CornerVideoCard";
import { PROMO_POSTER_SRC, PROMO_VIDEO_SRC, promoCardShownKey } from "./promoVideo";

/**
 * The promo card in the bottom corner of the landing page and My tests: "See how Rapido works · 4 min".
 * ONCE per visit (the first of those pages opened in this tab); a click opens the video in a window.
 */
export function PromoVideoCard() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <CornerVideoCard
        id="promo"
        seenKey={promoCardShownKey}
        label={t("promo.cardLabel")}
        title={t("promo.cardTitle")}
        text={t("promo.cardText")}
        length={t("promo.length")}
        poster={PROMO_POSTER_SRC}
        onWatch={() => setOpen(true)}
      />
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
