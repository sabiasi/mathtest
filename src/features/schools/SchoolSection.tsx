"use client";

/**
 * Settings → "My school": the teacher's school seat, invitations waiting for
 * them, "join with a code", and leaving. A seat in an active school gives the
 * School plan (see lib/plans/entitlements.ts). Nothing is deleted on leaving.
 */
import { Check, School, X } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlan } from "@/features/plans/PlanProvider";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { seatActive } from "@/lib/plans/entitlements";
import { apiPost } from "@/lib/schools/api";
import { useSchoolReport } from "./messages";
import { reloadSchool, useSchool } from "./schoolStore";

export function SchoolSection() {
  const t = useT();
  const language = useLanguage();
  const confirm = useConfirm();
  const report = useSchoolReport();
  const { refresh: refreshPlan } = usePlan();
  const school = useSchool();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  /** After any change: the seat and the plan are loaded again. */
  async function act(action: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    const ok = report(await apiPost<{ result?: string }>(`/api/school/${action}`, body));
    setBusy(false);
    if (!ok) return false;
    toast.success(done);
    await reloadSchool();
    refreshPlan();
    return true;
  }
  async function join(event: FormEvent) {
    event.preventDefault();
    if (code.trim() && (await act("join", { code }, t("mySchool.joined")))) setCode("");
  }
  async function leave() {
    if (!school.seat) return;
    const ok = await confirm({ title: t("mySchool.leaveTitle"), message: t("mySchool.leaveText", { school: school.seat.name }), confirmLabel: t("mySchool.leave"), danger: true });
    if (ok) await act("leave", {}, t("mySchool.left"));
  }

  if (school.status === "error") {
    return <p className="text-muted-foreground" role="alert">{t(`mySchool.error.${school.error ?? "failed"}`)}</p>;
  }
  if (school.status !== "ready") return <p className="text-muted-foreground">{t("mySchool.loading")}</p>;

  const seat = school.seat;
  if (seat) {
    const active = seatActive(seat);
    return (
      <div className="space-y-4" data-school-seat={seat.role}>
        <div className="flex items-start gap-3">
          <span className="inline-flex shrink-0 rounded-xl bg-primary-soft p-2.5 text-brand"><School className="size-6" aria-hidden="true" /></span>
          <div>
            <p className="font-semibold" data-school-name="">{seat.name}</p>
            <p className="text-sm text-muted-foreground">
              {t(seat.role === "admin" ? "mySchool.roleAdmin" : "mySchool.roleTeacher")}
              {seat.department && <> · {seat.department}</>}
            </p>
            <p className="mt-1 text-sm" data-school-active={active ? "true" : "false"}>
              {active
                ? seat.paidUntil ? t("mySchool.coveredUntil", { date: formatDayOf(seat.paidUntil, language) }) : t("mySchool.covered")
                : t("mySchool.ended")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {seat.role === "admin" && <Link href="/school" className={buttonVariants()} data-school-manage="">{t("mySchool.manage")}</Link>}
          <Link href="/school/bank" className={buttonVariants({ variant: "outline" })}>{t("schoolBank.nav")}</Link>
          <Button variant="ghost" disabled={busy} onClick={() => void leave()} data-school-leave="">{t("mySchool.leave")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-soft-foreground">{t("mySchool.none")}</p>
      {school.invites.length > 0 && (
        <ul className="space-y-2" data-school-invites="">
          {school.invites.map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-soft-border bg-primary-soft/60 p-3" data-school-invite={invite.id}>
              <p className="min-w-52 flex-1 text-[15px]">
                {t(invite.role === "admin" ? "mySchool.inviteAdmin" : "mySchool.invite", { school: invite.school, inviter: invite.inviter || invite.school })}
              </p>
              <Button size="sm" disabled={busy} onClick={() => void act("accept", { invite: invite.id }, t("mySchool.joined"))} data-school-accept="">
                <Check aria-hidden="true" />
                {t("mySchool.accept")}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act("decline", { invite: invite.id }, t("mySchool.declined"))} data-school-decline="">
                <X aria-hidden="true" />
                {t("mySchool.decline")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void join(event)}>
        <label className="min-w-48 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{t("mySchool.code")}</span>
          <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD2345" autoComplete="off" spellCheck={false}
            className="font-mono tracking-widest uppercase" maxLength={12} data-school-code="" />
        </label>
        <Button type="submit" disabled={busy || !code.trim()} data-school-join="">{t("mySchool.join")}</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        {t("mySchool.buyHint")}{" "}
        <Link href="/pricing#school" className="font-medium text-brand hover:underline">{t("mySchool.buyLink")}</Link>
      </p>
    </div>
  );
}
