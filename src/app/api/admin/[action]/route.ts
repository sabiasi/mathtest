/**
 * The founders' admin page (/admin). Founders = rows of public.admins.
 *
 * Checked TWICE on the server: this route asks the database `am_i_admin()`
 * first (anyone else gets 404, as if the page didn't exist), and every
 * admin_* database function checks the admins table again itself. Every
 * change needs a written reason and is stored in admin_log.
 *
 *   GET  /api/admin/check | overview | users?search=&kind=&page= | revenue | failed | ai | requests | schools | log
 *   POST /api/admin/setRequest   { id, status, note }
 *   POST /api/admin/createSchool { name, city, seats, paidUntil, adminEmail, requestId, reason }
 *   POST /api/admin/updateSchool { id, seats, paidUntil, status, reason }
 *   POST /api/admin/setPlan      { userId, plan: "premium" | "free", endsAt, reason }
 *   POST /api/admin/extendTrial  { userId, days, reason }
 */
import { answer, dateOrNull, guard, int, refuse, refuseError, text, uuid, type SignedIn } from "@/lib/schools/http";

/** Each address: 600 requests / 10 min; each founder: 400. */
const signedIn = guard(600, 400);

type Handler = (context: SignedIn, url: URL) => Promise<Response>;
const read = (fn: string) => (async ({ db }: SignedIn) => answer({ data: await db.rpc(fn) })) satisfies Handler;
const result = (value: unknown) => answer({ result: value });

const GET_ACTIONS: Record<string, Handler> = {
  check: async () => answer({ admin: true }),
  overview: read("admin_overview"),
  users: async ({ db }, url) => answer({ data: await db.rpc("admin_users", {
    search: text(url.searchParams.get("search"), 200),
    kind: ["all", "trial", "paying", "gifted", "free", "school", "grace"].includes(url.searchParams.get("kind") ?? "") ? url.searchParams.get("kind") : "all",
    page: int(url.searchParams.get("page"), 0, 10_000) ?? 0,
  }) }),
  revenue: read("admin_revenue"),
  failed: read("admin_failed_payments"),
  ai: read("admin_ai_usage"),
  requests: read("admin_school_requests"),
  schools: read("admin_schools"),
  log: read("admin_log_list"),
};

const POST_ACTIONS: Record<string, Handler> = {
  async setRequest({ db, body }) {
    const id = int(body.id, 1, Number.MAX_SAFE_INTEGER);
    return id ? result(await db.rpc("admin_set_request", { request: id, new_status: text(body.status, 20), new_note: text(body.note, 1000) })) : refuse("invalid");
  },
  async createSchool({ db, body }) {
    const seats = int(body.seats, 1, 5000);
    const paidUntil = dateOrNull(body.paidUntil);
    if (!seats || paidUntil === undefined) return refuse("invalid");
    const requestId = body.requestId == null || body.requestId === "" ? null : int(body.requestId, 1, Number.MAX_SAFE_INTEGER);
    return answer({ data: await db.rpc("admin_create_school", {
      school_name: text(body.name, 300), city: text(body.city, 100), seats, paid_until: paidUntil,
      admin_email: text(body.adminEmail, 254), request: requestId, reason: text(body.reason),
    }) });
  },
  async updateSchool({ db, body }) {
    const seats = int(body.seats, 1, 5000);
    const paidUntil = dateOrNull(body.paidUntil);
    if (!uuid(body.id) || !seats || paidUntil === undefined) return refuse("invalid");
    return result(await db.rpc("admin_update_school", { school: uuid(body.id), seats, paid_until: paidUntil, new_status: body.status === "ended" ? "ended" : "active", reason: text(body.reason) }));
  },
  async setPlan({ db, body }) {
    const endsAt = dateOrNull(body.endsAt);
    if (!uuid(body.userId) || endsAt === undefined || (body.plan !== "premium" && body.plan !== "free")) return refuse("invalid");
    return result(await db.rpc("admin_set_plan", { uid: uuid(body.userId), new_plan: body.plan, ends_at: body.plan === "free" ? null : endsAt, reason: text(body.reason) }));
  },
  async extendTrial({ db, body }) {
    const days = int(body.days, 1, 120);
    return uuid(body.userId) && days ? result(await db.rpc("admin_extend_trial", { uid: uuid(body.userId), days, reason: text(body.reason) })) : refuse("invalid");
  },
};

async function handle(request: Request, context: RouteContext<"/api/admin/[action]">, actions: Record<string, Handler>) {
  const { action } = await context.params;
  const handler = Object.hasOwn(actions, action) ? actions[action] : undefined;
  if (!handler) return refuse("notFound");
  const signed = await signedIn(request);
  if (signed instanceof Response) return signed;
  try {
    // Not a founder → "not found": the page gives nothing away.
    if (!(await signed.db.rpc<boolean>("am_i_admin"))) return refuse("notFound");
    return await handler(signed, new URL(request.url));
  } catch (error) {
    return refuseError(error, `admin ${action}`);
  }
}

export const GET = (request: Request, context: RouteContext<"/api/admin/[action]">) => handle(request, context, GET_ACTIONS);
export const POST = (request: Request, context: RouteContext<"/api/admin/[action]">) => handle(request, context, POST_ACTIONS);
