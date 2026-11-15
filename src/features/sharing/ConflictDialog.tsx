"use client";

/**
 * "Someone else changed this test." Saves carry a version number; when the
 * cloud already has a newer version, the save is refused (nothing is
 * overwritten) and this window asks which version should stay. It can't be
 * closed without choosing — otherwise the changes would hang unsaved.
 */
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/language";
import { resolveConflict } from "@/lib/storage/testsRepository";
import { useConflicts } from "@/lib/storage/useTests";

export function ConflictDialog() {
  const t = useT();
  const conflict = useConflicts()[0];
  function choose(keep: "mine" | "theirs") {
    if (!conflict) return;
    resolveConflict(conflict.id, keep);
    toast.success(t(keep === "mine" ? "conflict.kept" : "conflict.loaded"));
  }
  return (
    <Dialog open={conflict !== undefined} onOpenChange={() => undefined}>
      <DialogContent closeLabel={null} className="sm:max-w-lg" data-conflict-dialog="" onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
        {conflict && (
          <>
            <DialogTitle>{t("conflict.title")}</DialogTitle>
            <DialogDescription>{t("conflict.text", { title: conflict.mine.title || t("test.untitled") })}</DialogDescription>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-xl border p-3">
                <Button variant="outline" onClick={() => choose("theirs")} data-conflict-theirs="">{t("conflict.theirs")}</Button>
                <p className="text-sm text-muted-foreground">{t("conflict.theirsHint")}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border p-3">
                <Button onClick={() => choose("mine")} data-conflict-mine="">{t("conflict.mine")}</Button>
                <p className="text-sm text-muted-foreground">{t("conflict.mineHint")}</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
