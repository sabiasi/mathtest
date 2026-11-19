import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { unzip } from "../src/lib/docx/zip";
import { accountsConfigured, becomeFree, signIn } from "./account";

/**
 * Word (.docx) export — Premium. The file really is downloaded and opened
 * again here: it must be a valid package with real Word equations, and the
 * questions Word can't hold as text must be inside as pictures.
 */
test.describe("Word export", () => {
  test.skip(!accountsConfigured, "Account UI requires a public Supabase URL configured at build time");

  for (const version of ["student", "key"] as const) {
    test(`Premium: the ${version} paper downloads as a valid .docx`, async ({ page }) => {
      await signIn(page);
      await page.goto(`/print/sample-math?version=${version}&variant=I`);
      await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-docx-download]").click()]);
      expect(download.suggestedFilename()).toMatch(/\.docx$/);
      await expect(page.getByText("Word-ის ფაილი ჩამოიტვირთა")).toBeVisible(); // complete: every question is inside

      const parts = unzip(new Uint8Array(readFileSync(await download.path())));
      const document = new TextDecoder().decode(parts.get("word/document.xml"));
      expect([...parts.keys()][0]).toBe("[Content_Types].xml");
      expect(document).toContain("<m:oMath>"); // formulas are Word equations
      expect(document).toContain("<pic:pic"); // drawings / special questions are pictures
      expect([...parts.keys()].some((name) => /^word\/media\/image\d+\.png$/.test(name))).toBe(true);
      expect(document).not.toContain("Word-ში ვერ გადავიდა");
      expect(document.includes("პასუხები — მხოლოდ მასწავლებლისთვის")).toBe(version === "key");
      // A question picture is a real PNG of a sensible size.
      const picture = [...parts.entries()].find(([name]) => name.startsWith("word/media/"))![1];
      expect([...picture.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
      expect(picture.length).toBeGreaterThan(1000);
    });
  }

  test("Premium: all variants in one file, each on a new page", async ({ page }) => {
    await signIn(page);
    const response = await page.request.post("/api/docx", { data: { test: { id: "t", title: "ვარიანტები", subjectId: "math", questions: [{ id: "q1", type: "short-answer", points: 1, text: [{ type: "text", text: "2 + 2 = ?" }], answer: [{ type: "text", text: "4" }] }, { id: "q2", type: "open-answer", points: 2, text: [{ type: "text", text: "ახსენით." }], lines: 2 }], variants: { count: 3, shuffleQuestions: true, shuffleOptions: true, seed: 5 } }, version: "key", variant: "all", language: "ka" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("wordprocessingml");
    const document = new TextDecoder().decode(unzip(new Uint8Array(await response.body())).get("word/document.xml"));
    for (const label of ["A", "B", "C"]) expect(document).toContain(`ვარიანტი ${label}`);
    expect((document.match(/<w:pageBreakBefore\/>/g) ?? []).length).toBe(2);
  });

  test("Free: the button explains Premium, and the server refuses", async ({ page }) => {
    await signIn(page);
    await becomeFree(page);
    await page.goto("/print/sample-math");
    await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
    await page.locator("[data-docx-download]").click();
    await expect(page.locator("[data-upgrade-dialog]")).toContainText("Word");
    expect((await page.request.post("/api/docx", { data: { test: { id: "t", questions: [] } } })).status()).toBe(403);
  });

  test("guests: the button offers an account, and the server refuses", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/print/sample-math");
    await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
    await page.locator("[data-docx-download]").click();
    await expect(page.locator("[data-upgrade-dialog]")).toBeVisible();
    expect((await page.request.post("/api/docx", { data: { test: { id: "t", questions: [] } } })).status()).toBe(401);
    await context.close();
  });
});
