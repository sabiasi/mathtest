"use client";

/**
 * "AI-ით შექმნა": describe what you need → the AI suggests questions →
 * the teacher reads them, removes or replaces some → only then are they
 * added to the test. Nothing is added without the teacher's click.
 *
 * The AI itself is called by our server (/api/ai/generate), which also
 * counts the plan's monthly number in the database.
 */
import { LoaderCircle, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { LANGUAGE_NAMES, type Language } from "@/i18n/dictionaries";
import { useT } from "@/i18n/language";
import { AI_LIMITS, DIFFICULTIES, aiTypesFor, asAiError, type AiError, type AiType, type AiUsage, type Difficulty, type GenerateAnswer } from "@/lib/ai/request";
import type { Question, Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { getToolkit } from "@/subjects/registry";
import { AiQuestionPreview } from "./AiQuestionPreview";

type Form = { topic: string; grade: string; types: AiType[]; count: number; difficulty: Difficulty; language: Language; source: string };
type Result = { questions: Question[]; usageId: number; mock: boolean; leftOut: number };
type Answer = ({ ok: true } & GenerateAnswer) | { ok: false; error: AiError; usage?: AiUsage };

async function ask(body: Record<string, unknown>): Promise<Answer> {
  try {
    const response = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) return { ok: false, error: asAiError(data.error), usage: data.usage as AiUsage | undefined };
    return { ok: true, ...(data as unknown as GenerateAnswer) };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export function AiGenerateDialog({ test, open, onClose, onInsert }: { test: Test; open: boolean; onClose: () => void; onInsert: (questions: Question[]) => void }) {
  const t = useT();
  const upgrade = useUpgrade();
  const toolkit = getToolkit(test.subjectId);
  const offered = aiTypesFor(toolkit.questionTypes);
  const paperLanguage: Language = toolkit.print.language === "en" ? "en" : "ka";
  const [form, setForm] = useState<Form>(() => ({ topic: "", grade: test.grade, types: offered.slice(0, 3), count: 5, difficulty: "medium", language: paperLanguage, source: "" }));
  const [usage, setUsage] = useState<(AiUsage & { mock?: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [shift, setShift] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/ai/usage", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => !cancelled && data && setUsage(data as AiUsage))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const request = () => ({ subject: test.subjectId, grade: form.grade, topic: form.topic, types: form.types, count: form.count, difficulty: form.difficulty, language: form.language, source: form.source });
  const sourceTooLong = form.source.length > AI_LIMITS.sourceLength;

  function fail(answer: Extract<Answer, { ok: false }>) {
    if (answer.usage) setUsage((previous) => ({ ...previous, ...answer.usage! }));
    // Free and out of generations: explain Premium. Anyone else: a plain message.
    if (answer.error === "limit" && answer.usage?.plan === "free") return upgrade("ai");
    toast.error(t(`ai.error.${answer.error}`, { limit: answer.usage?.limit ?? usage?.limit ?? 0 }));
  }

  async function generate() {
    if (form.topic.trim().length < 2 && form.source.trim().length < 20) return void toast.error(t("ai.error.topic"));
    if (form.types.length === 0) return void toast.error(t("ai.error.types"));
    setBusy(true);
    const answer = await ask(request());
    setBusy(false);
    if (!answer.ok) return fail(answer);
    if (answer.usage) setUsage((previous) => ({ ...previous, ...answer.usage! }));
    setResult({ questions: answer.questions, usageId: answer.usageId, mock: answer.mock, leftOut: answer.leftOut });
  }

  async function regenerate(question: Question) {
    if (!result) return;
    setReplacing(question.id);
    const types = offered.includes(question.type as AiType) ? [question.type] : form.types;
    const answer = await ask({ ...request(), types, regenerateOf: result.usageId, shift });
    setShift((n) => n + 1);
    setReplacing(null);
    if (!answer.ok) return fail(answer);
    const fresh = answer.questions[0];
    if (fresh) setResult((previous) => previous && { ...previous, questions: previous.questions.map((q) => (q.id === question.id ? fresh : q)) });
  }

  function insert() {
    if (!result || result.questions.length === 0) return;
    onInsert(result.questions);
    toast.success(t("ai.inserted", { count: result.questions.length }));
    setResult(null);
    onClose();
  }

  const toggleType = (type: AiType) => setForm((f) => ({ ...f, types: f.types.includes(type) ? f.types.filter((x) => x !== type) : offered.filter((x) => x === type || f.types.includes(x)) }));
  const left = usage ? Math.max(0, usage.limit - usage.used) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent closeLabel={t("dialog.close")} className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" data-ai-dialog={result ? "review" : "form"}>
        <div className="flex items-start gap-3">
          <span className="inline-flex shrink-0 rounded-xl bg-primary-soft p-2.5 text-brand">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <div>
            <DialogTitle>{result ? t("ai.reviewTitle") : t("ai.title")}</DialogTitle>
            <DialogDescription>{result ? t("ai.reviewLead") : t("ai.lead")}</DialogDescription>
          </div>
        </div>

        {(usage?.mock || result?.mock) && (
          <p role="note" className="rounded-xl border border-dashed border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-text" data-ai-mock="">
            {t("ai.mock")}
          </p>
        )}

        {!result ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field label={t("ai.topic")}>
                <Input value={form.topic} maxLength={AI_LIMITS.topicLength} placeholder={t("ai.topicPlaceholder")} onChange={(e) => setForm({ ...form, topic: e.target.value })} data-ai-topic="" />
              </Field>
              <Field label={t("ai.grade")}>
                <Input value={form.grade} maxLength={AI_LIMITS.gradeLength} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
              </Field>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("ai.subject")}: <b className="font-semibold text-soft-foreground">{t(`subject.${test.subjectId}`)}</b>
            </p>

            <div>
              <FieldLabel>{t("ai.types")}</FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("ai.types")}>
                {offered.map((type) => {
                  const on = form.types.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={on}
                      data-ai-type={type}
                      onClick={() => toggleType(type)}
                      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", on ? "border-primary-soft-border bg-primary-soft text-brand" : "text-muted-foreground hover:bg-accent")}
                    >
                      {t(`type.${type}` as Parameters<typeof t>[0])}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <Field label={t("ai.count")} className="w-36">
                <Input
                  type="number"
                  min={1}
                  max={AI_LIMITS.maxQuestions}
                  value={form.count}
                  data-ai-count=""
                  onChange={(e) => setForm({ ...form, count: Math.min(AI_LIMITS.maxQuestions, Math.max(1, Math.round(Number(e.target.value)) || 1)) })}
                />
              </Field>
              <div>
                <FieldLabel>{t("ai.difficulty")}</FieldLabel>
                <SegmentedControl<Difficulty> label={t("ai.difficulty")} value={form.difficulty} onChange={(difficulty) => setForm({ ...form, difficulty })} options={DIFFICULTIES.map((d) => ({ value: d, label: t(`ai.difficulty.${d}`) }))} />
              </div>
              <div>
                <FieldLabel>{t("ai.language")}</FieldLabel>
                <SegmentedControl<Language> label={t("ai.language")} value={form.language} onChange={(language) => setForm({ ...form, language })} options={(["ka", "en"] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))} />
              </div>
            </div>

            <Field label={t("ai.source")}>
              <Textarea rows={4} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} data-ai-source="" />
            </Field>
            <p className={cn("-mt-2 text-sm", sourceTooLong ? "text-destructive-text" : "text-muted-foreground")}>
              {sourceTooLong ? t("ai.sourceTooLong", { count: form.source.length, max: AI_LIMITS.sourceLength }) : t("ai.sourceHint", { max: AI_LIMITS.sourceLength })}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground" data-ai-left={left ?? ""}>
                {usage ? t("ai.left", { left: left ?? 0, limit: usage.limit }) : ""}
              </p>
              <Button disabled={busy || sourceTooLong} onClick={() => void generate()} data-ai-generate="">
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                {busy ? t("ai.generating") : t("ai.generate")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {result.leftOut > 0 && <p className="text-sm text-muted-foreground">{t("ai.leftOut", { count: result.leftOut })}</p>}
            {result.questions.length === 0 && <p className="rounded-xl border bg-muted/40 px-4 py-6 text-center text-muted-foreground">{t("ai.nothingLeft")}</p>}
            <ol className="space-y-3">
              {result.questions.map((question) => (
                <li key={question.id} className={cn("rounded-xl border bg-card p-4", replacing === question.id && "opacity-50")} data-ai-question={question.type}>
                  <AiQuestionPreview question={question} />
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                    <Button size="sm" variant="ghost" disabled={replacing !== null} onClick={() => void regenerate(question)} data-ai-regenerate="">
                      <RefreshCw className={cn(replacing === question.id && "animate-spin")} aria-hidden="true" />
                      {t("ai.regenerate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={replacing !== null}
                      className="text-destructive-text hover:bg-destructive-soft hover:text-destructive-text"
                      onClick={() => setResult({ ...result, questions: result.questions.filter((q) => q.id !== question.id) })}
                      data-ai-remove=""
                    >
                      <Trash2 aria-hidden="true" />
                      {t("ai.remove")}
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button variant="ghost" onClick={() => setResult(null)} data-ai-back="">
                {t("ai.back")}
              </Button>
              <Button disabled={result.questions.length === 0 || replacing !== null} onClick={insert} data-ai-insert="">
                {t("ai.insert", { count: result.questions.length })}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
