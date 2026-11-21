"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { chapterIndexAt, formatClock, readChapters, tutorialChaptersSrc, tutorialSrc, type Chapter } from "./tutorials";

/**
 * The window with a "how to use it" video (recorded from the real editor by
 * `npm run tutorials`, with a Georgian / English voice). It starts by itself WITH
 * sound: the teacher's click on ▶ allows that. A browser that still refuses
 * plays it muted (the teacher can switch the sound on). Longer videos come with
 * chapters (a .json next to the video): a list to jump to a part.
 */
export function TutorialDialog({
  name,
  title,
  open,
  onOpenChange,
}: {
  name: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [current, setCurrent] = useState(-1);

  // The chapter list (only some videos have one; none = just the video).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch(tutorialChaptersSrc(name, language))
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => alive && setChapters(readChapters(data)))
      .catch(() => alive && setChapters([]));
    return () => {
      alive = false;
    };
  }, [open, name, language]);

  /** Plays with sound; if the browser doesn't allow it, muted. */
  function start(v: HTMLVideoElement) {
    v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => undefined);
    });
  }

  function jump(chapter: Chapter) {
    const v = video.current;
    if (!v) return;
    v.currentTime = chapter.start;
    void v.play().catch(() => undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFailed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent closeLabel={t("tutorial.close")} className="gap-4 sm:max-w-4xl" data-tutorial-dialog={name}>
        <div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t(chapters.length > 0 ? "tutorial.hintChapters" : "tutorial.hint")}</DialogDescription>
        </div>
        {failed ? (
          <p role="alert" className="rounded-xl border bg-muted p-4 text-sm text-soft-foreground">
            {t("tutorial.failed")}
          </p>
        ) : (
          <video
            ref={video}
            key={language}
            src={tutorialSrc(name, language)}
            className="aspect-[3/2] w-full rounded-xl border bg-muted"
            playsInline
            controls
            preload="auto"
            onLoadedData={(event) => start(event.currentTarget)}
            onError={() => setFailed(true)}
            onTimeUpdate={(event) => setCurrent(chapterIndexAt(chapters, event.currentTarget.currentTime))}
            data-tutorial-video=""
          />
        )}
        {chapters.length > 0 && !failed && (
          <nav aria-label={t("tutorial.chapters")}>
            <ol className="flex flex-wrap gap-2" data-tutorial-chapters="">
              {chapters.map((chapter, index) => (
                <li key={chapter.start}>
                  <button
                    type="button"
                    onClick={() => jump(chapter)}
                    aria-current={index === current ? "step" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:h-11",
                      index === current && "border-primary-soft-border bg-primary-soft text-brand",
                    )}
                  >
                    <span className="text-xs text-muted-foreground tabular-nums">{formatClock(chapter.start)}</span>
                    {chapter.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </DialogContent>
    </Dialog>
  );
}
