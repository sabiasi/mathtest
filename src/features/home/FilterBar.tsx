"use client";

import { Search } from "lucide-react";
import { inputClasses } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { SORT_KEYS, type SortKey } from "@/lib/myTests";
import { cn } from "@/lib/utils";

/** Search by title, filter by grade, sort. */
export function FilterBar({
  search,
  onSearch,
  grades,
  grade,
  onGrade,
  sort,
  onSort,
}: {
  search: string;
  onSearch: (value: string) => void;
  grades: string[];
  grade: string;
  onGrade: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2" data-filter-bar="">
      <label className="relative min-w-52 flex-1">
        <span className="sr-only">{t("home.search")}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input type="search" className={cn(inputClasses, "pl-9")} placeholder={t("home.search")} value={search} onChange={(e) => onSearch(e.target.value)} data-search="" />
      </label>
      {grades.length > 1 && (
        <select className={cn(inputClasses, "w-auto")} value={grade} aria-label={t("home.grade")} onChange={(e) => onGrade(e.target.value)} data-grade-filter="">
          <option value="">{t("home.allGrades")}</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}
      <select className={cn(inputClasses, "w-auto")} value={sort} aria-label={t("home.sort")} onChange={(e) => onSort(e.target.value as SortKey)} data-sort="">
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(`home.sort.${key}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
