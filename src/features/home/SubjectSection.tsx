"use client";

import { Check, Folder, FolderPlus, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { inputClasses } from "@/components/ui/form";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useT } from "@/i18n/language";
import { cleanFolderName, filterTests, foldersOf, gradesOf, sortTests, type SortKey } from "@/lib/myTests";
import { setTestFolder } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import type { SubjectId } from "@/subjects/ids";
import { FilterBar } from "./FilterBar";
import { addFolder, removeFolder, renameFolder, useStoredFolders } from "./folders";
import { CardGrid, NoMatches } from "./CardGrid";
import { SampleCard } from "./SampleCard";
import { TEST_DRAG_TYPE } from "./TestCard";

/**
 * One subject on "My tests": its sample first, then the teacher's tests,
 * with search, grade filter, sorting and optional folders.
 */
export function SubjectSection({ subjectId, tests, onCreate }: { subjectId: SubjectId; tests: Test[]; onCreate: () => void }) {
  const t = useT();
  const stored = useStoredFolders(subjectId);
  const folders = foldersOf(tests, stored);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  // null = every folder; "" = not in a folder.
  const [folder, setFolder] = useState<string | null>(null);
  const filtering = search.trim() !== "" || grade !== "" || folder !== null;
  const shown = sortTests(filterTests(tests, { search, grade, folder: folder !== null && !folders.includes(folder) && folder !== "" ? null : folder }), sort);
  const name = t(`subject.${subjectId}`);

  return (
    <section aria-labelledby={`subject-${subjectId}`} className="space-y-5" data-subject-section={subjectId}>
      <div className="flex flex-wrap items-center gap-3">
        <SubjectIcon id={subjectId} className="p-2.5" iconClassName="size-6" />
        <h2 id={`subject-${subjectId}`} className="text-xl font-semibold">
          {name}
        </h2>
        <span className="rounded-full bg-muted px-2.5 text-sm font-medium text-soft-foreground tabular-nums">{tests.length}</span>
        <Button className="ml-auto" onClick={onCreate} data-create-in={subjectId}>
          <Plus className="size-5" aria-hidden="true" />
          {t("home.newInSubject")}
        </Button>
      </div>

      {tests.length === 0 ? (
        <>
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed bg-card/60 px-6 py-10 text-center" data-subject-empty="">
            <SubjectIcon id={subjectId} className="p-3.5" iconClassName="size-8" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{t("home.subjectEmptyTitle", { subject: name })}</h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{t("home.subjectEmptyText")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={onCreate}>
                <Plus className="size-5" aria-hidden="true" />
                {t("home.createSubjectTest", { subject: name })}
              </Button>
              <Link href={`/editor/sample-${subjectId}`} className={buttonVariants({ variant: "outline" })}>
                {t("home.openSampleTest")}
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SampleCard subjectId={subjectId} />
          </div>
        </>
      ) : (
        <>
          <FilterBar search={search} onSearch={setSearch} grades={gradesOf(tests)} grade={grade} onGrade={setGrade} sort={sort} onSort={setSort} />
          <FolderBar subjectId={subjectId} tests={tests} folders={folders} active={folder} onSelect={setFolder} />
          {shown.length === 0 && filtering ? (
            <NoMatches
              onClear={() => {
                setSearch("");
                setGrade("");
                setFolder(null);
              }}
            />
          ) : (
            <CardGrid tests={shown} folders={folders} first={filtering ? undefined : <SampleCard subjectId={subjectId} />} />
          )}
        </>
      )}
    </section>
  );
}

/** Folder chips: choose one, drop a test card on one, make / rename / delete folders. */
function FolderBar({
  subjectId,
  tests,
  folders,
  active,
  onSelect,
}: {
  subjectId: SubjectId;
  tests: Test[];
  folders: string[];
  active: string | null;
  onSelect: (folder: string | null) => void;
}) {
  const t = useT();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const countIn = (name: string) => tests.filter((test) => test.folder === name).length;

  function moveInto(event: DragEvent, folder: string) {
    const id = event.dataTransfer.getData(TEST_DRAG_TYPE);
    if (!id) return;
    event.preventDefault();
    setTestFolder(id, folder);
    toast.success(t("home.movedTo", { folder: folder || t("home.folderNone") }));
  }

  function create(name: string) {
    const clean = addFolder(subjectId, name);
    setAdding(false);
    if (clean) onSelect(clean);
  }

  function rename(from: string, to: string) {
    setRenaming(null);
    const clean = cleanFolderName(to);
    if (!clean || clean === from) return;
    renameFolder(subjectId, from, clean);
    for (const test of tests) if (test.folder === from) setTestFolder(test.id, clean);
    if (active === from) onSelect(clean);
  }

  async function remove(name: string) {
    const ok = await confirm({ title: t("home.deleteFolder"), message: t("home.deleteFolderConfirm", { name }), confirmLabel: t("dialog.delete"), danger: true });
    if (!ok) return;
    for (const test of tests) if (test.folder === name) setTestFolder(test.id, "");
    removeFolder(subjectId, name);
    if (active === name) onSelect(null);
  }

  return (
    <div className="space-y-2" data-folder-bar="">
      <div className="flex flex-wrap items-center gap-2">
        <span className="sr-only">{t("home.folders")}</span>
        <Chip active={active === null} onClick={() => onSelect(null)} count={tests.length} data-folder-chip="*">
          {t("home.folderAll")}
        </Chip>
        {folders.length > 0 && (
          <Chip active={active === ""} onClick={() => onSelect("")} count={countIn("")} onDropTest={(e) => moveInto(e, "")} data-folder-chip="">
            {t("home.folderNone")}
          </Chip>
        )}
        {folders.map((name) =>
          renaming === name ? (
            <NameInput key={name} initial={name} onDone={(value) => rename(name, value)} onCancel={() => setRenaming(null)} />
          ) : (
            <Chip
              key={name}
              active={active === name}
              onClick={() => onSelect(name)}
              count={countIn(name)}
              onDropTest={(e) => moveInto(e, name)}
              icon={<Folder className="size-4" aria-hidden="true" />}
              menu={
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger aria-label={t("home.folderMenu")} className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => setRenaming(name)}>
                      <Pencil aria-hidden="true" />
                      {t("home.renameFolder")}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => void remove(name)}>
                      <Trash2 aria-hidden="true" />
                      {t("home.deleteFolder")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
              data-folder-chip={name}
            >
              {name}
            </Chip>
          ),
        )}
        {adding ? (
          <NameInput initial="" onDone={create} onCancel={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed px-3 text-sm font-medium text-brand hover:bg-accent pointer-coarse:h-11"
            data-new-folder=""
          >
            <FolderPlus className="size-4" aria-hidden="true" />
            {t("home.newFolder")}
          </button>
        )}
      </div>
      {folders.length > 0 && <p className="text-sm text-muted-foreground">{t("home.dragHint")}</p>}
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  children,
  icon,
  menu,
  onDropTest,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
  icon?: ReactNode;
  menu?: ReactNode;
  onDropTest?: (event: DragEvent) => void;
  "data-folder-chip"?: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-full border pr-1.5 pl-3 text-sm font-medium transition-colors pointer-coarse:h-11",
        active ? "border-primary-soft-border bg-primary-soft text-foreground" : "bg-card text-soft-foreground hover:bg-accent",
        over && "ring-2 ring-ring",
      )}
      onDragOver={(e) => {
        if (!onDropTest || !e.dataTransfer.types.includes(TEST_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDropTest?.(e);
      }}
      {...rest}
    >
      <button type="button" onClick={onClick} aria-pressed={active} className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {icon}
        {children}
        <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{count}</span>
      </button>
      {menu}
      {!menu && <span className="w-1" />}
    </span>
  );
}

/** A small "folder name" box: Enter / ✓ saves, Escape / ✕ cancels. */
function NameInput({ initial, onDone, onCancel }: { initial: string; onDone: (name: string) => void; onCancel: () => void }) {
  const t = useT();
  const [value, setValue] = useState(initial);
  return (
    <form
      className="inline-flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(value);
      }}
    >
      <input
        autoFocus
        className={cn(inputClasses, "h-9 w-48")}
        value={value}
        maxLength={60}
        aria-label={t("home.folderName")}
        placeholder={t("home.folderPlaceholder")}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        data-folder-name=""
      />
      <Button type="submit" size="icon-sm" aria-label={t("home.createFolder")} disabled={!cleanFolderName(value)}>
        <Check aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t("dialog.cancel")} onClick={onCancel}>
        <X aria-hidden="true" />
      </Button>
    </form>
  );
}
