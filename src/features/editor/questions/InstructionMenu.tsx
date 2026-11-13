"use client";

import { ClipboardList } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/language";
import type { SubjectToolkit } from "@/subjects/types";

type Template = NonNullable<SubjectToolkit["instructionTemplates"]>[number];

/** "Instruction templates ▾" — one click puts a common instruction (and its Georgian version) into the question. */
export function InstructionMenu({ templates, onPick }: { templates: Template[]; onPick: (template: Template) => void }) {
  const t = useT();
  return (
    // modal={false}: see the note on Radix menus in CLAUDE.md.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 text-brand" })} data-instruction-menu="">
        <ClipboardList className="size-4" aria-hidden="true" />
        {t("questions.instructionTemplates")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-[min(32rem,90vw)] overflow-y-auto">
        {templates.map((template) => (
          <DropdownMenuItem key={template.id} onSelect={() => onPick(template)} className="flex-col items-start gap-0.5" data-template-id={template.id}>
            <span lang="en">{template.en}</span>
            <span className="text-xs text-muted-foreground">{template.ka}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
