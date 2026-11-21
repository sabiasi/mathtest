"use client";

import { Eye, EyeOff, LayoutGrid } from "lucide-react";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useT } from "@/i18n/language";
import type { HomeView } from "@/lib/myTests";
import { cn } from "@/lib/utils";
import type { SubjectId } from "@/subjects/ids";
import { SUBJECTS } from "@/subjects/registry";

/**
 * The subjects on "My tests": a sidebar on wide screens, a row of tabs that
 * scrolls sideways on tablets and phones. Taken from the subject registry,
 * so new subjects appear by themselves. Empty subjects are hidden unless
 * "Show all subjects" is on (or it's the open one).
 */
export function SubjectNav({
  view,
  counts,
  total,
  showAll,
  onShowAll,
  onSelect,
  order,
}: {
  view: HomeView;
  counts: Record<SubjectId, number>;
  total: number;
  showAll: boolean;
  onShowAll: () => void;
  onSelect: (view: HomeView) => void;
  /** Subject order (the teacher's own first). Default: the registry order. */
  order?: readonly SubjectId[];
}) {
  const t = useT();
  const sorted = order ? order.map((id) => SUBJECTS.find((s) => s.id === id)!).filter(Boolean) : SUBJECTS;
  const subjects = sorted.filter((s) => showAll || counts[s.id] > 0 || view === s.id);
  const hidden = SUBJECTS.length - SUBJECTS.filter((s) => counts[s.id] > 0).length;

  const item = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[15px] font-medium transition-colors pointer-coarse:py-2.5",
      "max-lg:border max-lg:bg-card max-lg:pr-3.5",
      active ? "bg-primary-soft text-foreground ring-1 ring-primary-soft-border max-lg:bg-primary-soft" : "text-soft-foreground hover:bg-accent hover:text-foreground",
    );
  const count = (n: number, active: boolean) => (
    <span className={cn("ml-auto rounded-full px-2 text-sm tabular-nums", active ? "bg-card text-brand" : "bg-muted text-muted-foreground")}>{n}</span>
  );

  return (
    <nav aria-label={t("home.subjectsNav")} className="lg:sticky lg:top-20 lg:self-start" data-subject-nav="">
      <p className="mb-2 px-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase max-lg:sr-only">{t("home.subjectsNav")}</p>
      {/* Phones/tablets: one scrolling row; desktop: a column. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        <li>
          <button type="button" className={item(view === "all")} aria-current={view === "all" ? "page" : undefined} onClick={() => onSelect("all")} data-view="all">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-soft-foreground">
              <LayoutGrid className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap">{t("home.allTests")}</span>
            {count(total, view === "all")}
          </button>
        </li>
        {subjects.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={item(view === s.id)}
              aria-current={view === s.id ? "page" : undefined}
              onClick={() => onSelect(s.id)}
              data-view={s.id}
            >
              <SubjectIcon id={s.id} className="p-1.5" iconClassName="size-[18px]" />
              <span className="leading-snug max-lg:whitespace-nowrap">{t(`subject.${s.id}`)}</span>
              {count(counts[s.id], view === s.id)}
            </button>
          </li>
        ))}
        {hidden > 0 && (
          <li>
            <button
              type="button"
              onClick={onShowAll}
              aria-pressed={showAll}
              className="flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium whitespace-nowrap text-brand hover:bg-accent max-lg:border max-lg:border-dashed lg:mt-2"
              data-show-all-subjects=""
            >
              {showAll ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              {t(showAll ? "home.hideEmptySubjects" : "home.showAllSubjects")}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
