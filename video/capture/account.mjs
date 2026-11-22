/**
 * A made-up teacher account for the promo video (the same idea as the app's e2e/account.ts).
 *
 * - Everything the page asks Supabase is answered HERE, inside the recording browser:
 *   no real account, no real data, nothing reaches the real Supabase project.
 * - Our own server never sees the pretend sign-in: page loads are fetched without the
 *   cookie, so the server treats them like a guest's (the page itself still signs in
 *   from the cookie in the browser).
 * - "Continue with Google" goes to Supabase's /auth/v1/authorize. That is answered with
 *   a plain "choose an account" page (accountPicker below). It is NOT Google's page.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function supabaseUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  for (const name of [".env", ".env.local"]) {
    const file = path.join(APP, name);
    if (!fs.existsSync(file)) continue;
    const match = fs.readFileSync(file, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m);
    if (match) url = match[1];
  }
  if (!url.startsWith("https://")) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set (.env): the sign-in scenes need it");
  return url;
}

/** A placeholder, not a person: "First name Last name". */
export const TEACHER = { name: "სახელი გვარი", email: "saxeli.gvari@gmail.com" };

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * Prepares a page for a signed-in teacher.
 *   signedIn: true  → the cookie is there from the start (most scenes)
 *   signedIn: false → call `signInNow()` later (the sign-up scene: after the account picker)
 *   subjects: null  → the teacher hasn't chosen subjects yet (the "which subjects?" window shows)
 *   tests           → tests already in the account (whole test objects)
 */
