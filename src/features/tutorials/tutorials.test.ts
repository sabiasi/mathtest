import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/i18n/dictionaries";
import { SUBJECTS } from "@/subjects/registry";
import { tutorialSrc } from "./tutorials";

// Every "How to use it?" button must have its video, in every interface language
// (recorded by `npm run tutorials`). A missing file would open an empty window.
describe("tutorial videos", () => {
  const listed = SUBJECTS.flatMap((toolkit) =>
    Object.entries(toolkit.tutorials ?? {}).map(([type, name]) => ({ subject: toolkit.id, type, name: name! })),
  );

  it("math multiple choice has one", () => {
    expect(listed).toContainEqual({ subject: "math", type: "multiple-choice", name: "math-multiple-choice" });
  });

  it.each(listed)("$subject / $type: the video exists in every language and is small", ({ subject, type, name }) => {
    expect(SUBJECTS.find((toolkit) => toolkit.id === subject)!.questionTypes).toContain(type);
    for (const language of LANGUAGES) {
      const file = join(process.cwd(), "public", tutorialSrc(name, language));
      expect(existsSync(file), file).toBe(true);
      // Teachers on school internet: keep each video under 2 MB.
      expect(statSync(file).size).toBeLessThan(2 * 1024 * 1024);
    }
  });
});
