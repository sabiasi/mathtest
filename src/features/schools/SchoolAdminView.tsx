"use client";

/**
 * /school — the school admin's page: seats, the join code, invitations by
 * email, the teachers (role, department, remove) and usage NUMBERS per
 * teacher (never test contents). Only the school's admins get anything:
 * the database functions behind /api/school check it.
 */
import { Copy, KeyRound, Library, Mail, RefreshCw, School, Trash2, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Button, buttonVariants } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { usePlan } from "@/features/plans/PlanProvider";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf, formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/schools/api";
import { useSchoolReport } from "./messages";
import { reloadSchool, useSchool, type SchoolMember } from "./schoolStore";

type Usage = { user_id: string; name: string; email: string; department: string; tests: number; tests_30d: number; ai_month: number; storage_bytes: number; bank: number };

export function SchoolAdminView() {
  const t = useT();
  const school = useSchool();
  const overview = school.overview;

  if (school.status === "idle" || school.status === "loading") return <p className="mx-auto max-w-4xl px-4 py-12 text-muted-foreground sm:px-6">{t("mySchool.loading")}</p>;
  if (!overview) {
    return (
      <PageTransition className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState Icon={School} title={t("schoolAdmin.onlyTitle")} text={t("schoolAdmin.onlyText")}
          actions={<Link href="/settings#school" className={buttonVariants({ variant: "outline" })}>{t("mySchool.title")}</Link>} />
      </PageTransition>
    );
  }
  return (
    <PageTransition className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div data-school-admin="">
      <Header overview={overview} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <JoinCode code={overview.school.join_code} />
        <InviteForm />
      </div>
      <Members members={overview.members} invites={overview.invites} />
      <UsageTable />
      </div>
    </PageTransition>
  );
}

function Card({ title, Icon, children, className }: { title: string; Icon: typeof Users; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-5 text-brand" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Header({ overview }: { overview: NonNullable<ReturnType<typeof useSchool>["overview"]> }) {
  const t = useT();
  const language = useLanguage();
  const { school, used } = overview;
  const share = Math.min(100, Math.round((used / school.seats) * 100));
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{school.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {school.active
          ? school.paid_until ? t("mySchool.coveredUntil", { date: formatDayOf(school.paid_until, language) }) : t("mySchool.covered")
          : t("mySchool.ended")}
      </p>
      <div className="mt-4 max-w-md">
        <p className="text-sm font-medium" data-school-seats={`${used}/${school.seats}`}>{t("schoolAdmin.seats", { used, seats: school.seats })}</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className={cn("h-full rounded-full", share >= 100 ? "bg-destructive" : "bg-primary")} style={{ width: `${share}%` }} />
        </div>
        {used >= school.seats && <p className="mt-1.5 text-sm text-destructive-text">{t("schoolAdmin.seatsFull")}</p>}
      </div>
    </header>
  );
}

function JoinCode({ code }: { code: string }) {
  const t = useT();
  const confirm = useConfirm();
  const report = useSchoolReport();
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("schoolAdmin.codeCopied"));
    } catch {
      toast.error(t("mySchool.error.failed"));
    }
  }
  async function renew() {
    if (!(await confirm({ title: t("schoolAdmin.newCodeTitle"), message: t("schoolAdmin.newCodeText"), confirmLabel: t("schoolAdmin.newCode") }))) return;
    if (report(await apiPost("/api/school/newCode"))) {
      toast.success(t("schoolAdmin.newCodeDone"));
      await reloadSchool();
    }
  }
  return (
    <Card title={t("schoolAdmin.codeTitle")} Icon={KeyRound}>
      <p className="text-sm text-muted-foreground">{t("schoolAdmin.codeText")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg border bg-muted px-3 py-2 font-mono text-lg font-semibold tracking-[0.25em]" data-school-join-code="">{code}</span>
        <Button variant="outline" size="sm" onClick={() => void copy()}><Copy aria-hidden="true" />{t("share.linkCopy")}</Button>
        <Button variant="ghost" size="sm" onClick={() => void renew()} data-school-new-code=""><RefreshCw aria-hidden="true" />{t("schoolAdmin.newCode")}</Button>
      </div>
    </Card>
  );
}

function InviteForm() {
  const t = useT();
  const language = useLanguage();
  const report = useSchoolReport();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [busy, setBusy] = useState(false);
  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = report(await apiPost<{ result?: string }>("/api/school/invite", { email, role, language }));
    setBusy(false);
    if (!ok) return;
    toast.success(t("schoolAdmin.invited", { email: email.trim().toLowerCase() }));
    setEmail("");
    await reloadSchool();
  }
  return (
    <Card title={t("schoolAdmin.inviteTitle")} Icon={Mail}>
      <form noValidate className="flex flex-wrap items-end gap-2" onSubmit={(event) => void send(event)}>
        <label className="min-w-52 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{t("share.email")}</span>
          <Input type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("share.emailPlaceholder")} data-school-invite-email="" />
        </label>
        <select className={cn(inputClasses, "w-auto")} value={role} aria-label={t("schoolAdmin.role")} onChange={(event) => setRole(event.target.value as "teacher" | "admin")} data-school-invite-role="">
          <option value="teacher">{t("mySchool.roleTeacher")}</option>
          <option value="admin">{t("mySchool.roleAdmin")}</option>
        </select>
        <Button type="submit" disabled={busy || !email.trim()} data-school-invite-send="">{t("schoolAdmin.inviteSend")}</Button>
      </form>
      <p className="mt-3 text-sm text-muted-foreground">{t("schoolAdmin.inviteText")}</p>
    </Card>
  );
}

