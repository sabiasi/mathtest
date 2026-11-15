# Going live — the owner's checklist

Everything below is what **you** must do yourself; the code is ready and runs in
test mode. Work top to bottom. Nothing here was done for you, and no SQL was ever
run on your Supabase project.

> This file grows with each stage. Stage 2 (payments, emails) is complete below;
> the AI generator, Premium features, School plan and admin sections are added
> when those stages are finished.

Words used: an **environment variable** ("env var") is a setting the server reads
when it starts — on your computer from `.env.local`, on the hosting from its
settings page. A **webhook** is a message the bank's server sends to our server.
**Cron** is a timer that calls an address regularly.

---

## 1. Accounts to open

| # | What | Why | Notes |
|---|------|-----|-------|
| 1 | **Hosting** (e.g. Vercel) | runs the site on an `https://` address | payment providers need a public HTTPS address |
| 2 | **Flitt** merchant account (flitt.com) *and/or* **Bank of Georgia** e-commerce (businessmanager.bog.ge) | card payments in GEL | needs a registered company / individual entrepreneur and a bank account; ask for **recurring / saved-card payments** to be enabled |
| 3 | **Resend** (resend.com) + your domain | payment and reminder emails | also set it as Supabase's custom SMTP, so sign-up emails reach real teachers |
| 4 | A **domain** (e.g. mathtest.ge) | the site's address and the email sender | |
| 5 | **Anthropic** (console.anthropic.com) | the AI question generator | add a payment method and a monthly spend limit there; create an API key |

## 2. Seller details and legal pages (before any real payment)

1. Fill in **`src/lib/payments/seller.ts`**: company name, ID code, address, bank,
   account, support email. Until then every receipt shows "to be filled in by the owner".
2. Read and finish the drafts with a lawyer: **`/terms`**, **`/refund`**, **`/privacy`**
   (texts are in `src/i18n/dictionaries.ts`, keys `terms.*`, `refund.*`, `privacy.*`).
   Every `[square bracket]` is a decision that is yours (refund window, price-change
   notice, liability, governing law, provider names). When they are final, remove
   `<DraftNotice />` from `src/features/legal/LegalViews.tsx` and `PrivacyView.tsx`.
3. Decide the refund policy. What the code does: a refund made in the provider's
   dashboard ends the period that payment bought (the teacher moves to Free;
   nothing is deleted). Partial refunds are only recorded (`payment_events`), never
   acted on automatically.
4. Set `BRAND.website` in `src/lib/plans/plans.ts`.

## 3. SQL to run in Supabase → SQL Editor (in this order)

For a database that already has the earlier stages:

1. `supabase/migrations/20261116_payments.sql`
2. `supabase/migrations/20261117_ai_usage.sql`
3. Then set the server secret (use the same text as `BILLING_SERVER_SECRET` below):
   ```sql
   select public.set_server_secret('billing', 'PASTE-THE-LONG-RANDOM-TEXT-HERE');
   ```

For a brand-new database: `supabase/schema.sql`, then `supabase/plans.sql`, then step 3.
All files are safe to run twice.

## 4. Environment variables

Set them in the hosting's settings (and in `.env.local` for local tries). **Never**
in `.env`, never with a `NEXT_PUBLIC_` name.

| Variable | Value / where it comes from |
|----------|-----------------------------|
| `SITE_URL` | your address, e.g. `https://mathtest.ge` (no `/` at the end) |
| `PAYMENT_PROVIDER` | `flitt` or `bog` |
| `BILLING_SERVER_SECRET` | invent it: 32+ random characters (e.g. `openssl rand -hex 32`); the same text as in step 3.2 |
| `CRON_SECRET` | invent another one the same way |
| `FLITT_MERCHANT_ID`, `FLITT_SECRET_KEY` | Flitt merchant portal → Technical settings ("payment key"). For testing: `1549901` and `test` |
| `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET` | BoG Business Manager → Payments API credentials |
| `BOG_CALLBACK_PUBLIC_KEY` | the PUBLIC key printed on api.bog.ge/docs → Payments → Standard process → **Callback**; one line, line breaks written as `\n` |
| `BOG_TEST_MODE` | `1` while the BoG credentials are test ones |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys. Empty = mock mode (sample questions only) |
| `RESEND_API_KEY` | Resend → API Keys |
| `EMAIL_FROM` | e.g. `MathTest <hello@mathtest.ge>` (the domain must be verified in Resend: add the DNS records Resend shows — SPF, DKIM — at your domain registrar) |

Do **not** set `MATHTEST_SANDBOX` / `NEXT_PUBLIC_MATHTEST_SANDBOX` on the real site.

## 5. Webhook (callback) addresses

The app sends these addresses to the provider with every order, so usually nothing
needs registering. If the provider's portal asks for them:

- Flitt: `https://YOUR-DOMAIN/api/billing/webhook/flitt`
- Bank of Georgia: `https://YOUR-DOMAIN/api/billing/webhook/bog`
- Browser return address (both): `https://YOUR-DOMAIN/api/billing/return/flitt` (or `/bog`)

## 6. The scheduled job (cron) — once an hour

It charges renewals, retries failed ones (days 1, 3, 5), ends finished plans and
sends reminders. Choose ONE:

