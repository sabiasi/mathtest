import { expect, test } from "@playwright/test";
import { accountsConfigured, buy, emailKinds, openMyPlan, runJob, signIn, skipDays, skipPastPeriodEnd } from "./account";

/**
 * Payments, end to end, in TEST MODE: the mock provider's pretend bank page,
 * its signed webhook, our real SQL (in the sandbox database), the scheduled
 * job and the emails (console adapter). No real account, card or money.
 */
test.skip(!accountsConfigured, "Account UI requires a public Supabase URL configured at build time");

const plan = (page: import("@playwright/test").Page) => page.locator("[data-plan-summary]");
const billingState = (page: import("@playwright/test").Page) => page.locator("[data-billing-state]");

test("buying Premium: test-mode banner → pretend bank → Premium, card, receipt and one email", async ({ page }) => {
  await signIn(page);
  await page.goto("/pricing");
  await expect(page.locator("[data-test-mode]")).toBeVisible();
  await buy(page, "year", "success");

  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await page.locator('[data-billing-result="paid"] [data-receipt-link]').click();
  const receipt = page.locator('[data-receipt="paid"]');
  await expect(receipt.locator("[data-receipt-number]")).toContainText("MT-");
  await expect(receipt.locator("[data-receipt-total]")).toHaveText("120 ₾");
  await expect(receipt).toContainText("•••• 4242");
  // The seller's details are the owner's to fill in — and say so, instead of inventing a company.
  await expect(receipt.locator("[data-seller-todo]")).toHaveCount(6);

  await openMyPlan(page);
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "premium");
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "active");
  await expect(page.locator("[data-billing-next]")).toContainText("120 ₾");
  await expect(page.locator("[data-billing-card]")).toContainText("4242");
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(1);
  await expect.poll(() => emailKinds(page)).toEqual(["paymentReceived"]);
  // Already subscribed: the pricing page shows "your plan", not another Buy button.
  await page.goto("/pricing");
  await expect(page.locator('[data-plan="premium"]')).toContainText("თქვენი გეგმა");
  await expect(page.locator("[data-buy-premium]")).toHaveCount(0);
});

for (const [outcome, reason] of [["declined", "declined"], ["threeDsFailed", "threeDs"]] as const) {
  test(`a failed payment (${outcome}) charges nothing and changes nothing`, async ({ page }) => {
    await signIn(page);
    await buy(page, "month", outcome);
    await expect(page.locator('[data-billing-result="failed"]')).toBeVisible();
    await expect(page.locator("[data-failure-reason]")).toHaveAttribute("data-failure-reason", reason);
    await openMyPlan(page);
    await expect(plan(page)).toContainText("საცდელი პერიოდი"); // still the trial
    await expect(page.locator('[data-payment="failed"]')).toHaveCount(1);
    await expect(page.locator("[data-receipt-link]")).toHaveCount(0);
    await expect(page.locator("[data-sandbox-emails]")).toHaveCount(0);
  });
}

test("a renewal is charged when the period ends", async ({ page }) => {
  await signIn(page);
  await buy(page, "month", "success");
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);
  await runJob(page); // nothing is due yet
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(1);
  await skipPastPeriodEnd(page, 0.25);
  await runJob(page);
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(2);
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "active");
  await expect.poll(() => emailKinds(page)).toEqual(["paymentReceived", "paymentReceived"]);
});

test("failed renewal → retries → grace → Free, and the test is still there", async ({ page }) => {
  await signIn(page);
  await buy(page, "month", "successThenDecline");
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);
  await skipPastPeriodEnd(page, 0.25);
  await runJob(page);
  // The card was declined: still Premium ("grace"), with a way to pay.
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "grace");
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "premium");
  await expect(page.locator("[data-billing-pay-now]")).toBeVisible();
  await expect(page.locator('[data-payment="failed"]')).toHaveCount(1);

  await runJob(page); // the same day: no second try
  await expect(page.locator('[data-payment="failed"]')).toHaveCount(1);
  await skipDays(page, 1);
  await runJob(page); // day 1 after the period ended: first retry
  await expect(page.locator('[data-payment="failed"]')).toHaveCount(2);
  await skipDays(page, 2);
  await runJob(page); // day 3
  await expect(page.locator('[data-payment="failed"]')).toHaveCount(3);
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "premium");

  await skipDays(page, 7); // the grace period is over
  await runJob(page);
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "free");
  await expect(billingState(page)).toHaveCount(0);
  await expect.poll(async () => (await emailKinds(page)).filter((kind) => kind === "planEnded")).toHaveLength(1);
  expect((await emailKinds(page)).filter((kind) => kind === "paymentFailed")).toHaveLength(3);
  await runJob(page);
  expect((await emailKinds(page)).filter((kind) => kind === "planEnded")).toHaveLength(1); // never twice
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(1); // the receipt is kept
});

test("during the grace period the teacher can pay with another card", async ({ page }) => {
  await signIn(page);
  await buy(page, "month", "successThenDecline");
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);
  await skipPastPeriodEnd(page, 0.25);
  await runJob(page);
  await page.locator("[data-billing-pay-now]").click();
  await page.locator('[data-mock-outcome="success"]').click();
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "active");
  await expect(page.locator("[data-billing-card]")).toContainText("4242");
});

