import "server-only";
import { ONLINE_PAYMENTS } from "@/lib/plans/plans";
import { billingSecret } from "@/lib/server/db";
import { sandboxEnabled } from "@/lib/server/sandbox";
import { createBogProvider } from "./bog";
import { createFlittProvider } from "./flitt";
import { createMockProvider, type MockProvider } from "./mock";
import type { PaymentProvider, ProviderId } from "./types";

/**
 * Which payment provider is switched on, from the server's settings
 * (environment variables; see .env.example).
 *
 *   PAYMENT_PROVIDER=mock    the pretend bank. Only on your own computer
 *                            (`npm run dev`) or in the sandbox — never on a
 *                            real site, where it would hand out Premium free.
 *   PAYMENT_PROVIDER=flitt   Flitt        (+ FLITT_MERCHANT_ID, FLITT_SECRET_KEY)
 *   PAYMENT_PROVIDER=bog     Bank of Georgia (+ BOG_CLIENT_ID, BOG_CLIENT_SECRET, BOG_CALLBACK_PUBLIC_KEY)
 *   (nothing)                development: mock. Production: payments are off.
 */
const env = (name: string) => (process.env[name] ?? "").trim();

export function activeProviderId(): ProviderId | null {
  if (sandboxEnabled()) return "mock"; // the sandbox database only ever meets the pretend bank
  const chosen = env("PAYMENT_PROVIDER").toLowerCase();
  const development = process.env.NODE_ENV === "development";
  if (chosen === "flitt" || chosen === "bog") return chosen;
  if (chosen === "mock" || chosen === "") return development ? "mock" : null;
  return null;
}

/** Signs the pretend bank's messages. A built-in value is fine: mock never runs on a real site. */
const mockSecret = () => env("MOCK_PAYMENTS_SECRET") || "mock-payments-secret-for-local-use";

export function mockProvider(origin: string): MockProvider | null {
  return activeProviderId() === "mock" ? createMockProvider({ secret: mockSecret(), origin }) : null;
}

/** The provider that is switched on (null = none). `origin` = our own address, e.g. https://mathtest.ge. */
export function activeProvider(origin: string): PaymentProvider | null {
  const id = activeProviderId();
  if (id === "mock") return createMockProvider({ secret: mockSecret(), origin });
  if (id === "flitt") return createFlittProvider({ merchantId: env("FLITT_MERCHANT_ID"), secretKey: env("FLITT_SECRET_KEY") });
  if (id === "bog") {
    return createBogProvider({
      clientId: env("BOG_CLIENT_ID"),
      clientSecret: env("BOG_CLIENT_SECRET"),
      // In a one-line setting, line breaks are written as \n.
      callbackPublicKey: env("BOG_CALLBACK_PUBLIC_KEY").replace(/\\n/g, "\n"),
      testMode: env("BOG_TEST_MODE") === "1",
    });
  }
  return null;
}

export type PaymentsStatus = {
  /** Can a teacher buy right now? */
  enabled: boolean;
  provider: ProviderId | null;
  /** No real money can move (shown as a "TEST MODE" banner). */
  testMode: boolean;
  sandbox: boolean;
};

/**
 * Payments are on when a provider is chosen AND fully set up AND the
 * database secret is set. A REAL provider additionally needs the
 * ONLINE_PAYMENTS switch in plans.ts — the owner's final "go live".
 * A real provider with test credentials also waits for that switch.
 */
export function paymentsStatus(origin: string): PaymentsStatus {
  const provider = activeProvider(origin);
  const ready = Boolean(provider?.configured) && billingSecret().length > 0;
  const enabled = ready && (provider!.id === "mock" || ONLINE_PAYMENTS);
  return { enabled, provider: provider?.id ?? null, testMode: Boolean(provider?.testMode), sandbox: sandboxEnabled() };
}

/**
 * Our own public address. Set SITE_URL on the real site (the payment
 * provider must be able to reach it); otherwise the address of the request.
 */
export function siteOrigin(request: Request): string {
  const fixed = env("SITE_URL").replace(/\/+$/, "");
  if (/^https?:\/\//.test(fixed)) return fixed;
  return new URL(request.url).origin;
}
