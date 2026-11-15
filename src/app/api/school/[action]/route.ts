/**
 * The School plan, for teachers and school admins.
 *
 *   GET  /api/school/state     → { seat, invites, overview? }  (overview only for the school's admin)
 *   GET  /api/school/usage     → numbers per teacher (school admin)
 *   GET  /api/school/bank      → the school's shared questions
 *   POST /api/school/join            { code }
 *   POST /api/school/accept|decline  { invite }
 *   POST /api/school/leave
 *   POST /api/school/invite          { email, role, language }   (school admin; sends the invitation email once)
 *   POST /api/school/cancelInvite    { invite }                  (school admin)
 *   POST /api/school/remove          { member }                  (school admin)
 *   POST /api/school/setMember       { member, role, department }(school admin)
 *   POST /api/school/newCode                                     (school admin)
 *   POST /api/school/bankAdd         { subject, department, grade, type, tags, summary, data }
 *   POST /api/school/bankRemove      { id }
 *
 * Each one calls ONE database function that checks who is asking; this
 * route only reads the request, limits how often, and sends the email.
 */
import { LANGUAGES, type Language } from "@/i18n/dictionaries";
import { notify } from "@/lib/email/send";
import { siteOrigin } from "@/lib/payments/config";
import { schoolSeatFromJson } from "@/lib/plans/subscription";
import { READY } from "@/lib/plans/plans";
import { answer, guard, refuse, refuseError, text, uuid, type SignedIn } from "@/lib/schools/http";

/** Each address: 300 requests / 10 min; each teacher: 120 (joining by code is also limited by seats). */
const signedIn = guard(300, 120);

type Handler = (context: SignedIn, request: Request) => Promise<Response>;
const result = (value: unknown) => answer({ result: value });

const GET_ACTIONS: Record<string, Handler> = {
  async state({ db }) {
    const seat = schoolSeatFromJson(await db.rpc("my_school_seat"));
    const invites = await db.rpc("my_school_invites");
    const overview = seat?.role === "admin" ? await db.rpc("school_overview") : null;
    return answer({ seat, invites, overview });
  },
  usage: async ({ db }) => answer({ usage: await db.rpc("school_usage") }),
  bank: async ({ db }) => answer({ items: READY.sharedBank ? await db.rpc("school_bank_list") : [] }),
};

const POST_ACTIONS: Record<string, Handler> = {
  join: async ({ db, body }) => result(await db.rpc("join_school", { code: text(body.code, 40) })),
  accept: async ({ db, body }) => (uuid(body.invite) ? result(await db.rpc("accept_school_invite", { invite: uuid(body.invite) })) : refuse("invalid")),
  decline: async ({ db, body }) => (uuid(body.invite) ? result(await db.rpc("decline_school_invite", { invite: uuid(body.invite) })) : refuse("invalid")),
  leave: async ({ db }) => result(await db.rpc("leave_school")),
  async invite({ db, body }, request) {
    const role = body.role === "admin" ? "admin" : "teacher";
    const made = await db.rpc<{ result: string; invite_id?: string; email?: string; school?: string; inviter?: string }>("school_invite", { invite_email: text(body.email, 254), invite_role: role });
    if (made.result === "ok" && made.invite_id && made.email) {
      const language: Language = LANGUAGES.includes(body.language as Language) ? (body.language as Language) : "ka";
      const origin = siteOrigin(request);
      // Sent once per invitation (the database remembers it); in test mode it is only logged.
      await notify(db, {
        kind: "schoolInvite", to: made.email, userId: null, language, dedupeKey: `school-invite:${made.invite_id}`,
        data: { siteUrl: origin, link: `${origin}/settings#school`, school: made.school ?? "", inviter: made.inviter || made.school || "" },
      });
    }
    return result(made.result);
  },
  cancelInvite: async ({ db, body }) => (uuid(body.invite) ? result(await db.rpc("school_cancel_invite", { invite: uuid(body.invite) })) : refuse("invalid")),
  remove: async ({ db, body }) => (uuid(body.member) ? result(await db.rpc("school_remove_member", { member: uuid(body.member) })) : refuse("invalid")),
  setMember: async ({ db, body }) =>
    uuid(body.member)
      ? result(await db.rpc("school_set_member", { member: uuid(body.member), new_role: body.role === "admin" ? "admin" : "teacher", new_department: text(body.department, 80) }))
      : refuse("invalid"),
  newCode: async ({ db }) => answer({ code: await db.rpc("school_new_code") }),
  async bankAdd({ db, body }) {
    if (!READY.sharedBank || !body.data || typeof body.data !== "object") return refuse("invalid");
    const tags = Array.isArray(body.tags) ? body.tags.map((tag) => text(tag, 40)).filter(Boolean).slice(0, 12) : [];
    const id = await db.rpc<string>("school_bank_add", {
      subject: text(body.subject, 40), department: text(body.department, 80), grade: text(body.grade, 40), question_type: text(body.type, 40),
      tags, summary: text(body.summary, 300), data: body.data,
    });
    return answer({ id });
  },
  bankRemove: async ({ db, body }) => (uuid(body.id) ? result(await db.rpc("school_bank_remove", { question: uuid(body.id) })) : refuse("invalid")),
};

async function handle(request: Request, context: RouteContext<"/api/school/[action]">, actions: Record<string, Handler>) {
  const { action } = await context.params;
  const handler = Object.hasOwn(actions, action) ? actions[action] : undefined;
  if (!handler || !READY.schoolAdmin) return refuse("notFound");
  const signed = await signedIn(request);
  if (signed instanceof Response) return signed;
  try {
    return await handler(signed, request);
  } catch (error) {
    return refuseError(error, `school ${action}`);
  }
}

export const GET = (request: Request, context: RouteContext<"/api/school/[action]">) => handle(request, context, GET_ACTIONS);
export const POST = (request: Request, context: RouteContext<"/api/school/[action]">) => handle(request, context, POST_ACTIONS);
