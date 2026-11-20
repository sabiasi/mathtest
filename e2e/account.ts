import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

/**
 * A made-up signed-in teacher for the browser tests of account features.
 *
 * - The browser gets a sign-in cookie that looks real; everything the page
 *   asks Supabase is answered here (no real account, no cloud data).
 * - Our own server runs in SANDBOX mode (playwright.config.ts): its billing
 *   routes use a pretend in-memory database with the real SQL, and accept
 *   this cookie. Each test gets its own random account, so tests can run
 *   side by side.
 */
function configuredUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  for (const name of [".env", ".env.local"]) {
    if (!existsSync(name)) continue;
    const match = readFileSync(name, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m);
    if (match) url = match[1];
  }
  return url;
}
export const supabaseUrl = configuredUrl();
export const accountsConfigured = supabaseUrl.startsWith("https://");

export type Teacher = { uid: string; email: string };

/**
 * A pretend cloud that several made-up teachers share (each in their own
 * browser window), for the sharing tests: tests with version numbers, who
 * shared what with whom, view-only links, and the "who else is here" rooms.
 * It imitates what the database does; the REAL rules are tested against the
 * real SQL in src/lib/sharing/sharingSql.test.ts.
 */
export type FakeCloud = {
  tests: { user_id: string; id: string; data: unknown; version: number }[];
  shares: { owner_id: string; test_id: string; email: string; role: string; created_at: string }[];
  links: { owner_id: string; test_id: string; token: string }[];
  people: Map<string, { email: string; name: string }>;
  /** Owners whose plan no longer has sharing (their shares and links stop working). */
  paused: Set<string>;
  rooms: Map<string, Set<Seat>>;
};
type Seat = { key: string; meta: Record<string, unknown> | null; send: (message: unknown[]) => void };
export const newCloud = (): FakeCloud => ({ tests: [], shares: [], links: [], people: new Map(), paused: new Set(), rooms: new Map() });

/** The "who else is here" rooms (Supabase Realtime), imitated just enough for presence and the "saved" note. */
async function fakeRealtime(page: Page, cloud: FakeCloud | undefined) {
  await page.routeWebSocket(new RegExp(`^wss?://${new URL(supabaseUrl).hostname.replaceAll(".", "\\.")}/realtime/`), (socket) => {
    // Without a shared pretend cloud nobody is there: the connection is simply refused (never the real server).
    if (!cloud) return void socket.close();
    const seats = new Map<string, Seat>();
    const everyone = (topic: string) => [...(cloud.rooms.get(topic) ?? [])];
    const leave = (topic: string) => {
      const seat = seats.get(topic);
      if (!seat) return;
      seats.delete(topic);
      cloud.rooms.get(topic)?.delete(seat);
      if (seat.meta) for (const other of everyone(topic)) other.send([null, null, topic, "presence_diff", { joins: {}, leaves: { [seat.key]: { metas: [seat.meta] } } }]);
    };
    socket.onMessage((raw) => {
      if (typeof raw !== "string") {
        // A broadcast (sent in a compact binary form): tell the others in the room that this person saved.
        for (const [topic, seat] of seats) {
          for (const other of everyone(topic)) if (other !== seat) other.send([null, null, topic, "broadcast", { type: "broadcast", event: "saved", payload: { id: seat.key, name: seat.meta?.name ?? "" } }]);
        }
        return;
      }
      const [joinRef, ref, topic, event, payload] = JSON.parse(raw) as [string | null, string | null, string, string, { config?: { presence?: { key?: string } }; event?: string; payload?: Record<string, unknown> }];
      const reply = (response: unknown = {}) => socket.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response }]));
      if (event === "phx_join") {
        const seat: Seat = { key: payload.config?.presence?.key ?? randomUUID(), meta: null, send: (message) => socket.send(JSON.stringify(message)) };
        seats.set(topic, seat);
        if (!cloud.rooms.has(topic)) cloud.rooms.set(topic, new Set());
        const state: Record<string, { metas: unknown[] }> = {};
        for (const other of everyone(topic)) if (other.meta) (state[other.key] ??= { metas: [] }).metas.push(other.meta);
        cloud.rooms.get(topic)!.add(seat);
        reply({ postgres_changes: [] });
        seat.send([null, null, topic, "presence_state", state]);
      } else if (event === "presence" && payload.event === "track") {
        const seat = seats.get(topic);
        if (seat) {
          seat.meta = { phx_ref: randomUUID(), ...payload.payload };
          for (const other of everyone(topic)) other.send([null, null, topic, "presence_diff", { joins: { [seat.key]: { metas: [seat.meta] } }, leaves: {} }]);
        }
        reply();
      } else if (event === "phx_leave") {
        leave(topic);
        reply();
      } else reply();
    });
    socket.onClose(() => { for (const topic of [...seats.keys()]) leave(topic); });
  });
}

