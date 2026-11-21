"use client";

import { CirclePlay } from "lucide-react";
import { useState } from "react";
import { useT } from "@/i18n/language";
import { TutorialDialog } from "./TutorialDialog";

/**
 * "▶ How to use it?" on a question card: opens a window with a short, narrated
 * video of this question type being made. It never opens by itself.
 */
export function TutorialButton({ name, typeLabel }: { name: string; typeLabel: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-brand transition-colors hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:h-11 [[inert]_&]:hidden"
        data-tutorial-open={name}
      >
        <CirclePlay className="size-4" aria-hidden="true" />
        {t("tutorial.open")}
      </button>
      <TutorialDialog name={name} title={t("tutorial.title", { type: typeLabel })} open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * The subject's guide video (all its question types, with chapters), from the
 * editor's top bar or the "add a question" panel. `look` = how the button looks there.
 */
export function GuideButton({ name, look }: { name: string; look: "bar" | "panel" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      {look === "bar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border whitespace-nowrap border-primary-soft-border bg-primary-soft/60 px-2.5 text-sm font-medium text-brand transition-colors hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:h-10"
          data-guide-open={name}
          title={t("guide.title")}
        >
          <CirclePlay className="size-4" aria-hidden="true" />
          {/* The bar is crowded on tablets and in the split view: the word only on wide screens. */}
          <span className="max-lg:sr-only group-data-[split=true]:sr-only">{t("guide.short")}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium transition-colors hover:bg-accent"
          data-guide-open={name}
        >
          <span className="rounded-lg bg-primary-soft p-1.5 text-brand">
            <CirclePlay className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">{t("guide.open")}</span>
            <span className="block text-sm font-normal text-muted-foreground">{t("guide.hint")}</span>
          </span>
        </button>
      )}
      <TutorialDialog name={name} title={t("guide.title")} open={open} onOpenChange={setOpen} />
    </>
  );
}
