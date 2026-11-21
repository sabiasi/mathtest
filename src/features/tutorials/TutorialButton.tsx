"use client";

import { CirclePlay } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/i18n/language";
import { tutorialSrc } from "./tutorials";

/**
 * "▶ How to use it?" on a question card: opens a window with a short, silent
 * video of this question type being made (recorded from the real editor by
 * `npm run tutorials`). It never opens by itself.
 */
export function TutorialButton({ name, typeLabel }: { name: string; typeLabel: string }) {
  const t = useT();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-brand transition-colors hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:h-11 [[inert]_&]:hidden"
        data-tutorial-open={name}
      >
        <CirclePlay className="size-4" aria-hidden="true" />
        {t("tutorial.open")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("tutorial.close")} className="gap-4 sm:max-w-4xl" data-tutorial-dialog={name}>
          <div>
            <DialogTitle>{t("tutorial.title", { type: typeLabel })}</DialogTitle>
            <DialogDescription>{t("tutorial.hint")}</DialogDescription>
          </div>
          {failed ? (
            <p role="alert" className="rounded-xl border bg-muted p-4 text-sm text-soft-foreground">
              {t("tutorial.failed")}
            </p>
          ) : (
            // Silent (no sound track): autoplay is allowed when muted.
            <video
              key={language}
              src={tutorialSrc(name, language)}
              className="aspect-[3/2] w-full rounded-xl border bg-muted"
              autoPlay
              muted
              playsInline
              controls
              preload="auto"
              onError={() => setFailed(true)}
              data-tutorial-video=""
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
