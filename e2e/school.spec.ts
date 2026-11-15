import { expect, test, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { accountsConfigured, newCloud, signIn, teacherWithTest } from "./account";
import { cards } from "./helpers";

/**
 * The School plan and the founders' admin page (stage 5) with made-up
 * teachers, each in their own browser window. The server runs in SANDBOX
 * mode (playwright.config.ts): the school and admin routes use the pretend
 * database loaded with the REAL schema.sql, so the real rules run here.
 * The rules themselves are tested in src/lib/schools/schoolsSql.test.ts.
 */
test.skip(!accountsConfigured, "Account UI requires a public Supabase URL configured at build time");

/** Someone signed in, in their own browser window, already known to the sandbox database. */
async function person(browser: Browser, name = "ნინო მასწავლებელი") {
  const page = await (await browser.newContext({ locale: "ka-GE", viewport: { width: 1280, height: 800 } })).newPage();
  const who = await signIn(page, { name });
  expect((await page.request.get("/api/billing/summary")).ok()).toBe(true); // makes the sandbox account
  return { page, ...who };
}
async function founder(browser: Browser) {
  const someone = await person(browser, "დამფუძნებელი");
  expect((await someone.page.request.post("/api/sandbox", { data: { action: "makeAdmin" } })).ok()).toBe(true);
  return someone;
}
/** A school made through the admin API (faster than the dialog; the dialog has its own test). */
async function schoolFor(boss: Awaited<ReturnType<typeof founder>>, adminEmail: string, seats: number) {
  const made = await boss.page.request.post("/api/admin/createSchool", {
    data: { name: `სკოლა ${randomUUID().slice(0, 6)}`, city: "თბილისი", seats, paidUntil: "", adminEmail, requestId: null, reason: "ინვოისი გადახდილია" },
  });
  expect(made.ok()).toBe(true);
}

test("a founder turns a School request into a school; its admin invites a teacher, who gets the School plan; seats are a hard limit", async ({ browser }) => {
  const boss = await founder(browser);
  const head = await person(browser, "ქეთევან დირექტორი");
  const schoolName = `საჯარო სკოლა ${randomUUID().slice(0, 6)}`;

  // The school asks on /pricing (here directly through the same route).
  const sent = await head.page.request.post("/api/school-request", {
    data: { contact_name: "ქეთევან", school_name: schoolName, city: "ქუთაისი", teachers: 2, email: head.email, phone: "", message: "გვინდა სკოლის გეგმა", language: "ka" },
  });
  expect(sent.ok()).toBe(true);

  // The founder: Admin → School requests → "Create school" (filled in from the request).
  await boss.page.goto("/admin");
  await boss.page.locator('[data-admin-tab="requests"]').click();
  const card = boss.page.locator("[data-admin-request]").filter({ hasText: schoolName });
  await expect(card).toHaveAttribute("data-admin-request-status", "new");
  await card.locator("[data-admin-request-create]").click();
  const dialog = boss.page.locator("[data-admin-dialog]");
  await expect(dialog.locator("[data-admin-school-name]")).toHaveValue(schoolName);
  await expect(dialog.locator("[data-admin-school-seats-input]")).toHaveValue("2");
  await expect(dialog.locator("[data-admin-submit]")).toBeDisabled(); // a reason is required
  await dialog.locator("[data-admin-reason]").fill("ინვოისი 2026/7 გადახდილია");
  await dialog.locator("[data-admin-submit]").click();
  await expect(boss.page.getByText("უკვე ადმინისტრატორია")).toBeVisible();
  await expect(boss.page.locator("[data-admin-request]").filter({ hasText: schoolName })).toHaveAttribute("data-admin-request-status", "won");

  // The school admin: the School plan, and the school's page.
  await head.page.goto("/settings");
  await expect(head.page.locator('[data-school-seat="admin"]')).toContainText(schoolName);
  await head.page.locator("[data-school-manage]").click();
  await expect(head.page.locator("[data-school-seats]")).toHaveAttribute("data-school-seats", "1/2");

  // Invite a teacher by email: the invitation email is "sent" (test mode: only written to the log).
  const teacher = await person(browser, "გიორგი მასწავლებელი");
  await head.page.locator("[data-school-invite-email]").fill(teacher.email.toUpperCase());
  await head.page.locator("[data-school-invite-send]").click();
  await expect(head.page.locator(`[data-school-pending-email="${teacher.email}"]`)).toBeVisible();

  // The teacher accepts in Settings → My school and has the School plan.
  await teacher.page.goto("/settings");
  await teacher.page.locator("[data-school-invite] [data-school-accept]").click();
  await expect(teacher.page.locator('[data-school-seat="teacher"]')).toContainText(schoolName);
  await expect(teacher.page.locator('[data-school-active="true"]')).toBeVisible();
  const plan = await (await teacher.page.request.get("/api/billing/summary")).json() as { school: { name: string } };
  expect(plan.school.name).toBe(schoolName);

  // Both seats are taken: a third teacher with the code is turned away kindly.
  await head.page.reload();
  await expect(head.page.locator("[data-school-seats]")).toHaveAttribute("data-school-seats", "2/2");
  const code = (await head.page.locator("[data-school-join-code]").textContent())!.trim();
  const late = await person(browser, "ლევან");
  await late.page.goto("/settings");
  await late.page.locator("[data-school-code]").fill(code);
  await late.page.locator("[data-school-join]").click();
  await expect(late.page.getByText("თავისუფალი ადგილი აღარ არის")).toBeVisible();
  await expect(late.page.locator("[data-school-seat]")).toHaveCount(0);

  // Usage shows numbers per teacher; removing the teacher gives back their own plan.
  await expect(head.page.locator(`[data-usage-row="${teacher.email}"] [data-usage-tests]`)).toHaveText("0");
  await head.page.locator(`[data-school-member="${teacher.email}"] [data-member-remove]`).click();
  await head.page.locator("[data-confirm-dialog] button").last().click();
  await expect(head.page.locator(`[data-school-member="${teacher.email}"]`)).toHaveCount(0);
  await teacher.page.reload();
  await expect(teacher.page.locator("[data-school-code]")).toBeVisible();
});

test("the school admin manages roles and departments; the last admin can't step down", async ({ browser }) => {
  const boss = await founder(browser);
  const head = await person(browser, "ქეთევან დირექტორი");
  await schoolFor(boss, head.email, 5);
  await head.page.goto("/school");
  const me = head.page.locator(`[data-school-member="${head.email}"]`);
  await me.locator("[data-member-department]").fill("მათემატიკის კათედრა");
  await me.locator("[data-member-save]").click();
  await expect(head.page.getByText("შეინახა")).toBeVisible();
  await head.page.reload();
  await expect(me.locator("[data-member-department]")).toHaveValue("მათემატიკის კათედრა");
  await me.locator("[data-member-role]").selectOption("teacher");
  await me.locator("[data-member-save]").click();
  await expect(head.page.getByText("ერთი ადმინისტრატორი მაინც")).toBeVisible();
});

test("founders: gift Premium, back to Free, extend a trial — each needs a reason and lands in the log", async ({ browser }) => {
  const boss = await founder(browser);
  const teacher = await person(browser, "მარიამ");
  await boss.page.goto("/admin");
  await expect(boss.page.locator('[data-admin-stat="users"]')).toBeVisible();
  await boss.page.locator('[data-admin-tab="users"]').click();
  await boss.page.locator("[data-admin-search]").fill(teacher.email);
  await boss.page.locator("[data-admin-search]").press("Enter");
  const row = boss.page.locator(`[data-admin-user="${teacher.email}"]`);
  await expect(row.locator("[data-admin-plan-now]")).toHaveAttribute("data-admin-plan-now", "premium"); // the sign-up trial

  const act = async (item: string, reason: string) => {
    await row.locator("[data-admin-user-menu]").click();
    await boss.page.locator(item).click();
    await boss.page.locator("[data-admin-reason]").fill(reason);
    await boss.page.locator("[data-admin-submit]").click();
  };
  await act("[data-admin-free]", "ტესტის ანგარიში");
  await expect(row.locator("[data-admin-plan-now]")).toHaveAttribute("data-admin-plan-now", "free");
  await act("[data-admin-gift]", "პილოტის მასწავლებელი");
  await expect(row.locator("[data-admin-plan-now]")).toHaveAttribute("data-admin-plan-now", "premium");
  // A trial can't be put over a (gifted) subscription.
  await act("[data-admin-trial]", "მოგვწერა ელფოსტით");
  await expect(boss.page.getByText("საცდელი პერიოდის გაგრძელება არ შეიძლება")).toBeVisible();

  // The teacher really has Premium now (worked out on the server).
  const summary = await (await teacher.page.request.get("/api/billing/summary")).json() as { subscription: { plan: string; provider: string } };
  expect(summary.subscription).toMatchObject({ plan: "premium", provider: "manual" });

  await boss.page.keyboard.press("Escape");
  await boss.page.locator('[data-admin-tab="log"]').click();
  await expect(boss.page.locator('[data-admin-log="plan.set"]').filter({ hasText: "პილოტის მასწავლებელი" })).toBeVisible();
  await expect(boss.page.locator('[data-admin-log="plan.set"]').filter({ hasText: "ტესტის ანგარიში" })).toBeVisible();
});

test("everyone else: /admin looks like a missing page, and the admin API answers 404", async ({ page, browser }) => {
  await signIn(page);
  await page.goto("/admin");
  await expect(page.locator("[data-admin-denied]")).toBeVisible();
  await expect(page.locator("[data-admin]")).toHaveCount(0);
  for (const path of ["overview", "users", "revenue", "log"]) expect((await page.request.get(`/api/admin/${path}`)).status()).toBe(404);
  const gift = await page.request.post("/api/admin/setPlan", { data: { userId: randomUUID(), plan: "premium", endsAt: "", reason: "free stuff" } });
  expect(gift.status()).toBe(404);
  // Signed out: the page asks to sign in; the API refuses.
  const stranger = await (await browser.newContext()).newPage();
  expect((await stranger.request.get("/api/admin/overview")).status()).toBe(401);
  // The school pages are only for school admins.
  await page.goto("/school");
  await expect(page.getByText("ეს გვერდი სკოლის ადმინისტრატორისთვისაა")).toBeVisible();
});

test("the school's shared question bank: a teacher shares a question, colleagues see it, the admin can take it out", async ({ page, browser }) => {
  const boss = await founder(browser);
  const head = await person(browser, "ქეთევან დირექტორი");
  await schoolFor(boss, head.email, 5);
  const state = await (await head.page.request.get("/api/school/state")).json() as { overview: { school: { join_code: string } } };

  // A teacher with a test joins with the code, then shares the first question.
  // The pretend cloud keeps the test across the reload below.
  await teacherWithTest(page, "math", { name: "გიორგი მასწავლებელი", cloud: newCloud() });
  expect(await (await page.request.post("/api/school/join", { data: { code: state.overview.school.join_code } })).json()).toEqual({ result: "ok" });
  await page.reload();
  await cards(page).first().locator("[data-question-menu]").click();
  await page.locator("[data-share-with-school]").click();
  await expect(page.getByText("კითხვა სკოლის ბანკში შეინახა")).toBeVisible();

  // The head teacher sees it in the school bank and takes it out.
  await head.page.goto("/school/bank");
  const item = head.page.locator("[data-school-bank] [data-bank-item]");
  await expect(item).toHaveCount(1);
  // Someone else's question (the sandbox has no profile names, so it says "a colleague").
  await expect(item.locator("[data-school-bank-author]")).toHaveText("ავტორი: კოლეგა");
  await item.locator("[data-school-bank-remove]").click();
  await head.page.locator("[data-confirm-dialog] button").last().click();
  await expect(head.page.locator("[data-school-bank] [data-bank-item]")).toHaveCount(0);

  // Someone outside the school can't read the school bank.
  const outsider = await person(browser, "სხვა");
  expect(await (await outsider.page.request.get("/api/school/bank")).json()).toEqual({ items: [] });
});
