import { SetupGate } from "@/components/SetupGate";
import { Suspense } from "react";
import { EditorView } from "@/features/editor/EditorView";
import { EditorSkeleton } from "@/features/editor/TestEditor";
import { dictionaries } from "@/i18n/dictionaries";

// [id] in the folder name means "any value here": /editor/abc → id = "abc".
//
// Next.js prepares pages ahead of time, but the id only exists once someone
// opens a link. <Suspense> says: "show the fallback until the id is known".
export default function EditorPage() {
  return (
    <Suspense fallback={<EditorSkeleton label={dictionaries.ka["editor.loading"]} />}>
      <SetupGate>
        <EditorView />
      </SetupGate>
    </Suspense>
  );
}