function Members({ members, invites }: { members: SchoolMember[]; invites: { id: string; email: string; role: string }[] }) {
  const t = useT();
  const confirm = useConfirm();
  const report = useSchoolReport();
  const { refresh: refreshPlan } = usePlan();
  async function remove(member: SchoolMember) {
    const who = member.name || member.email;
    if (!(await confirm({ title: t("schoolAdmin.removeTitle"), message: t("schoolAdmin.removeText", { name: who }), confirmLabel: t("schoolAdmin.remove"), danger: true }))) return;
    if (report(await apiPost<{ result?: string }>("/api/school/remove", { member: member.user_id }))) {
      toast.success(t("schoolAdmin.removed", { name: who }));
      await reloadSchool();
    }
  }
  async function cancel(invite: { id: string; email: string }) {
    if (report(await apiPost<{ result?: string }>("/api/school/cancelInvite", { invite: invite.id }))) {
      toast.success(t("schoolAdmin.inviteCancelled", { email: invite.email }));
      await reloadSchool();
    }
  }
  async function save(member: SchoolMember, role: string, department: string) {
    if (report(await apiPost<{ result?: string }>("/api/school/setMember", { member: member.user_id, role, department }))) {
      toast.success(t("schoolAdmin.saved"));
      await reloadSchool();
      refreshPlan();
    }
  }
  return (
    <Card title={t("schoolAdmin.membersTitle")} Icon={Users} className="mt-6">
      <ul className="divide-y" data-school-members="">
        {members.map((member) => <MemberRow key={member.user_id} member={member} onSave={save} onRemove={remove} />)}
      </ul>
      {invites.length > 0 && (
        <>
          <h3 className="mt-5 font-semibold">{t("schoolAdmin.pending")}</h3>
          <ul className="mt-2 divide-y" data-school-pending="">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 py-2" data-school-pending-email={invite.email}>
                <span className="min-w-0 flex-1 break-all">{invite.email}</span>
                <span className="text-sm text-muted-foreground">{t(invite.role === "admin" ? "mySchool.roleAdmin" : "mySchool.roleTeacher")}</span>
                <IconButton label={t("schoolAdmin.cancelInvite", { email: invite.email })} tone="danger" onClick={() => void cancel(invite)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function MemberRow({ member, onSave, onRemove }: { member: SchoolMember; onSave: (m: SchoolMember, role: string, department: string) => Promise<void>; onRemove: (m: SchoolMember) => Promise<void> }) {
  const t = useT();
  const [role, setRole] = useState(member.role);
  const [department, setDepartment] = useState(member.department);
  const changed = role !== member.role || department.trim() !== member.department;
  return (
    <li className="flex flex-wrap items-center gap-2 py-3" data-school-member={member.email}>
      <div className="min-w-48 flex-1">
        <p className="font-medium">{member.name || member.email}</p>
        {member.name && <p className="text-sm break-all text-muted-foreground">{member.email}</p>}
      </div>
      <select className={cn(inputClasses, "w-auto py-1.5 text-sm")} value={role} aria-label={t("schoolAdmin.role")} onChange={(event) => setRole(event.target.value as "teacher" | "admin")} data-member-role="">
        <option value="teacher">{t("mySchool.roleTeacher")}</option>
        <option value="admin">{t("mySchool.roleAdmin")}</option>
      </select>
      <Input className="w-40 py-1.5 text-sm" value={department} maxLength={80} placeholder={t("schoolAdmin.department")} aria-label={t("schoolAdmin.department")}
        onChange={(event) => setDepartment(event.target.value)} data-member-department="" />
      <Button size="sm" variant="outline" disabled={!changed} onClick={() => void onSave(member, role, department)} data-member-save="">{t("schoolAdmin.save")}</Button>
      <IconButton label={t("schoolAdmin.remove")} tone="danger" onClick={() => void onRemove(member)} data-member-remove="">
        <UserMinus className="size-4" aria-hidden="true" />
      </IconButton>
    </li>
  );
}

function UsageTable() {
  const t = useT();
  const [rows, setRows] = useState<Usage[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void apiGet<{ usage: Usage[] }>("/api/school/usage").then((answer) => {
      if (cancelled) return;
      if (answer.ok) setRows(answer.body.usage);
      else setFailed(true);
    });
    return () => { cancelled = true; };
  }, []);
  return (
    <Card title={t("schoolAdmin.usageTitle")} Icon={Library} className="mt-6">
      <p className="text-sm text-muted-foreground">{t("schoolAdmin.usageText")}</p>
      {failed ? <p className="mt-3 text-destructive-text">{t("mySchool.error.failed")}</p> : rows === null ? <p className="mt-3 text-muted-foreground">{t("mySchool.loading")}</p> : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm" data-school-usage="">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">{t("schoolAdmin.teacher")}</th>
                <th className="py-2 pr-3 font-medium">{t("schoolAdmin.department")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("schoolAdmin.tests")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("schoolAdmin.active30")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("schoolAdmin.ai")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("schoolAdmin.storage")}</th>
                <th className="py-2 text-right font-medium">{t("schoolAdmin.shared")}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b last:border-0" data-usage-row={row.email}>
                  <td className="py-2 pr-3">{row.name || row.email}</td>
                  <td className="py-2 pr-3">{row.department}</td>
                  <td className="py-2 pr-3 text-right" data-usage-tests="">{row.tests}</td>
                  <td className="py-2 pr-3 text-right">{row.tests_30d}</td>
                  <td className="py-2 pr-3 text-right">{row.ai_month}</td>
                  <td className="py-2 pr-3 text-right">{formatSize(row.storage_bytes)}</td>
                  <td className="py-2 text-right">{row.bank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
