// @vitest-environment node
import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bogEvent, createBogProvider, verifyBogSignature, BOG_SIGNATURE_HEADER, BOG_TOKEN_URL } from "./bog";
import { createFlittProvider, flittEvent, flittSignature, flittSignatureString, readFlittBody } from "./flitt";
import { MOCK_DECLINING_TOKEN, MOCK_SIGNATURE_HEADER, createMockProvider } from "./mock";
import type { CheckoutRequest } from "./types";

const checkout: CheckoutRequest = {
  orderId: "mt-c-11111111-2222-3333-4444-555555555555",
  amountTetri: 1500,
  period: "month",
  description: "Rapido Premium (1 mo.)",
  email: "teacher@example.test",
  language: "ka",
  callbackUrl: "https://mathtest.example/api/billing/webhook/x",
  returnUrl: "https://mathtest.example/api/billing/return/x?order=1",
};
const input = (rawBody: string, headers: Record<string, string> = {}) => ({ rawBody, headers: new Headers(headers) });

/** A pretend server: records what was sent and answers from a list. */
function fakeFetch(answers: { status?: number; body: unknown }[]) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const send = (async (url: string | URL | Request, init?: RequestInit) => {
    const text = typeof init?.body === "string" ? init.body : "";
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* a form body stays text */ }
    calls.push({ url: String(url), method: init?.method ?? "GET", headers: Object.fromEntries(new Headers(init?.headers).entries()), body });
    const answer = answers.shift() ?? { body: {} };
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
  }) as typeof fetch;
  return { send, calls };
}

