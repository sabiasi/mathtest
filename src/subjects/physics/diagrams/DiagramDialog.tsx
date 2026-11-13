"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/language";
import type { Diagram } from "@/lib/storage/types";
import { CircuitEditor } from "./CircuitEditor";
import { StructureEditor } from "@/subjects/chemistry/structure/StructureEditor";
import { ForceEditor } from "./ForceEditor";

/**
 * The window for drawing a diagram. Changes are made on a copy ("draft")
 * and only reach the question with "Insert" / "Save"; Cancel forgets them.
 */
export function DiagramDialog({
  diagram,
  isNew,
  onSave,
  onClose,
}: {
  /** The diagram to edit; null = the window is closed. */
  diagram: Diagram | null;
  isNew: boolean;
  onSave: (diagram: Diagram) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={diagram !== null} onOpenChange={(open) => !open && onClose()}>
      {diagram && <DialogBody key={JSON.stringify(diagram)} initial={diagram} isNew={isNew} onSave={onSave} />}
    </Dialog>
  );
}

function DialogBody({ initial, isNew, onSave }: { initial: Diagram; isNew: boolean; onSave: (diagram: Diagram) => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Diagram>(initial);
  return (
    <DialogContent closeLabel={t("dialog.close")} className="sm:max-w-4xl" data-diagram-dialog={draft.kind}>
      <div>
        <DialogTitle>{t(`diagram.${draft.kind}Title`)}</DialogTitle>
        <DialogDescription>{t(`diagram.${draft.kind}Text`)}</DialogDescription>
      </div>
      {draft.kind === "circuit" && <CircuitEditor circuit={draft} onChange={setDraft} />}
      {draft.kind === "forces" && <ForceEditor diagram={draft} onChange={setDraft} />}
      {draft.kind === "structure" && <StructureEditor structure={draft} onChange={setDraft} />}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="outline">{t("dialog.cancel")}</Button>
        </DialogClose>
        <Button onClick={() => onSave(draft)} data-diagram-save="">
          {t(isNew ? "diagram.insert" : "diagram.save")}
        </Button>
      </div>
    </DialogContent>
  );
}
