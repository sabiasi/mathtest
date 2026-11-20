"use client";

import { HIDDEN_FOR_TESTING, OPEN_FOR_TESTING } from "@/lib/hiddenForTesting";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlan } from "@/features/plans/PlanProvider";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { useT } from "@/i18n/language";
import { activeTeachingSubjects, loadTeachingSubjects, saveTeachingSubjects, type TeachingSubjects } from "@/lib/auth/teachingSubjects";
import { moveGuestTestsIntoAccount } from "@/lib/onboarding";
import { setSubjectWriteAccess } from "@/lib/storage/testsRepository";
import { useLoadStatus } from "@/lib/storage/useTests";
import { getSupabase } from "@/lib/supabase/client";
import { SUBJECT_IDS, subjectFromText, type SubjectId } from "@/subjects/ids";
import { SubjectIcon } from "./SubjectPicker";

type Access = {
  ready: boolean;
  subjects: SubjectId[];
  /** Every subject, the teacher's own first (their default subject at the very top). */
  ordered: SubjectId[];
  assignment: TeachingSubjects | null;
  multiple: boolean;
  needsSelection: boolean;
  error: boolean;
  canEdit: (subject: SubjectId) => boolean;
  requestSubject: (subject: SubjectId) => boolean;
  manage: () => void;
  refresh: () => void;
  save: (subjects: SubjectId[], preferred: SubjectId) => Promise<boolean>;
};
const Context = createContext<Access | null>(null);

