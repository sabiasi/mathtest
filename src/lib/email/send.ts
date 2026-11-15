import "server-only";
import type { Language } from "@/i18n/dictionaries";
import { billingSecret, type ServerDb } from "@/lib/server/db";
import { createRateLimiter } from "@/lib/server/rateLimit";
import { renderEmail, type EmailData, type EmailKind, type RenderedEmail } from "./templates";

/**
 * Sending emails, through an "adapter" like the payment providers:
 *
 *   RESEND_API_KEY + EMAIL_FROM set → Resend (resend.com) really sends it.
 *   otherwise                       → "console": the email is only written
 *                                     to the server's log. Nothing leaves
 *                                     the computer.
 *
 * So no real email is ever sent until the owner adds a key.
 */
const env = (name: string) => (process.env[name] ?? "").trim();
export const emailMode = (): "resend" | "console" => (env("RESEND_API_KEY") && env("EMAIL_FROM") ? "resend" : "console");

export type OutgoingEmail = RenderedEmail & { to: string; kind: EmailKind };

/** The last emails "sent" by the console adapter (the sandbox page and the browser tests look here). */
const store = globalThis as { __mathtestOutbox?: (OutgoingEmail & { at: string })[] };
export const emailOutbox = () => (store.__mathtestOutbox ??= []);

async function deliver(email: OutgoingEmail): Promise<void> {
  if (emailMode() === "console") {
    const outbox = emailOutbox();
    outbox.push({ ...email, at: new Date().toISOString() });
    if (outbox.length > 200) outbox.shift();
    // In development, show it; in production without a key, say only that nothing was sent.
    if (process.env.NODE_ENV === "development") console.info(`\n[email → ${email.to}] ${email.subject}\n${email.text}\n`);
    else console.info(`MathTest: email "${email.kind}" not sent (no RESEND_API_KEY / EMAIL_FROM)`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("EMAIL_FROM"), to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!response.ok) throw new Error(`Resend answered ${response.status}`);
}

/** At most 8 emails per address per hour, whatever happens elsewhere. */
const perAddress = createRateLimiter({ limit: 8, windowMs: 60 * 60 * 1000 });

export type Notice = {
  kind: EmailKind;
  to: string | null | undefined;
  userId: string | null;
  language: Language;
  /** The same key is only ever sent once (remembered in the database's email_log). */
  dedupeKey: string;
  data: EmailData;
};

/**
 * Sends an email at most once. Never throws: a problem with email must not
 * undo a payment that was already recorded.
 */
export async function notify(db: ServerDb, notice: Notice): Promise<"sent" | "skipped" | "failed"> {
  const to = notice.to?.trim();
  if (!to || !to.includes("@")) return "skipped";
  try {
    if (!perAddress.check(to.toLowerCase()).ok) return "skipped";
    const first = await db.rpc<boolean>("email_claim", { secret: billingSecret(), uid: notice.userId, kind: notice.kind, dedupe_key: notice.dedupeKey });
    if (!first) return "skipped";
    try {
      await deliver({ ...renderEmail(notice.kind, notice.language, notice.data), to, kind: notice.kind });
      return "sent";
    } catch (error) {
      console.error(`MathTest: could not send the "${notice.kind}" email`, error);
      await db.rpc("email_release", { secret: billingSecret(), dedupe_key: notice.dedupeKey }).catch(() => undefined);
      return "failed";
    }
  } catch (error) {
    console.error("MathTest: email skipped (database)", error);
    return "failed";
  }
}
