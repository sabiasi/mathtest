"use client";

/**
 * The editor's "Insert from bank" window: the teacher's saved questions of
 * THIS test's subject; tick some, look at one on paper, insert. Copies go
 * into the test (new ids), so the bank's questions never change.
 */
import { Eye, EyeOff, Library } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { useT } from "@/i18n/language";
import { SegmentedControl } from "@/components/ui/form";
import { usePlan } from "@/features/plans/PlanProvider";
import { filterBank, questionFromBank, type BankFilter, type BankItem } from "@/lib/bank/bank";
import { copyImagesToAccount, ImageStorageFullError } from "@/lib/images/imageStore";
import { seatActive } from "@/lib/plans/entitlements";
import { READY } from "@/lib/plans/plans";
import { loadSchoolBank, useSchoolBank } from "@/lib/schools/schoolBankStore";
import type { Question, Test } from "@/lib/storage/types";
import { BankFilters, BankRow } from "./BankParts";
import { BankPaper } from "./BankView";
import { useBank } from "./useBank";

export function BankInsertDialog({ test, open, onClose, onInsert }: { test: Test; open: boolean; onClose: () => void; onInsert: (questions: Question[]) => void }) {
  const t = useT();
  const bank = useBank();
  const school = useSchoolBank();
  const { entitlements } = usePlan();
  // The school's shared bank (School plan) is a second place to insert from.
  const schoolOffered = READY.sharedBank && seatActive(entitlements.school) && entitlements.features.sharedBank;
  const [source, setSource] = useState<"mine" | "school">("mine");
  const fromSchool = schoolOffered && source === "school";
  useEffect(() => { if (open && fromSchool) void loadSchoolBank(); }, [open, fromSchool]);
  const [filter, setFilter] = useState<BankFilter>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [previewed, setPreviewed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const items: BankItem[] = fromSchool ? school.items : bank.items;
  const status = fromSchool ? school.status : bank.status;
  const mine = useMemo(() => items.filter((item) => item.subject === test.subjectId), [items, test.subjectId]);
  const shown = useMemo(() => filterBank(mine, filter), [mine, filter]);

  function close() {
    setPicked([]);
    setPreviewed(null);
    onClose();
  }
  function switchSource(next: "mine" | "school") {
    setSource(next);
    setPicked([]);
    setPreviewed(null);
    setFilter({});
  }
  async function insert() {
    // In the order they were ticked.
    const chosen = picked.map((id) => mine.find((item) => item.id === id)).filter((item) => item !== undefined);
    const questions = chosen.map(questionFromBank);
    if (fromSchool) {
      // A colleague's pictures are copied into MY picture space, so the test keeps them for good.
      setBusy(true);
      try {
        await copyImagesToAccount({ ...test, questions });
      } catch (error) {
        setBusy(false);
        toast.error(t(error instanceof ImageStorageFullError ? "shared.copyFull" : "shared.copyFailed"));
        return;
      }
      setBusy(false);
    }
    onInsert(questions);
    close();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent closeLabel={t("dialog.close")} className="flex max-h-[92vh] flex-col sm:max-w-3xl" data-bank-insert-dialog="">
        <DialogTitle>{t("bank.insertTitle")}</DialogTitle>
        <DialogDescription>{t("bank.insertLead", { subject: t(`subject.${test.subjectId}`) })}</DialogDescription>
        {schoolOffered && (
          <SegmentedControl label={t("schoolBank.source")} value={source} onChange={switchSource}
            options={[{ value: "mine", label: t("schoolBank.sourceMine") }, { value: "school", label: t("schoolBank.sourceSchool") }]} />
        )}
        {mine.length === 0 ? (
          <div className="rounded-xl bg-muted/50 p-6 text-center">
            <Library className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-soft-foreground">{status === "ready" ? t(fromSchool ? "schoolBank.insertEmpty" : "bank.insertEmpty") : t("bank.loading")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(fromSchool ? "schoolBank.emptyText" : "bank.emptyText")}</p>
          </div>
        ) : (
          <>
            <BankFilters items={mine} filter={filter} onChange={setFilter} lockSubject />
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {shown.length === 0 && <li className="py-6 text-center text-muted-foreground">{t("bank.none")}</li>}
              {shown.map((item) => {
                const checked = picked.includes(item.id);
                return (
                  <BankRow
                    key={item.id}
                    item={item}
                    lead={
                      <input
                        type="checkbox"
                        className="mt-2.5 size-5 shrink-0 accent-primary"
                        checked={checked}
                        aria-label={t("bank.select")}
                        onChange={() => setPicked((now) => (checked ? now.filter((id) => id !== item.id) : [...now, item.id]))}
                        data-bank-pick=""
                      />
                    }
                    actions={
                      <IconButton label={t("bank.preview")} aria-expanded={previewed === item.id} onClick={() => setPreviewed((now) => (now === item.id ? null : item.id))} data-bank-preview="">
                        {previewed === item.id ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                      </IconButton>
                    }
                  >
                    {previewed === item.id && (
                      <div className="mt-3 rounded-xl bg-muted/50 p-3">
                        <BankPaper item={item} version="student" />
                      </div>
                    )}
                  </BankRow>
                );
              })}
            </ul>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={fromSchool ? "/school/bank" : "/bank"} className="text-sm font-medium text-brand hover:underline">{t(fromSchool ? "schoolBank.open" : "bank.open")}</Link>
          <Button disabled={picked.length === 0 || busy} onClick={() => void insert()} data-bank-insert="">
            {t("bank.insertButton", { count: picked.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