describe("Flitt", () => {
  // The worked example from docs.flitt.com/api/building-signature.
  const documented = { order_id: "TestOrder2", order_desc: "Test payment", currency: "GEL", amount: 1000, merchant_id: 1549901, server_callback_url: "http://myshop/callback/" };

  it("builds the documented signature string, and its SHA-1", () => {
    expect(flittSignatureString("test", documented)).toBe("test|1000|GEL|1549901|Test payment|TestOrder2|http://myshop/callback/");
    // SHA-1 of exactly that string, computed independently with `openssl dgst -sha1`.
    // (The hash printed next to this example in Flitt's documentation, 91ea7da4…, is NOT the SHA-1 of
    // their own string — so the real check is a test payment with their test merchant: see docs/GO_LIVE.md.)
    expect(flittSignature("test", documented)).toBe("cd0edb710cbbdb6c2a4d965cdb91fdfabc343215");
  });

  it("leaves out empty values and the signature fields, keeps 0", () => {
    const base = flittSignature("test", { a: "x", b: 0 });
    expect(flittSignature("test", { a: "x", b: 0, c: "", d: null, e: undefined, signature: "zzz", response_signature_string: "debug" })).toBe(base);
    expect(flittSignature("test", { a: "x" })).not.toBe(base);
    expect(flittSignature("other", { a: "x", b: 0 })).not.toBe(base);
  });

  const callback = (changes: Record<string, unknown> = {}) => {
    const data: Record<string, unknown> = {
      order_id: checkout.orderId, merchant_id: 1549901, amount: "1500", currency: "GEL", order_status: "approved", response_status: "success",
      payment_id: 805243692, masked_card: "444455XXXXXX1111", card_type: "VISA", rectoken: "da39a3ee5e6b4b0d", reversal_amount: "0", tran_type: "purchase", ...changes,
    };
    return { ...data, signature: flittSignature("test", data) };
  };
  const flitt = createFlittProvider({ merchantId: "1549901", secretKey: "test" });

  it("accepts a correctly signed callback (JSON or form) and refuses a changed one", () => {
    const message = callback();
    expect(flitt.verifyWebhook(input(JSON.stringify(message)))).toBe(true);
    expect(flitt.verifyWebhook(input(new URLSearchParams(Object.entries(message).map(([k, v]) => [k, String(v)])).toString()))).toBe(true);
    expect(flitt.verifyWebhook(input(JSON.stringify({ ...message, amount: "1" })))).toBe(false);
    expect(flitt.verifyWebhook(input(JSON.stringify({ ...message, signature: "" })))).toBe(false);
    expect(flitt.verifyWebhook(input("not json at all"))).toBe(false);
    expect(createFlittProvider({ merchantId: "1549901", secretKey: "another" }).verifyWebhook(input(JSON.stringify(message)))).toBe(false);
  });

  it("turns callbacks into our events", () => {
    expect(flitt.parseEvent(input(JSON.stringify(callback())))).toEqual({
      type: "payment_succeeded", eventId: `${checkout.orderId}:approved:805243692:0`, orderId: checkout.orderId, providerPaymentId: "805243692",
      amountTetri: 1500, card: { last4: "1111", brand: "visa", expiry: null }, cardToken: "da39a3ee5e6b4b0d", failureReason: null,
    });
    expect(flittEvent(callback({ order_id: "mt-r-abc" })).type).toBe("subscription_renewed");
    expect(flittEvent(callback({ order_status: "declined", response_description: "Insufficient funds" }))).toMatchObject({ type: "payment_failed", failureReason: "Insufficient funds" });
    expect(flittEvent(callback({ order_status: "expired" })).type).toBe("payment_failed");
    expect(flittEvent(callback({ order_status: "reversed", reversal_amount: "1500" })).type).toBe("refunded");
    expect(flittEvent(callback({ order_status: "processing" })).type).toBe("ignored");
    expect(flittEvent(callback({ reversal_amount: "500" })).type).toBe("ignored"); // partial refund: by hand
    expect(readFlittBody(JSON.stringify({ response: { order_id: "x" } }))).toEqual({ order_id: "x" });
  });

  it("creates a signed checkout that asks for a card token", async () => {
    const { send, calls } = fakeFetch([{ body: { response: { response_status: "success", checkout_url: "https://pay.flitt.com/merchants/x/default/index.html?token=abc", payment_id: "1" } } }]);
    const session = await createFlittProvider({ merchantId: "1549901", secretKey: "test", fetch: send }).createCheckout(checkout);
    expect(session.url).toContain("https://pay.flitt.com/");
    const sent = (calls[0].body as { request: Record<string, unknown> }).request;
    expect(calls[0].url).toBe("https://pay.flitt.com/api/checkout/url");
    expect(sent).toMatchObject({ order_id: checkout.orderId, amount: 1500, currency: "GEL", merchant_id: 1549901, required_rectoken: "Y", server_callback_url: checkout.callbackUrl, response_url: checkout.returnUrl, lang: "ka" });
    expect(sent.signature).toBe(flittSignature("test", sent));
  });

  it("reports a refused checkout, and charges renewals with the saved token", async () => {
    const refused = fakeFetch([{ body: { response: { response_status: "failure", error_message: "Merchant not found", error_code: 1016 } } }]);
    await expect(createFlittProvider({ merchantId: "1", secretKey: "k", fetch: refused.send }).createCheckout(checkout)).rejects.toThrow(/Merchant not found/);

    const answer = callback({ order_id: "mt-r-1", rectoken: "" });
    const { send, calls } = fakeFetch([{ body: { response: answer } }, { body: { response: { ...answer, amount: "1" } } }]);
    const provider = createFlittProvider({ merchantId: "1549901", secretKey: "test", fetch: send });
    const renewal = { orderId: "mt-r-1", amountTetri: 1500, description: "x", cardToken: "tok", callbackUrl: checkout.callbackUrl };
    expect(await provider.chargeRenewal(renewal)).toMatchObject({ type: "subscription_renewed", orderId: "mt-r-1", amountTetri: 1500 });
    expect(calls[0].url).toBe("https://pay.flitt.com/api/recurring");
    expect((calls[0].body as { request: Record<string, unknown> }).request.rectoken).toBe("tok");
    // An answer whose signature doesn't match is never believed.
    await expect(provider.chargeRenewal(renewal)).rejects.toThrow(/signature/);
  });

  it("knows the test merchant and when it is not set up", () => {
    expect(flitt).toMatchObject({ testMode: true, configured: true, canChangeAmount: true });
    expect(createFlittProvider({ merchantId: "", secretKey: "" }).configured).toBe(false);
    expect(createFlittProvider({ merchantId: "999", secretKey: "live" }).testMode).toBe(false);
  });
});

