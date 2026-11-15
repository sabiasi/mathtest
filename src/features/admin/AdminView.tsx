"use client";

/**
 * /admin — the founders' page. Who is a founder is decided on the SERVER:
 * /api/admin/check answers 404 for everyone else (the database table
 * public.admins), and every database function checks it again. This page
 * only shows what those answers allow.
 *
 * Tabs: overview, users (gift Premium, extend a trial, back to Free),
 * payments (revenue per month, failed payments), AI usage, school requests
 * (status workflow, "create school"), schools and seats, the audit log.
 */
import { BarChart3, Building2, ClipboardList, CreditCard, Inbox, ScrollText, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/language";
import { apiGet } from "@/lib/schools/api";
import { AiTab, LogTab, OverviewTab, PaymentsTab } from "./AdminReports";
import { RequestsTab, SchoolsTab } from "./AdminSchools";
import { UsersTab } from "./AdminUsers";

const TABS = [
  { id: "overview", Icon: BarChart3 },
  { id: "users", Icon: Users },
  { id: "payments", Icon: CreditCard },
  { id: "ai", Icon: Sparkles },
  { id: "requests", Icon: Inbox },
  { id: "schools", Icon: Building2 },
  { id: "log", Icon: ScrollText },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminView() {
  const t = useT();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  useEffect(() => {
    void apiGet<{ admin: boolean }>("/api/admin/check").then((answer) => setAllowed(answer.ok && answer.body.admin === true));
  }, []);

  if (allowed === null) return <p className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground sm:px-6">{t("mySchool.loading")}</p>;
  if (!allowed) {
    // Looks like any missing page: nothing about the admin page is given away.
    return (
      <PageTransition className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div data-admin-denied="">
          <EmptyState Icon={ClipboardList} title={t("editor.notFoundTitle")} text={t("admin.denied")} />
        </div>
      </PageTransition>
    );
  }
  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div data-admin="">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("admin.title")}</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">{t("admin.lead")}</p>
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="mt-6">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {TABS.map(({ id, Icon }) => (
              <TabsTrigger key={id} value={id} data-admin-tab={id}>
                <Icon className="size-4" aria-hidden="true" />
                {t(`admin.tab.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Only the open tab loads its data. */}
          <TabsContent value="overview">{tab === "overview" && <OverviewTab />}</TabsContent>
          <TabsContent value="users">{tab === "users" && <UsersTab />}</TabsContent>
          <TabsContent value="payments">{tab === "payments" && <PaymentsTab />}</TabsContent>
          <TabsContent value="ai">{tab === "ai" && <AiTab />}</TabsContent>
          <TabsContent value="requests">{tab === "requests" && <RequestsTab />}</TabsContent>
          <TabsContent value="schools">{tab === "schools" && <SchoolsTab />}</TabsContent>
          <TabsContent value="log">{tab === "log" && <LogTab />}</TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

/** Loads one admin report; `reload` after a change. */
export function useAdminData<T>(path: string): { data: T | null; failed: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void apiGet<{ data: T }>(path).then((answer) => {
      if (cancelled) return;
      if (answer.ok) { setData(answer.body.data); setFailed(false); } else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [path, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, failed, reload };
}

/** "Loading…" / "couldn't load" around a report. */
export function Loaded<T>({ state, children }: { state: { data: T | null; failed: boolean }; children: (data: T) => ReactNode }) {
  const t = useT();
  if (state.failed) return <p className="mt-4 text-destructive-text" role="alert">{t("mySchool.error.failed")}</p>;
  if (state.data === null) return <p className="mt-4 text-muted-foreground">{t("mySchool.loading")}</p>;
  return <>{children(state.data)}</>;
}

/** A plain table: the head row, then the body rows. Scrolls sideways on phones. */
export function Table({ head, children, data }: { head: string[]; children: ReactNode; data?: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[40rem] text-left text-sm" data-admin-table={data}>
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>{head.map((cell, i) => <th key={i} className="px-3 py-2 font-medium">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y tabular-nums">{children}</tbody>
      </table>
    </div>
  );
}
