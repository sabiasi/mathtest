"use client";

/** Admin → Users: search, filter by plan, and the manual plan changes (each with a reason, each in the audit log). */
import { Gift, Hourglass, MoreHorizontal, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DateField } from "@/components/DateField";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { inputClasses } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { apiPost } from "@/lib/schools/api";
import { cn } from "@/lib/utils";
import { ActionDialog, AdminField, useAdminReport } from "./AdminParts";
import { Loaded, Table, useAdminData } from "./AdminView";

const KINDS = ["all", "trial", "paying", "gifted", "grace", "school", "free"] as const;
type Kind = (typeof KINDS)[number];
type UserRow = {
  id: string; email: string; name: string; created_at: string;
  plan: string | null; status: string | null; trial_ends_at: string | null; current_period_end: string | null; provider: string | null;
  plan_now: "free" | "premium" | "school"; school: string | null; school_role: string | null;
};
type Action = { kind: "gift" | "trial" | "free"; user: UserRow } | null;

export function UsersTab() {
  const t = useT();
  const language = useLanguage();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [page, setPage] = useState(0);
  const state = useAdminData<UserRow[]>(`/api/admin/users?${new URLSearchParams({ search: query, kind, page: String(page) })}`);
  const [action, setAction] = useState<Action>(null);

  return (
    <div>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setPage(0); setQuery(search.trim()); }}>
        <Input className="min-w-56 flex-1" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.searchUsers")} data-admin-search="" />
        <select className={cn(inputClasses, "w-auto")} value={kind} aria-label={t("admin.filter")} onChange={(event) => { setPage(0); setKind(event.target.value as Kind); }} data-admin-kind="">
          {KINDS.map((value) => <option key={value} value={value}>{t(`admin.kind.${value}`)}</option>)}
        </select>
        <Button type="submit" variant="outline">{t("admin.search")}</Button>
      </form>
      <Loaded state={state}>
        {(rows) => rows.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
          <>
            <Table data="users" head={[t("admin.email"), t("admin.joined"), t("admin.planNow"), t("admin.details"), ""]}>
              {rows.map((row) => (
                <tr key={row.id} data-admin-user={row.email}>
                  <td className="px-3 py-2">
                    <span className="block break-all">{row.email}</span>
                    {row.name && <span className="block text-xs text-muted-foreground">{row.name}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDayOf(row.created_at, language)}</td>
                  <td className="px-3 py-2 font-semibold" data-admin-plan-now={row.plan_now}>{t(`plan.${row.plan_now}`)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{describe(row, t, language)}</td>
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger aria-label={t("admin.actions")} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" data-admin-user-menu="">
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAction({ kind: "gift", user: row })} data-admin-gift=""><Gift aria-hidden="true" />{t("admin.gift")}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAction({ kind: "trial", user: row })} data-admin-trial=""><Hourglass aria-hidden="true" />{t("admin.extendTrial")}</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setAction({ kind: "free", user: row })} data-admin-free=""><UserX aria-hidden="true" />{t("admin.setFree")}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="mt-3 flex justify-between">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t("admin.previous")}</Button>
              <Button variant="ghost" size="sm" disabled={rows.length < 50} onClick={() => setPage((p) => p + 1)}>{t("admin.next")}</Button>
            </div>
          </>
        )}
      </Loaded>
      <PlanDialogs action={action} onClose={() => setAction(null)} onDone={state.reload} />
    </div>
  );
}

function describe(row: UserRow, t: ReturnType<typeof useT>, language: ReturnType<typeof useLanguage>): string {
  const parts: string[] = [];
  if (row.school) parts.push(t("admin.inSchool", { school: row.school }));
  if (row.status === "trialing" && row.trial_ends_at) parts.push(t("admin.trialUntil", { date: formatDayOf(row.trial_ends_at, language) }));
  else if (row.plan && row.plan !== "free" && row.status) {
    const until = row.current_period_end ? formatDayOf(row.current_period_end, language) : t("admin.noEnd");
    parts.push(`${t(`plan.${row.plan as "premium" | "school"}`)} · ${row.provider === "manual" ? t("admin.gifted") : row.status} · ${until}`);
  }
  return parts.join(" · ") || "—";
}

function PlanDialogs({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const report = useAdminReport();
  const [until, setUntil] = useState("");
  const [days, setDays] = useState("14");
  const user = action?.user;
  async function run(path: string, body: Record<string, unknown>, done: string) {
    if (!report(await apiPost<{ result?: string }>(path, body))) return false;
    toast.success(done);
    onDone();
    return true;
  }
  return (
    <>
      <ActionDialog open={action?.kind === "gift"} title={t("admin.gift")} text={user?.email} submitLabel={t("admin.gift")} onClose={onClose}
        onSubmit={(reason) => run("/api/admin/setPlan", { userId: user?.id, plan: "premium", endsAt: until, reason }, t("admin.done"))}>
        <AdminField label={t("admin.until")}>
          <span id="admin-gift-until" className="sr-only">{t("admin.until")}</span>
          <DateField value={until} onChange={setUntil} labelId="admin-gift-until" />
          <span className="mt-1 block text-xs text-muted-foreground">{t("admin.untilHint")}</span>
        </AdminField>
      </ActionDialog>
      <ActionDialog open={action?.kind === "trial"} title={t("admin.extendTrial")} text={user?.email} submitLabel={t("admin.extendTrial")} onClose={onClose}
        onSubmit={(reason) => run("/api/admin/extendTrial", { userId: user?.id, days: Number(days), reason }, t("admin.done"))}>
        <AdminField label={t("admin.days")}>
          <Input type="number" min={1} max={120} value={days} onChange={(event) => setDays(event.target.value)} className="w-28" data-admin-days="" />
        </AdminField>
      </ActionDialog>
      <ActionDialog open={action?.kind === "free"} danger title={t("admin.setFree")} text={t("admin.setFreeText", { email: user?.email ?? "" })} submitLabel={t("admin.setFree")} onClose={onClose}
        onSubmit={(reason) => run("/api/admin/setPlan", { userId: user?.id, plan: "free", endsAt: null, reason }, t("admin.done"))} />
    </>
  );
}
