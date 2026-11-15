"use client";

/**
 * "Share this test": colleagues by email (view / edit) and a view-only link.
 * `useShare()` opens it from a test card or the editor — after checking that
 * the visitor has an account and a plan with sharing (otherwise the friendly
 * Premium window opens instead).
 */
import { Copy, Link2, Link2Off, UserPlus, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { inputClasses } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlan } from "@/features/plans/PlanProvider";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { useT } from "@/i18n/language";
import { READY } from "@/lib/plans/plans";
import { createLink, removeLink, retryShares, shareTest, unshareTest } from "@/lib/sharing/sharesStore";
import { linkPath, MAX_SHARES_PER_TEST, type ShareResult } from "@/lib/sharing/sharing";
import type { ShareRole } from "@/lib/storage/testsRepository";
import { cn } from "@/lib/utils";
import { useShares } from "./useShares";

type Target = { id: string; title: string };
const ShareContext = createContext<((test: Target) => void) | null>(null);

/** Is sharing offered at all here? (built, and accounts are set up) */
export function useSharingOffered(): boolean {
  const { status } = useAuth();
  return READY.sharing && status !== "unconfigured";
}

/** Opens the share window for one of MY tests (or explains Premium / signing up). */
export function useShare(): (test: Target) => void {
  const value = useContext(ShareContext);
  if (!value) throw new Error("useShare must be used inside <ShareProvider>");
  return value;
}

export function ShareProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const close = useCallback(() => setTarget(null), []);
  const { guest } = useAuth();
  const plan = usePlan();
  const upgrade = useUpgrade();
  const { shares, links } = useShares();
  const open = useCallback(
    (test: Target) => {
      // A test that is already shared can always be opened — to STOP sharing, also after Premium ended.
      const already = shares.some((share) => share.testId === test.id) || links.some((link) => link.testId === test.id);
      // While the plan is still loading the window opens anyway (it waits, see ShareDialog).
      if (guest || (plan.ready && !plan.entitlements.features.sharing && !already)) upgrade("sharing");
      else setTarget(test);
    },
    [guest, plan.ready, plan.entitlements.features.sharing, shares, links, upgrade],
  );
  return (
    <ShareContext.Provider value={open}>
      {children}
      <ShareDialog target={target} onClose={close} />
    </ShareContext.Provider>
  );
}

