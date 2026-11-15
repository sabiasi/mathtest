/**
 * GET /api/templates/<id> → the template as a test (JSON).
 *
 * The plan is checked HERE: the first few templates are free for everyone
 * (guests too); the rest need a plan with all templates. The questions never
 * reach a browser that isn't allowed to use them.
 */
import { READY } from "@/lib/plans/plans";
import { guestEntitlements } from "@/lib/plans/entitlements";
import { serverDb } from "@/lib/server/db";
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";
import { templateAllowed, templateInfo } from "@/templates/catalog";
import { templateContent } from "@/templates/content";

/** Each address: 60 templates a minute (opening the library costs nothing; this stops bulk copying). */
const perIp = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });
const refuse = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request, context: RouteContext<"/api/templates/[id]">) {
  const { id } = await context.params;
  if (!perIp.check(clientIp(request.headers)).ok) return refuse(429, "tooMany");
  if (!READY.allTemplates || !templateInfo(id)) return refuse(404, "notFound");
  let entitlements = guestEntitlements();
  try {
    const db = await serverDb();
    if (db?.user) entitlements = await db.entitlements();
  } catch {
    // The plan couldn't be read: treat as Free (a bit too strict beats skippable).
  }
  if (!templateAllowed(id, entitlements.limits.templates)) return refuse(403, "premium");
  const test = templateContent(id);
  return test ? Response.json({ test }, { headers: { "Cache-Control": "private, no-store" } }) : refuse(404, "notFound");
}
