"use client";

import { useState } from "react";
import { CornerVideoCard } from "@/features/promo/CornerVideoCard";
import { useLanguage, useT } from "@/i18n/language";
import { TutorialDialog } from "./TutorialDialog";
import { guideCardShownKey, tutorialPosterSrc } from "./tutorials";

/**
 * The subject's guide video as a card in the editor's bottom corner (toolkit `guideCard`), ONCE per
 * visit, like the promo card on the landing page. A click opens the same window as the "▶ Video" button.
 */
export function GuideVideoCard({ name }: { name: string }) {
  const t = useT();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <CornerVideoCard
        id={name}
        seenKey={guideCardShownKey(name)}
        label={t("guide.title")}
        title={t("guide.cardTitle")}
        text={t("guide.cardText")}
        length={t("guide.cardLength")}
        poster={tutorialPosterSrc(name, language)}
        onWatch={() => setOpen(true)}
      />
      <TutorialDialog name={name} title={t("guide.title")} open={open} onOpenChange={setOpen} />
    </>
  );
}