function ShareDialog({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const t = useT();
  const confirm = useConfirm();
  const plan = usePlan();
  const upgrade = useUpgrade();
  const store = useShares();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("view");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const allowed = plan.entitlements.features.sharing;
  const people = target ? store.shares.filter((share) => share.testId === target.id) : [];
  const link = target ? store.links.find((item) => item.testId === target.id) : undefined;
  const address = link && typeof window !== "undefined" ? window.location.origin + linkPath(link.token) : "";
  // Opened before the plan was known: once it is, a plan without sharing (and nothing shared yet) gets the Premium window instead.
  const nothingShared = people.length === 0 && !link;
  useEffect(() => {
    if (target && plan.ready && !allowed && nothingShared && store.status === "ready") {
      onClose();
      upgrade("sharing");
    }
  }, [target, plan.ready, allowed, nothingShared, store.status, onClose, upgrade]);

  /** Shows what went wrong (in the window, next to the form); true = it worked. */
  function report(result: ShareResult): boolean {
    if (result === "ok") {
      setProblem(null);
      return true;
    }
    if (result === "premium") upgrade("sharing");
    else setProblem(t(`share.error.${result}`, { max: MAX_SHARES_PER_TEST }));
    return false;
  }
  function close() {
    setEmail("");
    setProblem(null);
    onClose();
  }
  async function add() {
    if (!target || busy) return;
    setBusy(true);
    const address = email.trim().toLowerCase();
    if (report(await shareTest(target.id, email, role))) {
      toast.success(t("share.added", { email: address }));
      setEmail("");
    }
    setBusy(false);
  }
  async function changeRole(address: string, next: ShareRole) {
    if (target && report(await shareTest(target.id, address, next))) toast.success(t("share.roleChanged"));
  }
  async function remove(address: string) {
    if (target && report(await unshareTest(target.id, address))) toast.success(t("share.removed", { email: address }));
  }
  async function makeLink() {
    if (!target || busy) return;
    setBusy(true);
    report(await createLink(target.id));
    setBusy(false);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t("share.linkCopied"));
    } catch {
      // No clipboard permission: the address is selected in the box, ready for Ctrl+C.
      document.querySelector<HTMLInputElement>("[data-share-link]")?.select();
    }
  }
  async function switchOff() {
    if (!target) return;
    if (!(await confirm({ title: t("share.linkOffTitle"), message: t("share.linkOffText"), confirmLabel: t("share.linkOff"), danger: true }))) return;
    if (report(await removeLink(target.id))) toast.success(t("share.linkOffDone"));
  }

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && close()}>
      <DialogContent closeLabel={t("dialog.close")} className="flex max-h-[92vh] flex-col overflow-y-auto sm:max-w-xl" data-share-dialog="">
        {target && (
          <>
            <DialogTitle>{t("share.title")}</DialogTitle>
            <DialogDescription>{t("share.lead", { title: target.title || t("test.untitled") })}</DialogDescription>

            {store.status === "error" ? (
              <div className="rounded-xl bg-muted/50 p-4" role="alert">
                <p>{t("share.loadError")}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={retryShares}>{t("share.retry")}</Button>
              </div>
            ) : store.status !== "ready" || !plan.ready ? (
              <p className="text-muted-foreground">{t("share.loading")}</p>
            ) : (
              <>
                {!allowed && <p className="rounded-xl border border-premium-border bg-premium-soft p-3 text-sm" data-share-paused="">{t("share.paused")}</p>}

                <section>
                  <h3 className="font-semibold">{t("share.peopleTitle")}</h3>
                  {allowed && (
                    // noValidate: our own Georgian message instead of the browser's bubble.
                    <form noValidate className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void add(); }}>
                      <label className="min-w-52 flex-1">
                        <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{t("share.email")}</span>
                        <Input type="email" inputMode="email" autoComplete="off" value={email} placeholder={t("share.emailPlaceholder")}
                          onChange={(event) => { setEmail(event.target.value); setProblem(null); }} data-share-email="" />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{t("share.role")}</span>
                        <select className={cn(inputClasses, "w-auto")} value={role} onChange={(event) => setRole(event.target.value as ShareRole)} data-share-role="">
                          <option value="view">{t("share.role.view")}</option>
                          <option value="edit">{t("share.role.edit")}</option>
                        </select>
                      </label>
                      <Button type="submit" disabled={busy || !email.trim()} data-share-add="">
                        <UserPlus className="size-4" aria-hidden="true" />
                        {t("share.add")}
                      </Button>
                    </form>
                  )}
                  {problem && <p className="mt-2 text-sm text-destructive-text" role="alert" data-share-problem="">{problem}</p>}
                  {people.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">{t("share.noPeople")}</p>
                  ) : (
                    <ul className="mt-3 divide-y rounded-xl border" data-share-people="">
                      {people.map((person) => (
                        <li key={person.email} className="flex flex-wrap items-center gap-2 px-3 py-2" data-share-person={person.email}>
                          <span className="min-w-40 flex-1 break-all">{person.email}</span>
                          <select className={cn(inputClasses, "w-auto py-1.5 text-sm")} value={person.role} disabled={!allowed} aria-label={t("share.role")}
                            onChange={(event) => void changeRole(person.email, event.target.value as ShareRole)}>
                            <option value="view">{t("share.role.view")}</option>
                            <option value="edit">{t("share.role.edit")}</option>
                          </select>
                          <IconButton label={t("share.remove", { email: person.email })} onClick={() => void remove(person.email)} data-share-remove="">
                            <X className="size-4" aria-hidden="true" />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">{t("share.emailNote")}</p>
                </section>

                <section className="border-t pt-4">
                  <h3 className="font-semibold">{t("share.linkTitle")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t("share.linkText")}</p>
                  {link ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input readOnly value={address} aria-label={t("share.linkAddress")} className="min-w-52 flex-1 text-sm" onFocus={(event) => event.target.select()} data-share-link="" />
                      <Button variant="outline" onClick={() => void copyLink()} data-share-link-copy="">
                        <Copy className="size-4" aria-hidden="true" />
                        {t("share.linkCopy")}
                      </Button>
                      <Button variant="ghost" onClick={() => void switchOff()} data-share-link-off="">
                        <Link2Off className="size-4" aria-hidden="true" />
                        {t("share.linkOff")}
                      </Button>
                    </div>
                  ) : allowed ? (
                    <Button variant="outline" className="mt-3" disabled={busy} onClick={() => void makeLink()} data-share-link-create="">
                      <Link2 className="size-4" aria-hidden="true" />
                      {t("share.linkCreate")}
                    </Button>
                  ) : null}
                </section>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