export async function signIn(page: Page, options: { subjects?: string[]; language?: "ka" | "en"; cloud?: FakeCloud; name?: string } = {}): Promise<Teacher> {
  const uid = randomUUID();
  const email = `teacher-${uid.slice(0, 8)}@example.test`;
  const cloud = options.cloud;
  cloud?.people.set(uid, { email, name: options.name ?? "ნინო მასწავლებელი" });
  await fakeRealtime(page, cloud);
  const profile: Record<string, unknown> = { id: uid, full_name: options.name ?? "ნინო მასწავლებელი", school_name: "სატესტო სკოლა", default_subject: "math", language: options.language ?? "ka", theme: "light", sample_added: false };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, email, exp: expires, iat: expires - 3600, role: "authenticated", aud: "authenticated" })}.c2lnbmF0dXJl`;
  const user = { id: uid, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-14T10:00:00Z" };
  const session = { access_token: token, refresh_token: "mock-refresh", token_type: "bearer", expires_in: 3600, expires_at: expires, user };
  const cookie = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  await page.context().addCookies([{ name: cookie, value: `base64-${encode(session)}`, url: "http://localhost:3210", sameSite: "Lax" }]);

  const uploads = new Map<string, Buffer>();
  const bank: Record<string, unknown>[] = [];
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return reply({});
    if (path.endsWith("/rpc/all_subjects_editable")) return reply(true);
    if (path.endsWith("/teacher_subjects")) return reply([{ subjects: options.subjects ?? ["math"], completed_at: "2026-11-14T10:00:00Z" }]);
    if (path.endsWith("/profiles")) {
      // Saved profile changes are remembered for the rest of the test (also across reloads).
      if (request.method() === "PATCH") Object.assign(profile, request.postDataJSON());
      return reply(request.headers().accept?.includes("vnd.pgrst.object") ? profile : [profile]);
    }
    if (path.endsWith("/bank_questions")) {
      // The question bank: a small pretend table (the real rules are tested in src/lib/premiumSql.test.ts).
      const wanted = new URL(request.url()).searchParams.get("id")?.replace(/^eq\./, "");
      if (request.method() === "GET") return reply([...bank].reverse());
      if (request.method() === "POST") {
        const row = { ...request.postDataJSON(), id: randomUUID(), created_at: new Date().toISOString() };
        bank.push(row);
        return reply(row, 201);
      }
      const index = bank.findIndex((row) => row.id === wanted);
      if (request.method() === "PATCH" && index >= 0) Object.assign(bank[index], request.postDataJSON());
      if (request.method() === "DELETE" && index >= 0) bank.splice(index, 1);
      return reply([]);
    }
    if (cloud) {
      // ---- The shared pretend cloud (sharing tests) ----
      const query = new URL(request.url()).searchParams;
      const eq = (name: string) => query.get(name)?.replace(/^eq\./, "");
      const method = request.method();
      const body = () => request.postDataJSON() as Record<string, unknown>;
      const works = (owner: string) => !cloud.paused.has(owner);
      const myRole = (owner: string, test: string) => (works(owner) ? cloud.shares.find((share) => share.owner_id === owner && share.test_id === test && share.email === email)?.role : undefined);
      if (path.endsWith("/tests")) {
        const owner = eq("user_id") ?? uid;
        const found = cloud.tests.filter((row) => row.user_id === owner && (!eq("id") || row.id === eq("id")) && (owner === uid || myRole(owner, row.id)));
        if (method === "GET") return reply(found.map((row) => ({ data: row.data, version: row.version })));
        if (method === "POST") {
          const row = body() as { id: string; data: unknown };
          const old = cloud.tests.find((item) => item.user_id === uid && item.id === row.id);
          if (old) Object.assign(old, { data: row.data, version: old.version + 1 });
          else cloud.tests.push({ user_id: uid, id: row.id, data: row.data, version: 1 });
          return reply([{ version: old?.version ?? 1 }], 201);
        }
        if (method === "PATCH") {
          const row = found.find((item) => String(item.version) === eq("version") && (owner === uid || myRole(owner, item.id) === "edit"));
          if (!row) return reply([]);
          Object.assign(row, { data: body().data, version: row.version + 1 });
          return reply([{ version: row.version }]);
        }
        if (method === "DELETE" && owner === uid) {
          cloud.tests = cloud.tests.filter((row) => !(row.user_id === uid && row.id === eq("id")));
          cloud.shares = cloud.shares.filter((share) => !(share.owner_id === uid && share.test_id === eq("id")));
          cloud.links = cloud.links.filter((link) => !(link.owner_id === uid && link.test_id === eq("id")));
        }
        return reply([]);
      }
      if (path.endsWith("/test_shares")) {
        const same = (share: FakeCloud["shares"][number]) => share.owner_id === eq("owner_id") && (!eq("test_id") || share.test_id === eq("test_id")) && (!eq("email") || share.email === eq("email"));
        if (method === "GET") return reply(cloud.shares.filter((share) => same(share) && share.owner_id === uid));
        if (method === "POST") {
          const row = body() as { test_id: string; email: string; role: string };
          if (!works(uid)) return reply({ code: "42501", message: "new row violates row-level security policy" }, 403);
          const old = cloud.shares.find((share) => share.owner_id === uid && share.test_id === row.test_id && share.email === row.email);
          const saved = old ? Object.assign(old, { role: row.role }) : { owner_id: uid, test_id: row.test_id, email: row.email, role: row.role, created_at: new Date().toISOString() };
          if (!old) cloud.shares.push(saved);
          return reply([saved], 201);
        }
        // The owner stops sharing, or the invited teacher leaves.
        if (method === "DELETE") cloud.shares = cloud.shares.filter((share) => !(same(share) && (share.owner_id === uid || share.email === email)));
        return reply([]);
      }
      if (path.endsWith("/test_links")) {
        if (method === "GET") return reply(cloud.links.filter((link) => link.owner_id === uid));
        if (method === "POST") {
          if (!works(uid)) return reply({ code: "42501", message: "new row violates row-level security policy" }, 403);
          const link = { owner_id: uid, test_id: String(body().test_id), token: (randomUUID() + randomUUID()).replaceAll("-", "") };
          cloud.links.push(link);
          return reply([link], 201);
        }
        if (method === "DELETE") cloud.links = cloud.links.filter((link) => !(link.owner_id === uid && link.test_id === eq("test_id")));
        return reply([]);
      }
      if (path.endsWith("/rpc/tests_shared_with_me")) {
        return reply(cloud.shares.filter((share) => share.email === email && works(share.owner_id)).flatMap((share) => {
          const row = cloud.tests.find((item) => item.user_id === share.owner_id && item.id === share.test_id);
          return row ? [{ owner_id: share.owner_id, owner_name: cloud.people.get(share.owner_id)?.name ?? "", role: share.role, version: row.version, data: row.data }] : [];
        }));
      }
      if (path.endsWith("/rpc/test_by_link")) return reply(linkedTest(cloud, String(body().link_token)));
      if (path.endsWith("/rpc/shared_picture_path")) return reply(null);
    }
    if (path.endsWith("/rpc/my_image_storage")) return reply({ used: 0, limit: 50 * 1024 * 1024 });
    if (path.endsWith("/rpc/image_upload_allowed")) return reply(true);
    if (path.includes("/storage/v1/object/")) {
      // Uploads are accepted and kept in memory, so the same picture can be read back.
      const name = path.split("/").pop() ?? "";
      if (request.method() === "POST" || request.method() === "PUT") {
        uploads.set(name, request.postDataBuffer() ?? Buffer.alloc(0));
        return reply({ Key: name });
      }
      const stored = uploads.get(name);
      return stored ? route.fulfill({ status: 200, contentType: "image/png", body: stored }) : reply({ message: "not found" }, 404);
    }
    if (path.includes("/auth/v1/token")) return reply(session);
    if (path.includes("/auth/")) return reply(user);
    return reply([]);
  });
  return { uid, email };
}

function linkedTest(cloud: FakeCloud, token: string) {
  const link = cloud.links.find((item) => item.token === token && !cloud.paused.has(item.owner_id));
  const row = link && cloud.tests.find((item) => item.user_id === link.owner_id && item.id === link.test_id);
  return row ? { owner_id: row.user_id, owner_name: cloud.people.get(row.user_id)?.name ?? "", data: row.data } : null;
}

/** A visitor WITHOUT an account who can reach the pretend cloud's view-only links. */
export async function guestWithCloud(page: Page, cloud: FakeCloud) {
  await fakeRealtime(page, undefined);
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const reply = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/rpc/test_by_link")) return reply(linkedTest(cloud, String((request.postDataJSON() as { link_token?: unknown }).link_token)));
    return reply(request.method() === "OPTIONS" ? {} : null);
  });
}

/** A signed-in teacher with an editable test (a copy of the subject's sample) open in the editor. */
export async function teacherWithTest(page: Page, subject = "math", options: Parameters<typeof signIn>[1] = {}): Promise<Teacher> {
  const teacher = await signIn(page, { subjects: [subject], ...options });
  await page.goto(`/editor/sample-${subject}`);
  // "Use as template" works once the account's subjects have loaded: click until the copy opens.
  await expect(async () => {
    if (new URL(page.url()).pathname.includes("sample-")) await page.locator("[data-sample-banner] button").click({ timeout: 2000 });
    await page.waitForURL((url) => url.pathname.startsWith("/editor/") && !url.pathname.includes("sample-"), { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.locator('[data-editor-ready="true"]:visible')).toBeVisible();
  return teacher;
}

/** A new sandbox account starts with the Premium trial; this ends it (→ Free). */
export async function becomeFree(page: Page) {
  await page.request.get("/api/billing/summary"); // makes the sandbox account
  expect((await page.request.post("/api/sandbox", { data: { action: "skipDays", days: 15 } })).ok()).toBe(true);
}

/** Settings → My plan, once the plan is known. */
export async function openMyPlan(page: Page) {
  await page.goto("/settings");
  await expect(page.locator("[data-plan-summary]")).toBeVisible();
  await expect(page.locator("[data-billing]")).toBeVisible();
}

/** /pricing → "Buy" for a period → the pretend bank page → one of its buttons. */
export async function buy(page: Page, period: "month" | "year" | "schoolYear", outcome: "success" | "successThenDecline" | "declined" | "threeDsFailed") {
  await page.goto("/pricing");
  await page.locator("main").getByRole("group").first().getByRole("button").nth(["month", "year", "schoolYear"].indexOf(period)).click();
  const button = page.locator(`[data-buy-premium="${period}"]`);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator("[data-mock-checkout]")).toBeVisible();
  await page.locator(`[data-mock-outcome="${outcome}"]`).click();
}

/** The test tools under My plan (sandbox only). */
export async function skipDays(page: Page, days: 1 | 2 | 7 | 31) {
  await page.locator(`[data-sandbox-skip="${days}"]`).click();
  await expect(page.locator(`[data-sandbox-skip="${days}"]`)).toBeEnabled();
}
export async function runJob(page: Page) {
  await page.locator("[data-sandbox-job]").click();
  await expect(page.locator("[data-sandbox-job]")).toBeEnabled();
}
export const emailKinds = (page: Page) => page.locator("[data-sandbox-emails] [data-email-kind]").evaluateAll((items) => items.map((item) => item.getAttribute("data-email-kind")));

/**
 * Pretend time passed until `extraDays` AFTER the paid period ends — whatever
 * today's date is (months have 28–31 days, so a fixed "+31 days" would not do).
 */
export async function skipPastPeriodEnd(page: Page, extraDays: number) {
  const summary = (await (await page.request.get("/api/billing/summary")).json()) as { subscription: { current_period_end: string } };
  const days = (Date.parse(summary.subscription.current_period_end) - Date.now()) / 86_400_000 + extraDays;
  const response = await page.request.post("/api/sandbox", { data: { action: "skipDays", days } });
  expect(response.ok()).toBe(true);
}
