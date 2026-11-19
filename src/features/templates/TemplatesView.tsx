"use client";

/**
 * /templates — the template library: ready-made tests per subject and grade.
 * The list is public; a template's questions come from the server, which
 * checks the plan (Free: the first few, Premium: all).
 */
import { Eye, FilePlus2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageBackdrop } from "@/components/PageBackdrop";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inputClasses } from "@/components/ui/form";
import { PremiumBadge } from "@/features/plans/PremiumBadge";
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";
import { usePlan } from "@/features/plans/PlanProvider";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { PaperPreview } from "@/features/print/PaperPreview";
import { useUseAsTemplate } from "@/features/samples/useTemplate";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useT } from "@/i18n/language";
import { PLANS } from "@/lib/plans/plans";
import { normalizeTest } from "@/lib/storage/migrate";
import type { Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { SUBJECT_IDS, type SubjectId } from "@/subjects/ids";
import { TEMPLATES, templateAllowed, type TemplateInfo } from "@/templates/catalog";

/** Asks the server for a template. "premium" = the plan doesn't include it. */
async function loadTemplate(id: string): Promise<Test | "premium" | null> {
  try {
    const response = await fetch(`/api/templates/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 403) return "premium";
    if (!response.ok) return null;
    return normalizeTest(((await response.json()) as { test: unknown }).test);
  } catch {
    return null;
  }
}

export function TemplatesView() {
  const t = useT();
  const upgrade = useUpgrade();
  const makeCopy = useUseAsTemplate();
  const { entitlements } = usePlan();
  const limit = entitlements.limits.templates;
  const [subject, setSubject] = useState<SubjectId | "all">("all");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Test | null>(null);

  // HIDDEN_FOR_TESTING: while Premium is hidden, only the free templates are listed.
  const listed = HIDDEN_FOR_TESTING.premium ? TEMPLATES.filter((template) => templateAllowed(template.id, PLANS.free.limits.templates)) : TEMPLATES;
  const subjects = SUBJECT_IDS.filter((id) => listed.some((template) => template.subject === id));
  const grades = [...new Set(listed.map((template) => template.gradeNumber))].sort((a, b) => a - b);
  const shown = listed.filter((template) => (subject === "all" || template.subject === subject) && (grade === "" || String(template.gradeNumber) === grade));

  async function open(template: TemplateInfo, action: "use" | "preview") {
    if (!templateAllowed(template.id, limit)) return upgrade("templates");
    setBusy(template.id);
    const test = await loadTemplate(template.id);
    setBusy(null);
    if (test === "premium") return upgrade("templates");
    if (!test) return void toast.error(t("templates.failed"));
    if (action === "preview") setPreview(test);
    else await makeCopy(test);
  }

  return (
    <PageTransition className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageBackdrop className="h-72 opacity-60" />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("templates.title")}</h1>
      <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">{t("templates.lead")}</p>
      {limit !== "all" && !HIDDEN_FOR_TESTING.premium && (
        <p className="mt-3 text-sm text-muted-foreground" data-templates-note="">
          {t("templates.freeNote", { count: limit, all: TEMPLATES.length })}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("ai.subject")}>
          {(["all", ...subjects] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={subject === id}
              data-template-subject={id}
              onClick={() => setSubject(id)}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", subject === id ? "border-primary-soft-border bg-primary-soft text-brand" : "text-muted-foreground hover:bg-accent")}
            >
              {id === "all" ? t("templates.all") : t(`subject.${id}`)}
            </button>
          ))}
        </div>
        <select className={cn(inputClasses, "ml-auto w-auto")} value={grade} aria-label={t("templates.grade")} onChange={(e) => setGrade(e.target.value)} data-template-grade="">
          <option value="">{t("templates.allGrades")}</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {t("templates.gradeN", { grade: g })}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{t("templates.none")}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-templates="">
          {shown.map((template) => {
            const allowed = templateAllowed(template.id, limit);
            const free = templateAllowed(template.id, PLANS.free.limits.templates);
            return (
              <li
                key={template.id}
                data-template={template.id}
                data-template-locked={!allowed}
                className="accent-card flex flex-col rounded-2xl border bg-card p-5 shadow-sm"
                style={{ "--accent-color": `var(--subject-${template.subject})` } as React.CSSProperties}
              >
                <div className="flex items-start gap-3">
                  <SubjectIcon id={template.subject} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-snug">{template.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t(`subject.${template.subject}`)} · {template.grade}
                    </p>
                  </div>
                  {HIDDEN_FOR_TESTING.premium ? null : free ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-text">{t("templates.free")}</span> : <PremiumBadge compact />}
                </div>
                <p className="mt-3 flex-1 text-[15px] text-soft-foreground">{template.about}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t("templates.questions", { count: template.questions })}</p>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" disabled={busy !== null} onClick={() => void open(template, "use")} data-template-use="">
                    {allowed ? <FilePlus2 aria-hidden="true" /> : <Lock aria-hidden="true" />}
                    {t("templates.use")}
                  </Button>
                  <Button variant="outline" disabled={busy !== null} onClick={() => void open(template, "preview")} data-template-preview="">
                    <Eye aria-hidden="true" />
                    {t("templates.preview")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={preview !== null} onOpenChange={(next) => !next && setPreview(null)}>
        <DialogContent closeLabel={t("dialog.close")} className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" data-template-dialog="">
          <DialogTitle>{preview?.title ?? t("templates.previewTitle")}</DialogTitle>
          <DialogDescription>{t("templates.previewTitle")}</DialogDescription>
          {preview && (
            <>
              <div className="rounded-xl bg-muted/50 p-3">
                <PaperPreview test={preview} />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const test = preview;
                    setPreview(null);
                    void makeCopy(test);
                  }}
                  data-template-use-previewed=""
                >
                  <FilePlus2 aria-hidden="true" />
                  {t("templates.use")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
