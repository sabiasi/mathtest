"use client";

/**
 * /bank — the teacher's own question bank (Premium): search, filter, look at
 * a question on real paper, change its tags, delete it. Questions get in
 * from the editor ("⋯" → "Save to my bank") and out through "Insert from
 * bank". Needs an account; guests are told how to get one.
 */
import { Crown, Eye, Library, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageBackdrop } from "@/components/PageBackdrop";
import { PageTransition } from "@/components/PageTransition";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inputClasses, SegmentedControl } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlan } from "@/features/plans/PlanProvider";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { PaperPreview } from "@/features/print/PaperPreview";
import type { PrintVersion } from "@/features/print/PrintBlocks";
import { useLanguage, useT } from "@/i18n/language";
import { filterBank, MAX_BANK_QUESTIONS, parseTags, wrapQuestions, type BankFilter, type BankItem } from "@/lib/bank/bank";
import { removeFromBank, retryBank, setBankTags, type BankResult } from "@/lib/bank/bankStore";
import { getToolkit } from "@/subjects/registry";
import { BankFilters, BankRow } from "./BankParts";
import { useBank } from "./useBank";

/** The message for a bank action that didn't work (null = it worked). */
export function useBankMessages() {
  const t = useT();
  const upgrade = useUpgrade();
  return (result: BankResult): boolean => {
    if (result === "ok") return true;
    if (result === "premium") upgrade("bank");
    else toast.error(result === "full" ? t("bank.full", { max: MAX_BANK_QUESTIONS }) : t("bank.failed"));
    return false;
  };
}

/** One bank question drawn as it prints (student paper or answer key). */
export function BankPaper({ item, version }: { item: BankItem; version: PrintVersion }) {
  const language = useLanguage();
  const test = useMemo(() => {
    const toolkit = getToolkit(item.subject);
    return wrapQuestions([item.question], item.subject, toolkit.labelStyle ?? (language === "en" ? "latin" : "georgian"), item.grade);
  }, [item, language]);
  return test ? <PaperPreview test={test} version={version} hideHeader /> : null;
}

export function BankView() {
  const t = useT();
  const { guest, status } = useAuth();
  const plan = usePlan();
  const upgrade = useUpgrade();
  const confirm = useConfirm();
  const report = useBankMessages();
  const bank = useBank();
  const [filter, setFilter] = useState<BankFilter>({});
  const [preview, setPreview] = useState<BankItem | null>(null);
  const [version, setVersion] = useState<PrintVersion>("student");
  const [tagging, setTagging] = useState<{ item: BankItem; text: string } | null>(null);
  const shown = useMemo(() => filterBank(bank.items, filter), [bank.items, filter]);
  const allowed = plan.entitlements.features.questionBank;

  async function remove(item: BankItem) {
    if (!(await confirm({ title: t("bank.deleteTitle"), message: t("bank.deleteText"), confirmLabel: t("bank.delete"), danger: true }))) return;
    if (report(await removeFromBank(item.id))) toast.success(t("bank.deleted"));
  }
  async function saveTags() {
    if (!tagging) return;
    if (report(await setBankTags(tagging.item.id, parseTags(tagging.text)))) setTagging(null);
  }

  let body;
  if (guest) {
    body = (
      <EmptyState
        className="mt-8"
        Icon={Library}
        title={t("bank.signIn.title")}
        text={t("bank.signIn.text")}
        actions={<Link href="/signup" className={buttonVariants()}>{t("bank.signIn.button")}</Link>}
      />
    );
  } else if (status === "loading" || bank.status === "idle" || bank.status === "loading") {
    body = (
      <div className="mt-8 space-y-3" aria-busy="true" aria-label={t("bank.loading")}>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  } else if (bank.status === "error") {
    body = (
      <div className="mt-8 rounded-2xl border bg-card p-6 text-center" role="alert">
        <p className="text-soft-foreground">{t("bank.loadFailed")}</p>
        <Button className="mt-3" variant="outline" onClick={retryBank}>{t("bank.retry")}</Button>
      </div>
    );
  } else if (bank.items.length === 0) {
    body = <EmptyState className="mt-8" Icon={Library} title={t("bank.emptyTitle")} text={t("bank.emptyText")} />;
  } else {
    body = (
      <>
        <div className="mt-6">
          <BankFilters items={bank.items} filter={filter} onChange={setFilter} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground" data-bank-count="">{t("bank.count", { count: shown.length })}</p>
        {shown.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">{t("bank.none")}</p>
        ) : (
          <ul className="mt-3 space-y-3" data-bank-list="">
            {shown.map((item) => (
              <BankRow
                key={item.id}
                item={item}
                actions={
                  <>
                    <IconButton label={t("bank.preview")} onClick={() => { setVersion("student"); setPreview(item); }} data-bank-preview="">
                      <Eye className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={t("bank.tags")} onClick={() => (allowed ? setTagging({ item, text: item.tags.join(", ") }) : upgrade("bank"))} data-bank-edit-tags="">
                      <Tag className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={t("bank.delete")} tone="danger" onClick={() => void remove(item)} data-bank-delete="">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </IconButton>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <PageTransition className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <PageBackdrop className="h-72 opacity-60" />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("bank.title")}</h1>
      <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">{t("bank.lead")}</p>
      {!guest && plan.ready && !allowed && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-premium-border bg-premium-soft p-4" data-bank-locked="">
          <Crown className="size-5 shrink-0 text-premium-text" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[15px]">{t("bank.locked")}</p>
          <Button variant="outline" onClick={() => upgrade("bank")} data-bank-unlock="">{t("bank.unlock")}</Button>
        </div>
      )}
      {body}

      <Dialog open={preview !== null} onOpenChange={(next) => !next && setPreview(null)}>
        <DialogContent closeLabel={t("dialog.close")} className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" data-bank-dialog="">
          <DialogTitle>{t("bank.previewTitle")}</DialogTitle>
          <DialogDescription>{t("bank.previewText")}</DialogDescription>
          <SegmentedControl
            label={t("print.version")}
            value={version}
            onChange={setVersion}
            options={[{ value: "student", label: t("print.student") }, { value: "key", label: t("print.key") }]}
          />
          {preview && (
            <div className="rounded-xl bg-muted/50 p-3">
              <BankPaper item={preview} version={version} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={tagging !== null} onOpenChange={(next) => !next && setTagging(null)}>
        <DialogContent closeLabel={t("dialog.close")} className="sm:max-w-md" data-bank-tags-dialog="">
          <DialogTitle>{t("bank.tagsTitle")}</DialogTitle>
          <DialogDescription>{t("bank.tagsHint")}</DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTags();
            }}
          >
            <input className={inputClasses} value={tagging?.text ?? ""} aria-label={t("bank.tags")} onChange={(e) => setTagging((now) => now && { ...now, text: e.target.value })} autoFocus data-bank-tags-input="" />
            <div className="flex justify-end">
              <Button type="submit" data-bank-tags-save="">{t("bank.tagsSave")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
