"use client";

import { SearchX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import type { Test } from "@/lib/storage/types";
import { TestCard } from "./TestCard";

export function NoMatches({ onClear }: { onClear: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center" data-no-matches="">
      <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-medium text-foreground">{t("home.noMatches")}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
        {t("home.clearFilters")}
      </Button>
    </div>
  );
}

/** Test cards in a grid; `folders` turns on dragging and "Move to folder". `first`: shown before the tests (the sample). */
export function CardGrid({ tests, folders, first }: { tests: Test[]; folders?: string[]; first?: ReactNode }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {first && <li>{first}</li>}
      {/* `layout`: when a card is added or removed, the others glide to their new places. */}
      <AnimatePresence initial={false} mode="popLayout">
        {tests.map((test) => (
          <motion.li
            key={test.id}
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <TestCard test={test} folders={folders} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