**Vercel Cron** — add `vercel.json` in the project root:
```json
{ "crons": [{ "path": "/api/cron/billing", "schedule": "0 * * * *" }] }
```
Vercel sends `Authorization: Bearer $CRON_SECRET` by itself when the `CRON_SECRET`
env var exists. (Hourly schedules need a paid Vercel plan; on the free plan use
pg_cron below.)

**Supabase pg_cron** — Database → Extensions: enable `pg_cron` and `pg_net`, then in the SQL Editor:
```sql
select cron.schedule('mathtest-billing', '0 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-DOMAIN/api/cron/billing',
    headers := '{"Authorization": "Bearer PASTE-CRON_SECRET-HERE"}'::jsonb
  );
$$);
```

Check it by hand: `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://YOUR-DOMAIN/api/cron/billing`
→ `{"ok":true,"renewed":0,…}`.

## 7. Test payments BEFORE real ones

A real provider shows the Buy button only when `ONLINE_PAYMENTS` is `true`,
so do this step on a **preview / staging deployment** with that switch on (or
locally through a tunnel such as `ngrok`, with `SITE_URL` set to the tunnel address)
using the provider's TEST credentials:

**Flitt** (merchant `1549901`, key `test`; any expiry and CVV):

| Card | Expected |
|------|----------|
| `4444 5555 1111 6666` | approved, no 3-D Secure |
| `4444 5555 6666 1111` | approved, with 3-D Secure |
| `4444 1111 5555 6666` | declined |
| `4444 1111 6666 5555` | declined after 3-D Secure |

1. Buy Premium (month) with an approving card → `/billing/success` shows "Payment
   received", Settings → My plan shows Premium, the card's last 4 digits and a receipt.
   **If the plan does not switch on:** look at the hosting logs for
   `bad signature` (HTTP 401 on the webhook). Flitt's documentation prints an example
   hash that does not match its own example string, so this first real callback is
   the true check of the signature code (`src/lib/payments/flitt.ts`). In test mode
   Flitt includes `response_signature_string` in the callback — compare it with ours.
2. Buy with a declining card → `/billing/failed`, plan unchanged.
3. In Supabase, set that subscription's `current_period_end` to yesterday and call
   the cron address → a renewal payment appears (charged with the saved token).
4. Refund the payment in Flitt's portal → the plan ends, the payment says "Refunded".
5. Cancel and resume in Settings.

**Bank of Georgia**: ask the bank for test credentials and test cards (their docs
don't publish them). Repeat steps 1–5. Things to confirm with the bank, because the
adapter was written from the documentation only:
- amounts are sent in lari with decimals (`15.00`) — the docs' examples suggest so;
- saving the card for automatic payments (`PUT /orders/{id}/subscriptions`) and
  charging it (`POST /ecommerce/orders/{id}/subscribe`) are enabled for your merchant;
- BoG repeats the FIRST order's amount at every renewal: teachers can't switch
  monthly ↔ yearly without paying again, and a price change in `plans.ts` only
  reaches new subscribers;
- the address of "delete saved card".

## 7b. The AI generator

1. With `ANTHROPIC_API_KEY` set (and the SQL + server secret from step 3 in place),
   open a test → **AI-ით შექმნა** → generate 5 questions in two or three subjects.
   The yellow "test mode" note must be gone. Read the Georgian carefully, check the
   formulas (tg / ctg, `;` in intervals) and one chemistry set with "balance".
2. The model is named in ONE place: `AI_MODEL` in `src/lib/ai/claude.ts`
   (`claude-opus-5-5`). Cost depends on it — see anthropic.com/pricing; a set of 5
   questions is a few thousand tokens. The plan limits (`aiGenerationsPerMonth` in
   `plans.ts`) are your cost ceiling per teacher: Free 3, Premium 100 a month.
3. The request also asks Anthropic to retry on its recommended fallback model if the
   main model declines a request (`fallbacks: "default"`); remove that line in
   `claude.ts` if you don't want it.
4. Check your privacy text: the topic, grade and any pasted text are sent to
   Anthropic to produce the questions (add this to `/privacy` with your lawyer).

## 8. Switch on

1. `src/lib/plans/plans.ts`: `ONLINE_PAYMENTS = true`. Commit, deploy.
2. Put the REAL provider credentials in the hosting's env vars (remove `BOG_TEST_MODE`).
3. Make one real payment with your own card, check the receipt, then refund it.

## Known limits (stage 2)

- Flitt and BoG adapters have unit tests, but have never talked to the real services.
- Rate-limit counters live in one server's memory (see CLAUDE.md → PDF): with several
  servers / serverless, move them to a shared store.
- Receipts are HTML pages printed with the browser ("Print / save as PDF"), not
  tax invoices. Ask your accountant what the tax office requires.
- No proration: a period change applies from the next renewal.
- The AI generator has only ever run in mock mode here: the real model's Georgian
  and formulas are untested until you add a key (step 7b).
- The AI writes 9 text-based question types; types that need a picture or a drawing
  (maps, diagrams, crosswords…) are not generated.
- The welcome email is sent after email confirmation / Google sign-in, and only
  once the payments SQL is installed.
