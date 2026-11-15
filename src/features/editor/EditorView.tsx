"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import { refreshTest } from "@/lib/storage/testsRepository";
import { useRevision, useTest } from "@/lib/storage/useTests";
import { EditorSkeleton, TestEditor } from "./TestEditor";

/** The /editor/[id] page: finds the test, then shows the editor. */
export function EditorView() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const lookup = useTest(id);
  // A colleague (or another of my windows) may have changed the test since it
  // was loaded: ask the cloud for the newest copy whenever the editor opens.
  // If there is one, `revision` goes up and the editor starts again with it.
  const revision = useRevision(id);
  const found = lookup.status === "ready";
  useEffect(() => {
    if (found) void refreshTest(id);
  }, [id, found]);

  if (lookup.status === "loading") {
    return <EditorSkeleton label={t("editor.loading")} />;
  }

  if (lookup.status === "missing") {
    return (
      <PageTransition className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/tests"
          className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("editor.back")}
        </Link>
        <EmptyState
          className="mt-8"
          Icon={SearchX}
          title={t("editor.notFoundTitle")}
          text={t("editor.notFoundText")}
          actions={
            <Link href="/tests" className={buttonVariants({ variant: "outline" })}>
              {t("editor.backHome")}
            </Link>
          }
        />
      </PageTransition>
    );
  }

  // `key` makes React start a fresh editor if a different test is opened.
  return (
    <PageTransition>
      <TestEditor key={`${lookup.test.id}:${revision}`} initialTest={lookup.test} />
    </PageTransition>
  );
}