test("cancel keeps Premium until the period ends; resume undoes it; a cancelled plan ends without a charge", async ({ page }) => {
  await signIn(page);
  await buy(page, "month", "success");
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);

  await page.locator("[data-billing-cancel]").click();
  await page.locator("[data-confirm-dialog]").getByRole("button", { name: "გამოწერის გაუქმება" }).click();
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "ending");
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "premium");
  await expect.poll(() => emailKinds(page)).toContain("cancelConfirmed");

  await page.locator("[data-billing-resume]").click();
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "active");

  await page.locator("[data-billing-cancel]").click();
  await page.locator("[data-confirm-dialog]").getByRole("button", { name: "გამოწერის გაუქმება" }).click();
  await expect(billingState(page)).toHaveAttribute("data-billing-state", "ending");
  await skipPastPeriodEnd(page, 0.25);
  await runJob(page);
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "free");
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(1); // no renewal was charged
  await expect(page.locator('[data-payment="failed"]')).toHaveCount(0);
});

test("monthly → yearly applies from the next payment", async ({ page }) => {
  await signIn(page);
  await buy(page, "month", "success");
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);
  await expect(page.locator("[data-billing-next]")).toContainText("15 ₾");
  await page.locator("[data-billing]").getByRole("group").getByRole("button").nth(1).click();
  await page.locator("[data-confirm-dialog]").getByRole("button", { name: "შეცვლა" }).click();
  await expect(page.locator("[data-billing-next]")).toContainText("120 ₾");
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(1); // nothing was charged now
  await skipPastPeriodEnd(page, 0.25);
  await runJob(page);
  await expect(page.locator('[data-payment="paid"]')).toHaveCount(2);
  await expect(page.locator('[data-payment="paid"]').first()).toContainText("120 ₾");
});

test("a refund ends the plan it paid for", async ({ page }) => {
  await signIn(page);
  await buy(page, "month", "success");
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
  await openMyPlan(page);
  await page.locator("[data-sandbox-refund]").click();
  await expect(page.locator('[data-payment="refunded"]')).toHaveCount(1);
  await expect(plan(page)).toHaveAttribute("data-plan-summary", "free");
});

test("the upgrade window leads to the payment page", async ({ page }) => {
  await signIn(page);
  await page.goto("/pricing"); // the first request creates the sandbox account (with its trial)
  await expect(page.locator("[data-buy-premium]")).toBeVisible();
  // The trial is over: a Free teacher now.
  expect((await page.request.post("/api/sandbox", { data: { action: "skipDays", days: 15 } })).ok()).toBe(true);
  await page.goto("/print/sample-math");
  await page.locator("[data-footer-hint] button").click(); // "remove the footer" is a Premium feature
  const dialog = page.locator("[data-upgrade-dialog]");
  await expect(dialog).toBeVisible();
  await dialog.locator("[data-upgrade-buy]").click();
  await expect(page.locator("[data-mock-amount]")).toHaveText("15 ₾");
  await page.locator('[data-mock-outcome="success"]').click();
  await expect(page.locator('[data-billing-result="paid"]')).toBeVisible();
});

test("the server refuses what it must", async ({ page, request }) => {
  // Not signed in: no checkout, no cancel.
  for (const path of ["checkout", "cancel", "resume", "change-plan"]) {
    const response = await request.post(`/api/billing/${path}`, { data: { period: "month" } });
    expect(response.status(), path).toBe(401);
  }
  // A webhook with a wrong signature, or for a provider that isn't switched on.
  const forged = JSON.stringify({ id: "evt_forged", type: "payment.succeeded", order_id: "mt-c-00000000-0000-0000-0000-000000000000", payment_id: "x", amount: 1500 });
  expect((await request.post("/api/billing/webhook/mock", { data: forged, headers: { "x-mock-signature": "00".repeat(32), "content-type": "application/json" } })).status()).toBe(401);
  expect((await request.post("/api/billing/webhook/mock", { data: forged, headers: { "content-type": "application/json" } })).status()).toBe(401);
  expect((await request.post("/api/billing/webhook/flitt", { data: forged })).status()).toBe(404);
  expect((await request.post("/api/billing/webhook/bog", { data: forged })).status()).toBe(404);
  // The scheduled job needs its secret.
  expect((await request.post("/api/cron/billing")).status()).toBe(401);
  expect((await request.post("/api/cron/billing", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const run = await request.post("/api/cron/billing", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(run.status()).toBe(200);
  expect(await run.json()).toMatchObject({ ok: true });

  // The browser can't choose the price or the plan: only the period is read.
  const teacher = await signIn(page);
  await page.goto("/pricing");
  const answer = await page.evaluate(async () => {
    const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period: "month", amount: 1, amount_tetri: 1, plan: "school", price: 0 }) });
    return (await response.json()) as { url: string };
  });
  const session = JSON.parse(Buffer.from(new URL(answer.url).searchParams.get("session")!.split(".")[0], "base64url").toString());
  expect(session.amountTetri).toBe(1500);
  expect(teacher.email).toContain("@example.test");
  // A changed session (cheaper) is refused by the pretend bank.
  const cheaper = Buffer.from(JSON.stringify({ ...session, amountTetri: 1 })).toString("base64url");
  const signature = new URL(answer.url).searchParams.get("session")!.split(".")[1];
  const tampered = await page.evaluate(async (body) => (await fetch("/api/billing/mock/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status, { session: `${cheaper}.${signature}`, outcome: "success" });
  expect(tampered).toBe(400);
  // An unknown period is refused.
  const bad = await page.evaluate(async () => (await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period: "forever" }) })).status);
  expect(bad).toBe(400);
});

test("guests see prices and the trial offer, never a Buy button; legal pages are marked as drafts", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator('[data-plan="premium"]')).toBeVisible();
  await expect(page.locator("[data-buy-premium]")).toHaveCount(0);
  for (const path of ["/terms", "/refund", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("[data-legal-draft]"), path).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "გადახდები" })).toBeVisible();
  await page.goto("/checkout/mock?session=broken");
  await expect(page.locator("[role=alert].rounded-xl")).toBeVisible();
});