export function TeachingSubjectsProvider({ children }: { children: ReactNode }) {
  const { user, guest, status, profile, refreshProfile } = useAuth();
  const plan = usePlan();
  const upgrade = useUpgrade();
  const t = useT();
  const loadStatus = useLoadStatus();
  const userId = status === "signed-in" ? user?.id : undefined;
  const [loaded, setLoaded] = useState<{ userId: string; assignment: TeachingSubjects | null; error: boolean } | null>(null);
  // Does the DATABASE also let teachers edit every subject? (False until the owner has run
  // migrations/20261122_all_subjects_editable.sql — otherwise saves would be refused.)
  const [openInDatabase, setOpenInDatabase] = useState<{ userId: string; open: boolean } | null>(null);
  const [version, setVersion] = useState(0);
  const [requested, setRequested] = useState(false);
  const [dismissed, setDismissed] = useState("");
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadTeachingSubjects(getSupabase(), userId).then(
      (assignment) => { if (!cancelled) setLoaded({ userId, assignment, error: false }); },
      () => { if (!cancelled) setLoaded({ userId, assignment: null, error: true }); },
    );
    if (OPEN_FOR_TESTING.allSubjectsEditable) {
      void Promise.resolve(getSupabase().rpc("all_subjects_editable")).then(
        ({ data, error }) => { if (!cancelled) setOpenInDatabase({ userId, open: !error && data === true }); },
        () => { if (!cancelled) setOpenInDatabase({ userId, open: false }); },
      );
    }
    return () => { cancelled = true; };
  }, [userId, version]);

  useEffect(() => {
    if (!userId) return;
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(refresh, 60_000);
    return () => { document.removeEventListener("visibilitychange", visible); clearInterval(timer); };
  }, [userId, refresh]);

  const mine = loaded?.userId === userId ? loaded : null;
  const assignment = mine?.assignment ?? null;
  const injected = typeof window !== "undefined" && Boolean(window.__MATHTEST_PRINT__);
  const ready = guest || injected || Boolean(mine && !mine.error && plan.ready);
  const multiple = plan.entitlements.features.multipleSubjects;
  const subjects = useMemo(() => guest || injected ? [...SUBJECT_IDS] : ready ? activeTeachingSubjects(assignment, plan.entitlements) : [],
    [guest, injected, ready, assignment, plan.entitlements]);
  const needsSelection = Boolean(userId && ready && subjects.length === 0);
  const selectionKey = `${userId}:${assignment?.completedAt ?? "new"}:${multiple}`;
  // OPEN_FOR_TESTING: once the teacher has chosen their subject(s), every subject is editable.
  const openAll = OPEN_FOR_TESTING.allSubjectsEditable && subjects.length > 0 && (guest || injected || (openInDatabase?.userId === userId && openInDatabase?.open === true));
  const editable = useMemo(() => openAll ? [...SUBJECT_IDS] : subjects, [openAll, subjects]);
  const preferredSubject = subjectFromText(profile?.default_subject ?? "");
  const ordered = useMemo(() => {
    const first = preferredSubject && subjects.includes(preferredSubject) ? [preferredSubject] : [];
    return [...first, ...subjects.filter((id) => !first.includes(id)), ...SUBJECT_IDS.filter((id) => !subjects.includes(id))];
  }, [preferredSubject, subjects]);

  useEffect(() => {
    setSubjectWriteAccess(userId ?? null, editable);
  }, [userId, editable]);

  // Only eligible guest tests migrate. Others remain on the device and can be read/printed.
  useEffect(() => {
    if (!userId || !ready || !subjects.length || loadStatus !== "ready") return;
    let cancelled = false;
    void moveGuestTestsIntoAccount(editable, () => !cancelled).then((count) => {
      if (!cancelled && count) toast.success(t("guest.moved", { count }));
    }).catch(() => { if (!cancelled) toast.error(t("teaching.migrationError")); });
    return () => { cancelled = true; };
  }, [userId, ready, subjects, editable, loadStatus, t]);

  async function save(chosen: SubjectId[], preferred: SubjectId) {
    if (!userId) return false;
    try {
      await saveTeachingSubjects(getSupabase(), chosen, preferred);
      const assignment = await loadTeachingSubjects(getSupabase(), userId);
      setLoaded({ userId, assignment, error: false });
      await refreshProfile();
      setRequested(false);
      toast.success(t("teaching.saved"));
      return true;
    } catch {
      toast.error(t("teaching.saveError"));
      refresh();
      plan.refresh();
      return false;
    }
  }

  const value: Access = {
    ready, subjects, ordered, assignment, multiple, needsSelection, error: Boolean(mine?.error), refresh, save,
    canEdit: (subject) => ready && editable.includes(subject),
    manage: () => setRequested(true),
    requestSubject: (subject) => {
      if (ready && editable.includes(subject)) return true;
      if (!ready) { toast.error(t("teaching.loadError")); refresh(); return false; }
      if (needsSelection || multiple) setRequested(true);
      else upgrade("subjects");
      return false;
    },
  };

  return (
    <Context.Provider value={value}>
      {children}
      {!injected && userId && (
        <Dialog open={requested || (needsSelection && dismissed !== selectionKey)} onOpenChange={(open) => {
          setRequested(open);
          if (!open) setDismissed(selectionKey);
        }}>
          <DialogContent closeLabel={t("dialog.close")} className="sm:max-w-xl" data-teaching-dialog="">
            <div>
              <DialogTitle>{t("teaching.title")}</DialogTitle>
              <DialogDescription>{t(needsSelection && assignment ? "teaching.downgrade" : "teaching.description")}</DialogDescription>
            </div>
            {ready ? <TeachingSubjectsForm key={selectionKey + JSON.stringify(assignment?.subjects)} suggested={subjectFromText(profile?.default_subject ?? "")} /> : (
              <div role="alert"><p>{t("teaching.loadError")}</p><Button onClick={refresh}>{t("home.retry")}</Button></div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Context.Provider>
  );
}

export function useTeachingSubjects(): Access {
  const value = useContext(Context);
  if (!value) throw new Error("useTeachingSubjects requires TeachingSubjectsProvider");
  return value;
}

function TeachingSubjectsForm({ suggested }: { suggested: SubjectId | null }) {
  const access = useTeachingSubjects();
  const t = useT();
  const upgrade = useUpgrade();
  const initial = access.assignment?.subjects ?? (suggested ? [suggested] : []);
  const [selected, setSelected] = useState<SubjectId[]>(!access.multiple && initial.length > 1 ? [] : initial);
  const [preferred, setPreferred] = useState<SubjectId | "">(suggested && selected.includes(suggested) ? suggested : selected[0] ?? "");
  const [busy, setBusy] = useState(false);
  const downgrade = !access.multiple && (access.assignment?.subjects.length ?? 0) > 1;

  function toggle(id: SubjectId) {
    if (!access.multiple && access.assignment && !access.assignment.subjects.includes(id)) { upgrade("subjects"); return; }
    if (!access.multiple && access.assignment && selected.length && !selected.includes(id) && !downgrade) { upgrade("subjects"); return; }
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : !access.multiple ? [id] : [...selected, id];
    setSelected(next);
    if (!next.includes(preferred as SubjectId)) setPreferred(next[0] ?? "");
  }

  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!preferred || busy) return;
      setBusy(true);
      await access.save(selected, preferred);
      setBusy(false);
    }}>
      {(access.multiple || !HIDDEN_FOR_TESTING.premium) && <p className="text-sm text-muted-foreground">{t(access.multiple ? "teaching.multiple" : "teaching.single")}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {SUBJECT_IDS.map((id) => (
          <button key={id} type="button" aria-pressed={selected.includes(id)} data-teaching-subject={id} disabled={busy}
            onClick={() => toggle(id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left focus-visible:ring-2 focus-visible:ring-ring ${selected.includes(id) ? "border-ring bg-primary-soft" : "bg-card hover:bg-accent"}`}>
            <SubjectIcon id={id} /><span>{t(`subject.${id}`)}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && <label className="block text-sm font-medium">
        {t("settings.subject")}
        <select className="mt-2 block w-full rounded-lg border bg-card p-2" value={preferred} onChange={(e) => setPreferred(e.target.value as SubjectId)} disabled={busy}>
          {selected.map((id) => <option key={id} value={id}>{t(`subject.${id}`)}</option>)}
        </select>
      </label>}
      {!access.multiple && !HIDDEN_FOR_TESTING.premium && <Button type="button" variant="outline" onClick={() => upgrade("subjects")}>{t("teaching.addSubject")}</Button>}
      <Button type="submit" disabled={busy || !selected.length || !preferred}>{t(busy ? "editor.saving" : "settings.save")}</Button>
    </form>
  );
}

export function TeachingSubjectsSummary() {
  const access = useTeachingSubjects();
  const t = useT();
  return <div className="space-y-3" data-teaching-summary="">
    <p>{t(access.error ? "teaching.loadError" : access.needsSelection ? "teaching.choose" : "teaching.active")}</p>
    <div className="flex flex-wrap gap-2">{access.subjects.map((id) => <span key={id} className="flex items-center gap-2 rounded-xl border px-3 py-2"><SubjectIcon id={id} />{t(`subject.${id}`)}</span>)}</div>
    <Button variant="outline" onClick={access.manage}>{t("teaching.manage")}</Button>
  </div>;
}
