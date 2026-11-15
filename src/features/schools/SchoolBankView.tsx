"use client";

/**
 * /school/bank — the school's shared questions (School plan). Every teacher
 * of the school sees them; filter by department, subject, grade, type; look
 * at one as it prints; take your own (or, as school admin, any) out again.
 * Questions are added from the editor ("⋯" → "Save to the school bank") and
 * inserted with "Insert from bank" → "School bank".
 */
import { Eye, EyeOff, School, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { BankFilters, BankRow } from "@/features/bank/BankParts";
import { BankPaper } from "@/features/bank/BankView";
import { usePlan } from "@/features/plans/PlanProvider";
import { useT } from "@/i18n/language";
import { filterBank, type BankFilter } from "@/lib/bank/bank";
import { seatActive } from "@/lib/plans/entitlements";
import { loadSchoolBank, removeFromSchoolBank, useSchoolBank, type SchoolBankItem } from "@/lib/schools/schoolBankStore";
import { cn } from "@/lib/utils";

export function SchoolBankView() {
  const t = useT();
  const confirm = useConfirm();
  const { entitlements, ready } = usePlan();
  const seat = entitlements.school;
  const allowed = seatActive(seat) && entitlements.features.sharedBank;
  const bank = useSchoolBank();
  const [filter, setFilter] = useState<BankFilter>({});
  const [department, setDepartment] = useState("");
  const [previewed, setPreviewed] = useState<string | null>(null);
  useEffect(() => { if (allowed) void loadSchoolBank(); }, [allowed]);

  const departments = useMemo(() => [...new Set(bank.items.map((item) => item.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [bank.items]);
  const shown = useMemo(() => (filterBank(bank.items, filter) as SchoolBankItem[]).filter((item) => !department || item.department === department), [bank.items, filter, department]);

  async function remove(item: SchoolBankItem) {
    if (!(await confirm({ title: t("schoolBank.removeTitle"), message: t("schoolBank.removeText"), confirmLabel: t("bank.delete"), danger: true }))) return;
    const result = await removeFromSchoolBank(item.id);
    if (result === "ok") toast.success(t("schoolBank.removed"));
    else toast.error(t(`mySchool.error.${result === "invalid" ? "forbidden" : result}`));
  }

  if (!ready) return <p className="mx-auto max-w-4xl px-4 py-12 text-muted-foreground sm:px-6">{t("mySchool.loading")}</p>;
  if (!allowed) {
    return (
      <PageTransition className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState Icon={School} title={t("schoolBank.onlyTitle")} text={t("schoolBank.onlyText")}
          actions={<Link href="/settings#school" className={buttonVariants({ variant: "outline" })}>{t("mySchool.title")}</Link>} />
      </PageTransition>
    );
  }
  return (
    <PageTransition className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div data-school-bank="">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("schoolBank.title")}</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">{t("schoolBank.lead", { school: seat?.name ?? "" })}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {departments.length > 0 && (
            <select className={cn(inputClasses, "w-auto")} value={department} aria-label={t("schoolAdmin.department")} onChange={(event) => setDepartment(event.target.value)} data-school-bank-department="">
              <option value="">{t("schoolBank.allDepartments")}</option>
              {departments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          )}
          <div className="min-w-0 flex-1"><BankFilters items={bank.items} filter={filter} onChange={setFilter} /></div>
        </div>
        {bank.status === "error" && <p className="mt-6 text-destructive-text" role="alert">{t("mySchool.error.failed")}</p>}
        {bank.status === "ready" && bank.items.length === 0 ? (
          <EmptyState className="mt-8" Icon={School} title={t("schoolBank.emptyTitle")} text={t("schoolBank.emptyText")} />
        ) : (
          <ul className="mt-6 space-y-3">
            {bank.status === "loading" && bank.items.length === 0 && <li className="text-muted-foreground">{t("mySchool.loading")}</li>}
            {bank.status === "ready" && shown.length === 0 && <li className="py-6 text-center text-muted-foreground">{t("bank.none")}</li>}
            {shown.map((item) => (
              <BankRow key={item.id} item={item}
                actions={
                  <>
                    <IconButton label={t("bank.preview")} aria-expanded={previewed === item.id} onClick={() => setPreviewed((now) => (now === item.id ? null : item.id))}>
                      {previewed === item.id ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </IconButton>
                    {(item.mine || seat?.role === "admin") && (
                      <IconButton label={t("bank.delete")} tone="danger" onClick={() => void remove(item)} data-school-bank-remove="">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </IconButton>
                    )}
                  </>
                }>
                <p className="mt-2 text-sm text-muted-foreground" data-school-bank-author="">
                  {t("schoolBank.by", { name: item.mine ? t("schoolBank.me") : item.authorName || t("shared.someone") })}
                  {item.department && <> · {item.department}</>}
                </p>
                {previewed === item.id && <div className="mt-3 rounded-xl bg-muted/50 p-3"><BankPaper item={item} version="student" /></div>}
              </BankRow>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
