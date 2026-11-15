"use client";

/**
 * Admin → School requests (status workflow new → contacted → won / lost, a
 * note, "create school") and Admin → Schools (seats, paid-until date, active /
 * ended). A school paid by invoice is created here by hand.
 */
import { Building2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DateField } from "@/components/DateField";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { apiPost } from "@/lib/schools/api";
import { cn } from "@/lib/utils";
import { ActionDialog, AdminField, useAdminReport } from "./AdminParts";
import { Loaded, Table, useAdminData } from "./AdminView";

const STATUSES = ["new", "contacted", "won", "lost"] as const;
type RequestStatus = (typeof STATUSES)[number];
type SchoolRequest = {
  id: number; created_at: string; contact_name: string; school_name: string; city: string; teachers: number | null;
  email: string; phone: string; message: string; status: RequestStatus; note: string; school_id: string | null;
};
type SchoolRow = { id: string; name: string; city: string; seats: number; status: "active" | "ended"; paid_until: string | null; active: boolean; used: number; invites: number; admins: string[] };

/** "2026-12-31T19:59:59Z" → "2026-12-31" (Tbilisi day) for the date picker. */
function dayOf(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(Date.parse(iso) + 4 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function RequestsTab() {
  const t = useT();
  const language = useLanguage();
  const report = useAdminReport();
  const state = useAdminData<SchoolRequest[]>("/api/admin/requests");
  const [creating, setCreating] = useState<SchoolRequest | null>(null);
  return (
    <Loaded state={state}>
      {(rows) => rows.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
        <>
          <ul className="mt-4 space-y-3" data-admin-requests="">
            {rows.map((row) => (
              <RequestCard key={`${row.id}:${row.status}:${row.note}`} row={row} language={language}
                onSave={async (status, note) => {
                  if (!report(await apiPost<{ result?: string }>("/api/admin/setRequest", { id: row.id, status, note }))) return;
                  toast.success(t("admin.done"));
                  state.reload();
                }}
                onCreate={() => setCreating(row)} />
            ))}
          </ul>
          <SchoolDialog open={creating !== null} request={creating} onClose={() => setCreating(null)} onDone={state.reload} />
        </>
      )}
    </Loaded>
  );
}

function RequestCard({ row, language, onSave, onCreate }: { row: SchoolRequest; language: ReturnType<typeof useLanguage>; onSave: (status: RequestStatus, note: string) => Promise<void>; onCreate: () => void }) {
  const t = useT();
  const [status, setStatus] = useState(row.status);
  const [note, setNote] = useState(row.note);
  return (
    <li className="rounded-2xl border bg-card p-4" data-admin-request={row.id} data-admin-request-status={row.status}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{row.school_name}{row.city && <span className="font-normal text-muted-foreground"> · {row.city}</span>}</p>
          <p className="text-sm text-muted-foreground">
            {row.contact_name} · <span className="break-all">{row.email}</span>{row.phone && <> · {row.phone}</>}
            {row.teachers ? <> · {t("admin.teachersCount", { count: row.teachers })}</> : null}
          </p>
          <p className="text-xs text-muted-foreground">{formatDayOf(row.created_at, language)}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{t(`admin.request.${row.status}`)}</span>
      </div>
      {row.message && <p className="mt-2 text-[15px] whitespace-pre-wrap">{row.message}</p>}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <select className={cn(inputClasses, "w-auto")} value={status} aria-label={t("admin.status")} onChange={(event) => setStatus(event.target.value as RequestStatus)} data-admin-request-select="">
          {STATUSES.map((value) => <option key={value} value={value}>{t(`admin.request.${value}`)}</option>)}
        </select>
        <Textarea className="min-w-52 flex-1" rows={1} value={note} maxLength={1000} placeholder={t("admin.note")} aria-label={t("admin.note")} onChange={(event) => setNote(event.target.value)} data-admin-request-note="" />
        <Button variant="outline" disabled={status === row.status && note === row.note} onClick={() => void onSave(status, note)} data-admin-request-save="">{t("schoolAdmin.save")}</Button>
        {!row.school_id && (
          <Button onClick={onCreate} data-admin-request-create="">
            <Building2 aria-hidden="true" />
            {t("admin.createSchool")}
          </Button>
        )}
      </div>
    </li>
  );
}

export function SchoolsTab() {
  const t = useT();
  const language = useLanguage();
  const state = useAdminData<SchoolRow[]>("/api/admin/schools");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  return (
    <div>
      <Button className="mt-4" onClick={() => setCreating(true)} data-admin-new-school=""><Plus aria-hidden="true" />{t("admin.createSchool")}</Button>
      <Loaded state={state}>
        {(rows) => rows.length === 0 ? <p className="mt-4 text-muted-foreground">{t("admin.none")}</p> : (
          <Table data="schools" head={[t("admin.school"), t("admin.seatsCol"), t("admin.paidUntil"), t("admin.status"), t("admin.schoolAdmins"), ""]}>
            {rows.map((row) => (
              <tr key={row.id} data-admin-school={row.name}>
                <td className="px-3 py-2">{row.name}{row.city && <span className="block text-xs text-muted-foreground">{row.city}</span>}</td>
                <td className="px-3 py-2" data-admin-school-seats="">{row.used} / {row.seats}{row.invites > 0 && <span className="block text-xs text-muted-foreground">{t("admin.invitesPending", { count: row.invites })}</span>}</td>
                <td className="px-3 py-2">{row.paid_until ? formatDayOf(row.paid_until, language) : t("admin.noEnd")}</td>
                <td className="px-3 py-2">{t(row.active ? "admin.schoolActive" : "admin.schoolEnded")}</td>
                <td className="px-3 py-2 text-xs break-all">{row.admins.join(", ") || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(row)} data-admin-school-edit=""><Pencil aria-hidden="true" />{t("admin.edit")}</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
      <SchoolDialog open={creating} request={null} onClose={() => setCreating(false)} onDone={state.reload} />
      {editing && <EditSchoolDialog school={editing} onClose={() => setEditing(null)} onDone={state.reload} />}
    </div>
  );
}

/** "Create school" — empty, or filled in from a school request. */
function SchoolDialog({ open, request, onClose, onDone }: { open: boolean; request: SchoolRequest | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const report = useAdminReport();
  const [form, setForm] = useState({ name: "", city: "", seats: "", until: "", adminEmail: "" });
  const [filledFrom, setFilledFrom] = useState<number | null | undefined>(undefined);
  // Opening the window from a request fills in what the school wrote.
  if (open && filledFrom !== (request?.id ?? null)) {
    setFilledFrom(request?.id ?? null);
    setForm({ name: request?.school_name ?? "", city: request?.city ?? "", seats: request?.teachers ? String(request.teachers) : "", until: "", adminEmail: request?.email ?? "" });
  }
  const set = (key: keyof typeof form) => (value: string) => setForm((now) => ({ ...now, [key]: value }));
  function close() {
    setFilledFrom(undefined);
    onClose();
  }
  return (
    <ActionDialog open={open} title={t("admin.createSchool")} text={t("admin.createSchoolText")} submitLabel={t("admin.createSchool")} onClose={close}
      onSubmit={async (reason) => {
        const answer = await apiPost<{ data?: { admin: "member" | "invited" } }>("/api/admin/createSchool", {
          name: form.name, city: form.city, seats: Number(form.seats), paidUntil: form.until, adminEmail: form.adminEmail, requestId: request?.id ?? null, reason,
        });
        if (!report(answer)) return false;
        toast.success(t(answer.ok && answer.body.data?.admin === "member" ? "admin.schoolCreatedMember" : "admin.schoolCreatedInvited", { email: form.adminEmail }));
        setFilledFrom(undefined);
        onDone();
        return true;
      }}>
      <AdminField label={t("admin.school")}><Input value={form.name} onChange={(event) => set("name")(event.target.value)} maxLength={300} data-admin-school-name="" /></AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label={t("school.city")}><Input value={form.city} onChange={(event) => set("city")(event.target.value)} maxLength={100} /></AdminField>
        <AdminField label={t("admin.seatsCol")}><Input type="number" min={1} max={5000} value={form.seats} onChange={(event) => set("seats")(event.target.value)} data-admin-school-seats-input="" /></AdminField>
      </div>
      <AdminField label={t("admin.paidUntil")}>
        <span id="admin-school-until" className="sr-only">{t("admin.paidUntil")}</span>
        <DateField value={form.until} onChange={set("until")} labelId="admin-school-until" />
        <span className="mt-1 block text-xs text-muted-foreground">{t("admin.untilHint")}</span>
      </AdminField>
      <AdminField label={t("admin.firstAdmin")}>
        <Input type="email" value={form.adminEmail} onChange={(event) => set("adminEmail")(event.target.value)} data-admin-school-admin="" />
        <span className="mt-1 block text-xs text-muted-foreground">{t("admin.firstAdminHint")}</span>
      </AdminField>
    </ActionDialog>
  );
}

function EditSchoolDialog({ school, onClose, onDone }: { school: SchoolRow; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const report = useAdminReport();
  const [seats, setSeats] = useState(String(school.seats));
  const [until, setUntil] = useState(dayOf(school.paid_until));
  const [status, setStatus] = useState(school.status);
  return (
    <ActionDialog open title={t("admin.editSchool")} text={school.name} submitLabel={t("schoolAdmin.save")} onClose={onClose}
      onSubmit={async (reason) => {
        if (!report(await apiPost<{ result?: string }>("/api/admin/updateSchool", { id: school.id, seats: Number(seats), paidUntil: until, status, reason }))) return false;
        toast.success(t("admin.done"));
        onDone();
        return true;
      }}>
      <AdminField label={t("admin.seatsCol")}><Input type="number" min={1} max={5000} value={seats} onChange={(event) => setSeats(event.target.value)} className="w-32" data-admin-edit-seats="" /></AdminField>
      <AdminField label={t("admin.paidUntil")}>
        <span id="admin-edit-until" className="sr-only">{t("admin.paidUntil")}</span>
        <DateField value={until} onChange={setUntil} labelId="admin-edit-until" />
        <span className="mt-1 block text-xs text-muted-foreground">{t("admin.untilHint")}</span>
      </AdminField>
      <AdminField label={t("admin.status")}>
        <select className={cn(inputClasses, "w-auto")} value={status} onChange={(event) => setStatus(event.target.value as "active" | "ended")} data-admin-edit-status="">
          <option value="active">{t("admin.schoolActive")}</option>
          <option value="ended">{t("admin.schoolEnded")}</option>
        </select>
      </AdminField>
    </ActionDialog>
  );
}
