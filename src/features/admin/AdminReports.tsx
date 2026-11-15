"use client";

/** The read-only admin tabs: overview numbers, money, AI usage, the audit log. */
import { gel } from "@/features/billing/BillingSection";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { Loaded, Table, useAdminData } from "./AdminView";

type Overview = Record<"users" | "new_30d" | "trials" | "paying" | "gifted" | "schools" | "seats" | "seats_used" | "revenue_month_tetri" | "failed_30d" | "ai_month" | "open_requests", number>;

export function OverviewTab() {
  const t = useT();
  const state = useAdminData<Overview>("/api/admin/overview");
  return (
    <Loaded state={state}>
      {(o) => (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-admin-overview="">
          {([
            ["users", o.users], ["new_30d", o.new_30d], ["trials", o.trials], ["paying", o.paying], ["gifted", o.gifted],
            ["schools", o.schools], ["seats", `${o.seats_used} / ${o.seats}`], ["revenue", gel(o.revenue_month_tetri)],
            ["failed", o.failed_30d], ["ai", o.ai_month], ["requests", o.open_requests],
          ] as const).map(([key, value]) => (
            <div key={key} className="rounded-xl border bg-card p-4" data-admin-stat={key}>
              <dt className="text-sm text-muted-foreground">{t(`admin.stat.${key}`)}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Loaded>
  );
}

type Month = { month: string; paid_tetri: number; refunded_tetri: number; payments: number; failed: number; new_subscriptions: number };
type Failed = { id: string; created_at: string; kind: string; billing_period: string; amount_tetri: number; failure_reason: string; email: string | null; subscription_status: string | null; grace_ends_at: string | null };

export function PaymentsTab() {
  const t = useT();
  const language = useLanguage();
  const revenue = useAdminData<Month[]>("/api/admin/revenue");
  const failed = useAdminData<Failed[]>("/api/admin/failed");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">{t("admin.revenueTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.revenueText")}</p>
        <Loaded state={revenue}>
          {(rows) => rows.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
            <Table data="revenue" head={[t("admin.month"), t("admin.paid"), t("admin.refunded"), t("admin.net"), t("admin.payments"), t("admin.newSubs"), t("admin.failedCount")]}>
              {rows.map((row) => (
                <tr key={row.month}>
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">{gel(row.paid_tetri)}</td>
                  <td className="px-3 py-2">{gel(row.refunded_tetri)}</td>
                  <td className="px-3 py-2 font-semibold">{gel(row.paid_tetri - row.refunded_tetri)}</td>
                  <td className="px-3 py-2">{row.payments}</td>
                  <td className="px-3 py-2">{row.new_subscriptions}</td>
                  <td className="px-3 py-2">{row.failed}</td>
                </tr>
              ))}
            </Table>
          )}
        </Loaded>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{t("admin.failedTitle")}</h2>
        <Loaded state={failed}>
          {(rows) => rows.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
            <Table data="failed" head={[t("admin.date"), t("admin.email"), t("admin.amount"), t("admin.reasonCol"), t("admin.status")]}>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">{formatDayOf(row.created_at, language)}</td>
                  <td className="px-3 py-2 break-all">{row.email ?? "—"}</td>
                  <td className="px-3 py-2">{gel(row.amount_tetri)}</td>
                  <td className="px-3 py-2">{row.failure_reason || "—"}</td>
                  <td className="px-3 py-2">
                    {row.subscription_status ?? "—"}
                    {row.grace_ends_at && <span className="block text-xs text-muted-foreground">{t("admin.graceUntil", { date: formatDayOf(row.grace_ends_at, language) })}</span>}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Loaded>
      </section>
    </div>
  );
}

type Ai = { months: { month: string; generations: number; failed: number; questions: number; input_tokens: number; output_tokens: number; mock: number }[]; top: { email: string; plan: string; generations: number }[] };

export function AiTab() {
  const t = useT();
  const state = useAdminData<Ai>("/api/admin/ai");
  return (
    <Loaded state={state}>
      {(ai) => (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">{t("admin.aiTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("admin.aiText")}</p>
            {ai.months.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
              <Table data="ai" head={[t("admin.month"), t("admin.generations"), t("admin.questions"), t("admin.tokensIn"), t("admin.tokensOut"), t("admin.mock"), t("admin.failedCount")]}>
                {ai.months.map((row) => (
                  <tr key={row.month}>
                    <td className="px-3 py-2">{row.month}</td>
                    <td className="px-3 py-2">{row.generations}</td>
                    <td className="px-3 py-2">{row.questions}</td>
                    <td className="px-3 py-2">{row.input_tokens}</td>
                    <td className="px-3 py-2">{row.output_tokens}</td>
                    <td className="px-3 py-2">{row.mock}</td>
                    <td className="px-3 py-2">{row.failed}</td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
          <section>
            <h2 className="text-lg font-semibold">{t("admin.aiTop")}</h2>
            {ai.top.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
              <Table head={[t("admin.email"), t("admin.plan"), t("admin.generations")]}>
                {ai.top.map((row) => (
                  <tr key={row.email}>
                    <td className="px-3 py-2 break-all">{row.email}</td>
                    <td className="px-3 py-2">{t(`plan.${row.plan as "free" | "premium" | "school"}`)}</td>
                    <td className="px-3 py-2">{row.generations}</td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        </div>
      )}
    </Loaded>
  );
}

type LogRow = { id: number; created_at: string; action: string; target: string; reason: string; details: unknown; admin_email: string | null };

export function LogTab() {
  const t = useT();
  const language = useLanguage();
  const state = useAdminData<LogRow[]>("/api/admin/log");
  return (
    <Loaded state={state}>
      {(rows) => (
        <>
          <p className="mt-4 text-sm text-muted-foreground">{t("admin.logText")}</p>
          {rows.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
            <Table data="log" head={[t("admin.date"), t("admin.who"), t("admin.action"), t("admin.target"), t("admin.reasonCol")]}>
              {rows.map((row) => (
                <tr key={row.id} data-admin-log={row.action}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDayOf(row.created_at, language)}</td>
                  <td className="px-3 py-2 break-all">{row.admin_email ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                  <td className="px-3 py-2 font-mono text-xs break-all">{row.target}</td>
                  <td className="px-3 py-2">{row.reason}</td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
    </Loaded>
  );
}