describe("Bank of Georgia", () => {
  // Our own key pair stands in for the bank's: the bank signs with its private key, we check with the public one.
  const bank = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKey = bank.publicKey.export({ type: "spki", format: "pem" }).toString();
  const sign = (body: string) => createSign("RSA-SHA256").update(body, "utf8").sign(bank.privateKey, "base64");
  const message = (status = "completed", changes: Record<string, unknown> = {}) =>
    JSON.stringify({
      event: "order_payment",
      zoned_request_time: "2026-11-15T10:00:00.000000Z",
      body: {
        order_id: "bog-order-1", external_order_id: checkout.orderId, order_status: { key: status, value: status },
        purchase_units: { request_amount: "15.00", transfer_amount: "15.00", refund_amount: "0.00", currency_code: "GEL" },
        payment_detail: { transfer_method: { key: "card" }, transaction_id: "tr-1", payer_identifier: "548888xxxxxx9893", card_type: "mc", card_expiry_date: "03/27", code: "100", code_description: "Successful payment" },
        ...changes,
      },
    });
  const provider = (send?: typeof fetch) => createBogProvider({ clientId: "id", clientSecret: "secret", callbackPublicKey: publicKey, fetch: send });

  it("checks the RSA-SHA256 signature of the exact bytes", () => {
    const body = message();
    expect(verifyBogSignature(publicKey, body, sign(body))).toBe(true);
    expect(verifyBogSignature(publicKey, body + " ", sign(body))).toBe(false);
    expect(verifyBogSignature(publicKey, body, "")).toBe(false);
    expect(verifyBogSignature(publicKey, body, "not-base64!")).toBe(false);
    expect(verifyBogSignature("", body, sign(body))).toBe(false);
    expect(verifyBogSignature("-----BEGIN PUBLIC KEY-----\nbroken\n-----END PUBLIC KEY-----", body, sign(body))).toBe(false);
    const stranger = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(verifyBogSignature(publicKey, body, createSign("RSA-SHA256").update(body).sign(stranger.privateKey, "base64"))).toBe(false);
    expect(provider().verifyWebhook(input(body, { [BOG_SIGNATURE_HEADER]: sign(body) }))).toBe(true);
    expect(provider().verifyWebhook(input(body))).toBe(false);
  });

  it("turns callbacks into our events", () => {
    expect(provider().parseEvent(input(message()))).toEqual({
      type: "payment_succeeded", eventId: "bog-order-1:completed", orderId: checkout.orderId, providerPaymentId: "bog-order-1",
      amountTetri: 1500, card: { last4: "9893", brand: "mc", expiry: "03/27" }, cardToken: "bog-order-1", failureReason: null,
    });
    expect(bogEvent(JSON.parse(message("completed", { external_order_id: "mt-r-9" })))).toMatchObject({ type: "subscription_renewed", cardToken: null });
    expect(bogEvent(JSON.parse(message("rejected", { reject_reason: "expiration" })))).toMatchObject({ type: "payment_failed", failureReason: "expiration", cardToken: null });
    expect(bogEvent(JSON.parse(message("refunded"))).type).toBe("refunded");
    for (const status of ["created", "processing", "refund_requested", "refunded_partially", "blocked"]) expect(bogEvent(JSON.parse(message(status))).type, status).toBe("ignored");
    expect(bogEvent(null)).toMatchObject({ type: "ignored", orderId: "" });
  });

  it("signs in, creates the order in lari and saves the card before the redirect", async () => {
    const { send, calls } = fakeFetch([
      { body: { access_token: "jwt", token_type: "Bearer", expires_in: 1634719923245 } },
      { body: { id: "bog-order-1", _links: { redirect: { href: "https://payment.bog.ge/?order_id=bog-order-1" }, details: { href: "https://api.bog.ge/payments/v1/receipt/bog-order-1" } } } },
      { status: 202, body: {} },
    ]);
    const session = await provider(send).createCheckout(checkout);
    expect(session).toEqual({ url: "https://payment.bog.ge/?order_id=bog-order-1", providerPaymentId: "bog-order-1" });
    expect(calls[0]).toMatchObject({ url: BOG_TOKEN_URL, method: "POST", body: "grant_type=client_credentials" });
    expect(calls[0].headers.authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(calls[1].url).toBe("https://api.bog.ge/payments/v1/ecommerce/orders");
    expect(calls[1].headers.authorization).toBe("Bearer jwt");
    expect(calls[1].body).toMatchObject({ callback_url: checkout.callbackUrl, external_order_id: checkout.orderId, purchase_units: { currency: "GEL", total_amount: 15, basket: [{ quantity: 1, unit_price: 15 }] } });
    expect(calls[2]).toMatchObject({ url: "https://api.bog.ge/payments/v1/orders/bog-order-1/subscriptions", method: "PUT" });
  });

  it("charges a renewal against the first order and waits for the callback", async () => {
    const { send, calls } = fakeFetch([{ body: { access_token: "jwt" } }, { body: { id: "bog-order-2" } }]);
    const event = await provider(send).chargeRenewal({ orderId: "mt-r-1", amountTetri: 1500, description: "x", cardToken: "bog-order-1", callbackUrl: checkout.callbackUrl });
    expect(event).toBeNull();
    expect(calls[1]).toMatchObject({ url: "https://api.bog.ge/payments/v1/ecommerce/orders/bog-order-1/subscribe", method: "POST", body: { external_order_id: "mt-r-1" } });
  });

  it("reports bank errors and missing credentials", async () => {
    const { send } = fakeFetch([{ body: { access_token: "jwt" } }, { status: 400, body: { message: "Payment declined because the card has expired" } }]);
    await expect(provider(send).chargeRenewal({ orderId: "mt-r-1", amountTetri: 1500, description: "x", cardToken: "p", callbackUrl: "u" })).rejects.toThrow(/400/);
    const denied = fakeFetch([{ status: 401, body: {} }]);
    await expect(provider(denied.send).createCheckout(checkout)).rejects.toThrow(/sign in/);
    expect(provider()).toMatchObject({ configured: true, canChangeAmount: false });
    expect(createBogProvider({ clientId: "id", clientSecret: "s", callbackPublicKey: "" }).configured).toBe(false);
  });
});

describe("mock", () => {
  const mock = createMockProvider({ secret: "local-secret", origin: "http://localhost:3000" });

  it("signs webhooks with HMAC-SHA256 (known vector) and refuses anything else", () => {
    // HMAC-SHA256("local-secret", "{}"), computed independently with openssl.
    expect(mock.sign("{}")).toBe("304daf2fcc688af844bd6778113550f4f01c8a2a05b9583d28f27de1faabd9ab");
    const body = JSON.stringify(mock.webhookFor({ orderId: checkout.orderId, amountTetri: 1500 }, "success"));
    expect(mock.verifyWebhook(input(body, { [MOCK_SIGNATURE_HEADER]: mock.sign(body) }))).toBe(true);
    expect(mock.verifyWebhook(input(body.replace("1500", "1"), { [MOCK_SIGNATURE_HEADER]: mock.sign(body) }))).toBe(false);
    expect(mock.verifyWebhook(input(body))).toBe(false);
    expect(mock.verifyWebhook(input(body, { [MOCK_SIGNATURE_HEADER]: createMockProvider({ secret: "other", origin: "x" }).sign(body) }))).toBe(false);
  });

  it("the checkout page's session can't be changed or reused after an hour", async () => {
    const { url } = await mock.createCheckout(checkout);
    expect(url.startsWith("http://localhost:3000/checkout/mock?session=")).toBe(true);
    const token = new URL(url).searchParams.get("session")!;
    expect(mock.readSession(token)).toMatchObject({ orderId: checkout.orderId, amountTetri: 1500, returnUrl: checkout.returnUrl });
    const [payload, signature] = token.split(".");
    const cheaper = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), amountTetri: 1 })).toString("base64url");
    expect(mock.readSession(`${cheaper}.${signature}`)).toBeNull();
    expect(mock.readSession(token, Date.now() + 2 * 60 * 60 * 1000)).toBeNull();
    expect(mock.readSession("nonsense")).toBeNull();
  });

  it("each choice on the pretend bank page becomes the right event", async () => {
    const event = (outcome: Parameters<typeof mock.webhookFor>[1], orderId = checkout.orderId) =>
      mock.parseEvent(input(JSON.stringify(mock.webhookFor({ orderId, amountTetri: 1500 }, outcome))));
    expect(event("success")).toMatchObject({ type: "payment_succeeded", amountTetri: 1500, card: { last4: "4242" }, cardToken: "mock_tok_ok" });
    expect(event("successThenDecline")).toMatchObject({ type: "payment_succeeded", cardToken: MOCK_DECLINING_TOKEN });
    expect(event("declined")).toMatchObject({ type: "payment_failed", failureReason: "card_declined", cardToken: null });
    expect(event("threeDsFailed")).toMatchObject({ type: "payment_failed", failureReason: "3ds_failed" });
    expect(event("success", "mt-r-1").type).toBe("subscription_renewed");
    const renewal = { orderId: "mt-r-1", amountTetri: 1500, description: "x", callbackUrl: "u" };
    expect(await mock.chargeRenewal({ ...renewal, cardToken: "mock_tok_ok" })).toMatchObject({ type: "subscription_renewed" });
    expect(await mock.chargeRenewal({ ...renewal, cardToken: MOCK_DECLINING_TOKEN })).toMatchObject({ type: "payment_failed" });
  });
});
