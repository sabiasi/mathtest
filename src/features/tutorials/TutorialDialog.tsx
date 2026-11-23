"use client";

import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { chapterIndexAt, formatClock, readChapters, tutorialChaptersSrc, tutorialSrc, type Chapter } from "./tutorials";

/** How far ← / → and the −5 / +5 buttons jump (seconds). */
const SKIP_SECONDS = 5;

/**
 * The window with a "how to use it" video (recorded from the real editor by
 * `npm run tutorials`, with a Georgian / English voice). It starts by itself WITH
 * sound: the teacher's click on ▶ allows that. A browser that still refuses
 * plays it muted (the teacher can switch the sound on). Longer videos come with
 * chapters (a .json next to the video): a list to jump to a part.
 *
 * Our own control bar, ALWAYS visible (the browser's own controls hide while the mouse
 * rests, so teachers didn't find the timeline): play / pause, −5 s / +5 s, a timeline to
 * drag, the time, sound, full screen. Keys anywhere in the window: ← / → jump 5 seconds,
 * Space plays / pauses.
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
  const player = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const current = chapterIndexAt(chapters, time);

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

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === player.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /** Plays with sound; if the browser doesn't allow it, muted. */
  function start(v: HTMLVideoElement) {
    v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => undefined);
    });
  }

  function seek(to: number) {
    const v = video.current;
    if (!v) return;
    const end = Number.isFinite(v.duration) ? v.duration : to;
    v.currentTime = Math.min(Math.max(0, to), end);
    setTime(v.currentTime);
  }

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) void v.play().catch(() => undefined);
    else v.pause();
  }

  function jump(chapter: Chapter) {
    seek(chapter.start);
    void video.current?.play().catch(() => undefined);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void player.current?.requestFullscreen().catch(() => undefined);
  }

  /** ← / → jump 5 seconds, Space plays / pauses — wherever the focus is in the window. */
  function onKeyDown(event: KeyboardEvent) {
    const v = video.current;
    if (!v || failed || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); // also on the timeline, which would otherwise move by a tiny step
      seek(v.currentTime + (event.key === "ArrowRight" ? SKIP_SECONDS : -SKIP_SECONDS));
    } else if (event.key === " " && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault(); // a focused button already clicks itself with Space
      toggle();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFailed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent closeLabel={t("tutorial.close")} className="gap-4 sm:max-w-4xl" data-tutorial-dialog={name} onKeyDown={onKeyDown}>
        <div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t(chapters.length > 0 ? "tutorial.hintChapters" : "tutorial.hint")}</DialogDescription>
        </div>
        {failed ? (
          <p role="alert" className="rounded-xl border bg-muted p-4 text-sm text-soft-foreground">
            {t("tutorial.failed")}
          </p>
        ) : (
          <div ref={player} className={cn("overflow-hidden rounded-xl border bg-muted", fullscreen && "flex flex-col rounded-none border-0 bg-black")}>
            <video
              ref={video}
              key={language}
              src={tutorialSrc(name, language)}
              className={cn("aspect-[3/2] w-full cursor-pointer", fullscreen && "min-h-0 flex-1 aspect-auto")}
              playsInline
              preload="auto"
              onClick={toggle}
              onLoadedData={(event) => start(event.currentTarget)}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onDurationChange={(event) => setDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
              onError={() => setFailed(true)}
              data-tutorial-video=""
            />
            <div className="flex items-center gap-1.5 border-t bg-card px-2 py-1.5 sm:gap-2 sm:px-3" data-tutorial-controls="">
              <ControlButton label={t(playing ? "tutorial.pause" : "tutorial.play")} onClick={toggle} data-tutorial-play="">
                {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
              </ControlButton>
              <ControlButton label={t("tutorial.back")} onClick={() => seek(time - SKIP_SECONDS)} data-tutorial-back="">
                <RotateCcw className="size-4" aria-hidden="true" />
                <span className="text-xs font-semibold tabular-nums">{SKIP_SECONDS}</span>
              </ControlButton>
              <ControlButton label={t("tutorial.forward")} onClick={() => seek(time + SKIP_SECONDS)} data-tutorial-forward="">
                <span className="text-xs font-semibold tabular-nums">{SKIP_SECONDS}</span>
                <RotateCw className="size-4" aria-hidden="true" />
              </ControlButton>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label={t("tutorial.seek")}
                aria-valuetext={`${formatClock(time)} / ${formatClock(duration)}`}
                className="mx-1 h-2 min-w-0 flex-1 cursor-pointer accent-primary"
                data-tutorial-seek=""
              />
              <span className="shrink-0 text-sm text-soft-foreground tabular-nums" data-tutorial-time="">
                {formatClock(time)} / {formatClock(duration)}
              </span>
              <ControlButton
                label={t(muted ? "tutorial.unmute" : "tutorial.mute")}
                onClick={() => {
                  if (video.current) video.current.muted = !video.current.muted;
                }}
              >
                {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
              </ControlButton>
              <ControlButton label={t(fullscreen ? "tutorial.exitFullscreen" : "tutorial.fullscreen")} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
              </ControlButton>
            </div>
          </div>
        )}
        {!failed && <p className="-mt-2 text-xs text-muted-foreground max-sm:hidden">{t("tutorial.keys")}</p>}
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

/** A square button of the control bar, with its name as a tooltip and for screen readers. */
function ControlButton({ label, onClick, children, ...data }: { label: string; onClick: () => void; children: ReactNode } & Record<`data-${string}`, string>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-0.5 rounded-lg px-1.5 text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:h-11 pointer-coarse:min-w-11"
      {...data}
    >
      {children}
    </button>
  );
}