export async function teacher(page, base, { signedIn = true, subjects = ["math"], tests: initial = [] } = {}) {
  const SUPABASE = supabaseUrl();
  const uid = randomUUID();
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, email: TEACHER.email, exp: expires, iat: expires - 3600, role: "authenticated", aud: "authenticated" })}.c2lnbmF0dXJl`;
  const user = { id: uid, email: TEACHER.email, aud: "authenticated", role: "authenticated", app_metadata: { provider: "google" }, user_metadata: { full_name: TEACHER.name }, created_at: new Date().toISOString() };
  const session = { access_token: token, refresh_token: "mock-refresh", token_type: "bearer", expires_in: 3600, expires_at: expires, user };
  const cookie = `sb-${new URL(SUPABASE).hostname.split(".")[0]}-auth-token`;
  const profile = { id: uid, full_name: TEACHER.name, school_name: "", default_subject: subjects?.[0] ?? null, language: "ka", theme: "light", sample_added: false };
  let assignment = subjects ? { subjects, completed_at: new Date().toISOString() } : null;
  /** The pretend cloud: this teacher's tests, with version numbers like the real table. */
  const tests = initial.map((data) => ({ id: data.id, data, version: 1 }));

  const signInNow = () => page.context().addCookies([{ name: cookie, value: `base64-${encode(session)}`, url: base, sameSite: "Lax" }]);
  if (signedIn) await signInNow();

  // Our own pages: fetched WITHOUT the pretend cookie (the server never checks it with Supabase).
  await page.route(`${base}/**`, async (route) => {
    const request = route.request();
    try {
      if (request.isNavigationRequest() || request.headers().rsc) {
        const response = await route.fetch({ headers: { ...request.headers(), cookie: "" } });
        await route.fulfill({ response });
      } else await route.continue();
    } catch {
      // A navigation cancelled this request: nothing to answer.
    }
  });
  // Plan (if the build reads it through our server): an ordinary Free account.
  await page.route("**/api/billing/summary", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: false, testMode: false, sandbox: false, provider: "mock", signedIn: true, canChangePeriod: true, method: null, payments: [], pending: [], profile: null,
        subscription: { plan: "free", status: "active", billing_period: null, trial_ends_at: null, current_period_end: null, grace_ends_at: null, cancel_at_period_end: false, preview_free: false, provider: null, next_retry_at: null },
      }),
    }),
  );
  // Realtime ("who else is here"): nobody — the connection is simply refused.
  await page.routeWebSocket(new RegExp(`^wss?://${new URL(SUPABASE).hostname.replaceAll(".", "\\.")}/`), (socket) => socket.close());

  await page.route(`${SUPABASE}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const p = url.pathname;
    const method = request.method();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const eq = (name) => url.searchParams.get(name)?.replace(/^eq\./, "");
    if (method === "OPTIONS") return reply({});
    if (p.endsWith("/auth/v1/authorize")) return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: accountPicker(base) });
    if (p.endsWith("/rpc/all_subjects_editable")) return reply(true);
    if (p.endsWith("/teacher_subjects")) return reply(assignment ? [assignment] : []);
    if (p.endsWith("/rpc/set_teaching_subjects")) {
      const body = request.postDataJSON();
      assignment = { subjects: body.chosen, completed_at: new Date().toISOString() };
      profile.default_subject = body.preferred;
      return reply(null);
    }
    if (p.endsWith("/profiles")) {
      if (method === "PATCH") Object.assign(profile, request.postDataJSON());
      return reply(request.headers().accept?.includes("vnd.pgrst.object") ? profile : [profile]);
    }
    if (p.endsWith("/subscriptions")) return reply(request.headers().accept?.includes("vnd.pgrst.object") ? null : []);
    if (p.endsWith("/tests")) {
      const found = tests.filter((row) => !eq("id") || row.id === eq("id"));
      if (method === "GET") return reply(found.map((row) => ({ data: row.data, version: row.version })));
      if (method === "POST") {
        const row = request.postDataJSON();
        const old = tests.find((item) => item.id === row.id);
        if (old) Object.assign(old, { data: row.data, version: old.version + 1 });
        else tests.push({ id: row.id, data: row.data, version: 1 });
        return reply([{ version: old?.version ?? 1 }], 201);
      }
      if (method === "PATCH") {
        const row = found.find((item) => String(item.version) === eq("version"));
        if (!row) return reply([]);
        Object.assign(row, { data: request.postDataJSON().data, version: row.version + 1 });
        return reply([{ version: row.version }]);
      }
      if (method === "DELETE") tests.splice(0, tests.length, ...tests.filter((row) => row.id !== eq("id")));
      return reply([]);
    }
    if (p.endsWith("/rpc/my_image_storage")) return reply({ used: 0, limit: 50 * 1024 * 1024 });
    if (p.endsWith("/rpc/image_upload_allowed")) return reply(true);
    if (p.endsWith("/rpc/tests_shared_with_me")) return reply([]);
    if (p.includes("/storage/v1/object/")) return reply({ message: "not found" }, 404);
    if (p.includes("/auth/v1/token")) return reply(session);
    if (p.includes("/auth/")) return reply(user);
    return reply([]);
  });

  return { signInNow, tests };
}

/**
 * A plain "choose an account" page (Georgian), shown after "Continue with Google".
 * Deliberately NOT a copy of Google's page: neutral card, no Google logo or wording.
 */
function accountPicker(base) {
  const initial = TEACHER.name.slice(0, 1);
  return `<!doctype html><html lang="ka"><head><meta charset="utf-8"><title>ანგარიშის არჩევა</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700&display=block">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f1f3f8; font-family: "Noto Sans Georgian", sans-serif; color: #1f2937; }
  .card { width: 460px; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 36px 32px 28px; box-shadow: 0 18px 50px rgba(15,23,42,.08); }
  h1 { font-size: 24px; font-weight: 700; margin: 0 0 6px; text-align: center; }
  p { margin: 0 0 26px; text-align: center; color: #64748b; font-size: 15px; }
  p b { color: #4338ca; }
  a.account { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 14px; text-decoration: none; color: inherit; }
  a.account:hover { background: #f5f7ff; border-color: #c7d2fe; }
  .avatar { width: 46px; height: 46px; border-radius: 50%; background: #0f766e; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 20px; }
  .name { font-weight: 600; font-size: 16px; }
  .mail { color: #64748b; font-size: 14px; }
  .other { display: block; margin-top: 12px; padding: 14px 16px; border-radius: 14px; color: #64748b; font-size: 15px; text-align: center; }
</style></head><body>
<div class="card">
  <h1>აირჩიეთ ანგარიში</h1>
  <p>შესვლა <b>Rapido</b>-ში</p>
  <a class="account" data-account href="${base}/tests">
    <span class="avatar">${initial}</span>
    <span><div class="name">${TEACHER.name}</div><div class="mail">${TEACHER.email}</div></span>
  </a>
  <span class="other">სხვა ანგარიშის გამოყენება</span>
</div></body></html>`;
}
