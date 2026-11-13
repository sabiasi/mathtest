/**
 * supabase/plans.sql must match plans.ts. If this test fails, run
 * `npm run plans:sql` (it writes the file) and paste it into Supabase.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { plansSql } from "./plansSql";

const FILE = "supabase/plans.sql";

describe("supabase/plans.sql", () => {
  it("matches src/lib/plans/plans.ts", () => {
    if (process.env.WRITE_PLANS_SQL === "1") writeFileSync(FILE, plansSql());
    expect(readFileSync(FILE, "utf8"), 'plans.ts changed: run "npm run plans:sql"').toBe(plansSql());
  });
});
