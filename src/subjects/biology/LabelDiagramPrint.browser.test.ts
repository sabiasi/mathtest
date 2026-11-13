// Run against a running app:
// PRINT_TEST_URL=http://localhost:3000 npx vitest run src/subjects/biology/LabelDiagramPrint.browser.test.ts
// Uses an isolated Chrome profile and injected fixtures; no saved tests are changed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "puppeteer-core";
import { getBrowser } from "@/lib/server/chrome";
import { guestEntitlements } from "@/lib/plans/entitlements";
import { normalizeTest } from "@/lib/storage/migrate";
import { labelsForParts } from "@/lib/labelDiagram";
import { getDrawing } from "./drawings";

const origin = process.env.PRINT_TEST_URL;

describe.skipIf(!origin)("biology diagram print rendering", () => {
  let browser: Browser | undefined;
  beforeAll(async () => { browser = await getBrowser(); });
  afterAll(async () => { await browser?.close(); });

  for (const columns of [1, 2] as const) {
    for (const version of ["student", "key"] as const) {
      it(`positions boxes, numbers and matching labels in ${columns} columns (${version})`, async () => {
        const drawing = getDrawing("animal-cell");
        let id = 0;
        const labels = labelsForParts([], drawing.parts.map((p) => ({ ...p, name: p.ka })), drawing.width, drawing.height, () => `label-${++id}`);
        const test = normalizeTest({
          id: "diagram-print-regression",
          title: "ბიოლოგია",
          subjectId: "biology",
          printOptions: { columns },
          questions: ["boxes", "numbers", "match"].map((mode) => ({
            id: mode, type: "label-diagram", text: "დიაგრამაზე წარწერები",
            picture: { kind: "builtin", drawing: drawing.id },
            pictureWidth: 100, labels, mode, wordBank: true,
          })),
        })!;
        const page = await browser!.newPage();
        try {
          await page.setViewport({ width: 1280, height: 1000 });
          await page.setCacheEnabled(false);
          await page.evaluateOnNewDocument((fixture, entitlements) => {
            window.__MATHTEST_PRINT__ = { test: fixture, entitlements };
            localStorage.setItem("mathtest:theme", "light");
          }, test, guestEntitlements());
          await page.goto(`${origin}/print/${test.id}?version=${version}`, { waitUntil: "load" });
          await page.waitForSelector('[data-print-ready="true"]', { timeout: 60_000 });
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.images].map((img) => img.decode()));
          });

          for (const media of ["screen", "print"] as const) {
            await page.emulateMediaType(media);
            const areas = await page.$$eval(".sheet [data-label-area]", (elements) => elements.map((area) => {
              const bounds = area.getBoundingClientRect();
              const image = area.querySelector<HTMLImageElement>("img")!;
              return {
                imageLoaded: image.naturalWidth > 0,
                labels: [...area.querySelectorAll<HTMLElement>("[data-print-label]")].map((label) => {
                  const rect = label.getBoundingClientRect();
                  const css = getComputedStyle(label);
                  return {
                    position: css.position,
                    border: parseFloat(css.borderTopWidth),
                    // The label's centre must coincide with its pointer endpoint.
                    xError: Math.abs(rect.x + rect.width / 2 - bounds.x - bounds.width * parseFloat(label.style.left) / 100),
                    yError: Math.abs(rect.y + rect.height / 2 - bounds.y - bounds.height * parseFloat(label.style.top) / 100),
                  };
                }),
              };
            }));
            expect(areas).toHaveLength(3);
            for (const area of areas) {
              expect(area.imageLoaded).toBe(true);
              expect(area.labels).toHaveLength(labels.length);
              for (const label of area.labels) {
                expect(label.position).toBe("absolute");
                expect(label.border).toBeGreaterThan(0);
                expect(label.xError).toBeLessThan(1);
                expect(label.yError).toBeLessThan(1);
              }
            }
          }
          const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
          expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe("%PDF-");
        } finally {
          await page.close();
        }
      }, 90_000);
    }
  }
});
