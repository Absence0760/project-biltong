# Running locally

This guide walks through getting the frontend, backend, and (optionally) the
Sanity Studio running on your machine for development.

For deploying to AWS, see [`deployment.md`](./deployment.md) instead.

## Prerequisites

- **Node.js 22 or later** — check with `node --version`
- **pnpm 9 or later** — check with `pnpm --version`, install with
  `npm install -g pnpm` if missing
- A **Resend API key** — free at [resend.com](https://resend.com). Not strictly
  required to run the servers, but the order form will fail to send emails
  without one.
- A **Sanity project** — free at [sanity.io](https://www.sanity.io/manage).
  Optional for running the site locally (the shop will show an empty state
  without it), but required for managing products.
- **AWS CLI auth** — only required if you decrypt local secrets from
  `backend/.env.sops` rather than typing them into `backend/.env` by hand.
  If you do, configure a profile per
  [`deployment.md § AWS profiles`](./deployment.md#aws-profiles-multi-project-setup)
  so credentials don't bleed across projects.

## One-time setup

From the repository root:

```bash
pnpm install
```

This installs dependencies for all three workspace packages (`frontend/`,
`backend/`, `studio/`) into a single hoisted `node_modules` at the root.

Copy the example env files and fill them in:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp studio/.env.example studio/.env
```

Edit `backend/.env` and set at minimum:

**For the order flow + email (Resend):**
- `RESEND_API_KEY` — your Resend API key
- `FROM_EMAIL` — a verified sender in your Resend account (e.g. a Resend
  sandbox address, or `orders@yourdomain.com` once the domain is verified)
- `OWNER_EMAIL` — where order notifications go (your inbox while developing)

**For products + order storage (Sanity):**
- `SANITY_PROJECT_ID` — your Sanity project ID
- `SANITY_DATASET` — defaults to `production`
- `SANITY_API_TOKEN` — an Editor-scoped token from your Sanity project's
  API → Tokens tab. Required for the backend to read products and to
  write orders.

**For Stripe Checkout:**
- `STRIPE_SECRET_KEY` — `sk_test_…` from Stripe dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` printed by `stripe listen` (see below)
- `STRIPE_CURRENCY` — optional, defaults to `zar`

**Optional but useful:**
- `SANITY_WEBHOOK_SECRET` — only needed if you're testing the order-status
  email webhook locally (via ngrok or similar)
- `SITE_URL` — base URL used in tracking link emails. Defaults to
  `http://localhost:7777`

Edit `frontend/.env`:

- `PUBLIC_API_URL=http://localhost:3001` — where the browser finds the backend
- `PUBLIC_SITE_URL=http://localhost:7777` — used for absolute URLs in Open
  Graph social share tags
- `PUBLIC_SANITY_PROJECT_ID` — same project ID as the backend. The frontend
  uses it to build image URLs from Sanity's public asset CDN (it doesn't
  query documents directly)
- `PUBLIC_SANITY_DATASET` — same dataset name as the backend

### Setting up Sanity

1. Log in at https://www.sanity.io/manage and click **Create new project**.
2. Give it a name (e.g. "Thong Biltong") and choose the default dataset
   `production`.
3. Copy the **Project ID** shown on the project dashboard.
4. Paste the project ID into **all three** env files:
   - `studio/.env` → `SANITY_STUDIO_PROJECT_ID=...`
   - `backend/.env` → `SANITY_PROJECT_ID=...`
   - `frontend/.env` → `PUBLIC_SANITY_PROJECT_ID=...`
5. Create an **Editor** API token in the Sanity dashboard (API → Tokens → Add)
   and paste it into `backend/.env` as `SANITY_API_TOKEN=...`. The backend
   needs this to read products and to create orders.
6. Start the studio with `pnpm studio dev` (see below).
7. Log into the studio in your browser, create some products, and click
   **Publish**.
8. Refresh the shop page in your browser — the new content appears
   immediately. (The shop fetches data client-side on every page load, so
   there's no rebuild required.)

## Running the site

From the repository root:

```bash
pnpm dev
```

This starts the frontend and backend in parallel:

- **Frontend** — [http://localhost:7777](http://localhost:7777) (Vite dev server
  with HMR)
- **Backend** — [http://localhost:3001](http://localhost:3001) (`tsx watch`
  auto-reloading Hono server)

Press `Ctrl+C` once to stop both.

The studio is deliberately excluded from `pnpm dev` because it's heavy and
isn't needed for most site development. Run it separately when you need it.

## Running the studio

```bash
pnpm studio dev
```

This starts Sanity Studio on [http://localhost:3333](http://localhost:3333).
Sign in with the Sanity account that owns the project. Any products you
create/edit and publish become visible to the frontend on the next build.

To publish the studio so the owner can use it from anywhere:

```bash
pnpm studio deploy
```

Sanity will prompt for a subdomain (e.g. `thongbiltong`) and deploy to
`https://thongbiltong.sanity.studio`. Free, no AWS involved.

## Running all three at once

Only needed if you're actively developing the studio schema at the same time
as the site.

```bash
pnpm dev:all
```

## Running packages individually

```bash
pnpm frontend dev         # frontend only
pnpm backend dev          # backend only
pnpm studio dev           # studio only
```

These are shortcuts for `pnpm --filter @thong-biltong/{frontend,backend,studio}`.

## End-to-end test

A full run through the app exercises studio content → frontend rendering →
backend order submission → Sanity order doc → tracking link. Run all three
servers (`pnpm dev:all`) and walk through the steps below.

**1. Publish content in the studio** (http://localhost:3333)

Sign in, create one or two products, and **click Publish** — unpublished
drafts are invisible to the backend's Sanity queries.

**2. Verify the frontend renders that content** (http://localhost:7777)

- Home page loads.
- **Shop** page shows the products you just published.

If a page stays on the skeleton/empty state, see the "Shop page stays on
the skeleton" entry under [Common issues](#common-issues).

**3. Submit an order**

On the Shop page, scroll to the order form, fill it in with your own email
address, and submit. In the backend terminal you should see the `POST /orders`
request logged. Two emails arrive shortly: one to `OWNER_EMAIL`, one to the
customer address.

**4. Verify the order doc in Sanity Studio**

A new document appears under **Orders** in the studio. Change its status
(e.g. `pending` → `confirmed`) and click Publish.

**5. Open the tracking link**

The customer email contains a `/track?token=…` link. Open it — the track
page should show the current order status.

**6. (Optional) Test the status-change email**

The status-change email fires from a Sanity webhook, which needs a
publicly-reachable backend URL. Skip on the first pass — everything else
works without it. Full walkthrough (ngrok, secret, dashboard config,
filter) in [Testing the Sanity order-status webhook](#testing-the-sanity-order-status-webhook)
below.

## Testing Stripe with test keys

Stripe supports full end-to-end testing locally using a **test-mode secret
key** plus the **Stripe CLI**, which forwards events to your laptop without
ngrok. Use it to exercise the full checkout + webhook flow before wiring
up real credentials.

### Test-mode credentials

Grab a test secret key from Stripe → Developers → API keys. Test keys
start with `sk_test_` / `pk_test_` and operate entirely against Stripe's
sandbox — no real money moves.

Add to `backend/.env`:

```ini
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CURRENCY=zar
```

Restart the backend (`Ctrl+C` and re-run `pnpm backend dev`) after editing
`.env` — `tsx watch` does not auto-reload on env changes.

### Smoke-test the order endpoint

```bash
# Grab a real product ID from Sanity
curl -s http://localhost:3001/products | head -c 400

# Place an order (replace PRODUCT_ID)
curl -i -X POST http://localhost:3001/orders \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:7777' \
  -d '{"name":"Test User","email":"you@example.com","phone":"0821234567","address":"1 Main St, Cape Town, 8001","notes":"","cart":[{"productId":"PRODUCT_ID","quantity":1}],"paymentMethod":"stripe"}'
```

A healthy response is `HTTP/1.1 200` with a `checkoutUrl` in the body:

```json
{
  "success": true,
  "ref": "TB-260417-XXXXXX",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Common failure modes:

- **`500 "Payment processing is not configured."`** — `STRIPE_SECRET_KEY`
  is empty or malformed. Check `grep STRIPE backend/.env` and restart.
- **`200` with `warning` but no `checkoutUrl`** — the owner notification
  email failed (usually missing/invalid `RESEND_API_KEY`), which
  early-returns before the Stripe session is created. Fix Resend config
  and retry.
- **`400 "Please enter your name."` (or similar)** — request body shape is
  wrong. The backend expects top-level `name`/`email`/`phone`/`address`/`notes`
  plus a `cart` of `{productId, quantity}` objects — **not** nested under
  `customer` and **not** `slug`.

### Full round-trip via the UI

Fastest way to see the Stripe checkout page render:

1. `pnpm dev`
2. Browser → http://localhost:7777/shop
3. Add a product → check out → fill the form → submit
4. The browser redirects to Stripe's hosted checkout page
5. Pay with one of the test cards below
6. Stripe redirects to `/payment/complete?ref=TB-...`

#### Stripe test cards

| Card number | Outcome |
|---|---|
| `4242 4242 4242 4242` | Visa — always approves |
| `4000 0025 0000 3155` | Visa — 3DS authentication required |
| `4000 0000 0000 9995` | Declined (insufficient funds) |

CVV: any 3 digits. Expiry: any future date. ZIP: any 5 digits.

### Forwarding webhook events with the Stripe CLI

The steps above cover order creation and the customer redirect. To close
the loop and update the Sanity order to `payment_received` after checkout,
Stripe needs to POST `checkout.session.completed` to
`/webhooks/stripe` — which it can do locally via the **Stripe CLI**. No
ngrok required.

**1. Install and authenticate** (one-time)

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

**2. Start forwarding** (leave running in its own terminal)

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
```

The CLI prints a `whsec_...` signing secret on startup. Copy it into
`backend/.env`:

```ini
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart the backend. The CLI holds the connection open — every event
Stripe generates on your test-mode account is forwarded to your local
endpoint with the correct signature.

**3. Verify the webhook arrives**

Place and complete a new test order. You should see:

- `checkout.session.completed [evt_...]` logged in the `stripe listen`
  terminal, followed by `--> 200 OK`
- No `Stripe webhook: invalid signature` warnings in the backend logs
- The order status flip from `pending_payment` to `payment_received` in
  Sanity Studio at :3333, with the `paymentId` field populated

**Gotchas:**

- Each `stripe listen` invocation prints a **fresh** `whsec_...`. If you
  restart the CLI, update `STRIPE_WEBHOOK_SECRET` and restart the backend.
  For a persistent secret, register a proper endpoint at
  Developers → Webhooks (requires a public URL).
- If signature verification keeps failing, make sure the backend reads
  the raw body before JSON-parsing. The handler must verify over the
  exact bytes Stripe signed.

### Moving to production

Once the test-mode flow works end-to-end, swap to real credentials. Create
a live-mode webhook endpoint in the Stripe dashboard pointed at
`${site_url}/api/webhooks/stripe`, grab the live-mode `sk_live_…` key, and
populate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` via
[`deployment.md § Secrets management`](./deployment.md#secrets-management).

## Testing the Sanity order-status webhook

The Stripe webhook flips orders to `payment_received` in Sanity, but the
customer "payment received" email doesn't fire automatically — it's sent
by the **Sanity webhook**, which POSTs to `/webhooks/sanity-order` whenever
an order's `status` field changes. To test this end-to-end locally you
need three things: a shared secret in `backend/.env`, a webhook configured
in Sanity's dashboard, and (for the Sanity webhook only) an ngrok tunnel
so Sanity can reach your laptop.

This is optional — everything except customer status emails works without
it. Skip on first pass, come back when you want to verify the email flow.

### 1. Generate the shared secret

```bash
openssl rand -hex 32
```

Paste the output into `backend/.env`:

```ini
SANITY_WEBHOOK_SECRET=<the-hex-string>
```

Restart the backend. The **same** string goes into Sanity's webhook
configuration below — Sanity uses it to sign each webhook request and the
backend rejects requests whose signature doesn't verify.

### 2. Create the webhook in the Sanity dashboard

1. Open https://www.sanity.io/manage → your project → **API** tab →
   **Webhooks** → **Create webhook**.
2. Fill in:

| Field | Value |
|---|---|
| **Name** | `Order status email` |
| **Dataset** | `production` (or whichever dataset holds orders) |
| **URL** | `https://<your-ngrok>.ngrok-free.app/webhooks/sanity-order` |
| **Trigger on** | **Update** only (uncheck Create and Delete) |
| **Filter** (GROQ) | `_type == "order" && delta::changedAny(status)` |
| **Projection** | leave blank (defaults to full document) |
| **HTTP method** | `POST` |
| **API version** | latest (e.g. `v2025-01-01`) |
| **Secret** | the hex string from step 1 |

3. Save.

The GROQ filter is important: without it, **any** edit to an order doc
(adding a tracking number, fixing a typo) would re-fire the status email
and spam the customer. `delta::changedAny(status)` restricts the webhook
to transitions only.

### 3. Trigger a status change and verify

- Open Sanity Studio (http://localhost:3333) → **Orders** → find the
  order you just paid for (status should be `payment_received`)
- Change the status to `confirmed` (or any other value) → **Publish**
- Watch the backend logs — you should see a `POST /webhooks/sanity-order`
  line and an email send log
- Watch the ngrok terminal — same `POST /webhooks/sanity-order 200`
- Check the customer inbox (use a plus-alias of your Resend signup email,
  e.g. `jaredhoward0912+customer@gmail.com`, so Resend's sandbox sender
  will actually deliver it)

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `401` in backend logs | Secret mismatch between `.env` and the Sanity dashboard |
| `404` / connection refused | Stale ngrok URL in the Sanity webhook, or backend not running |
| `200` but no email | Resend sandbox sender only delivers to your Resend signup address. Plus-aliases of that address work; a random third-party email won't. |
| No webhook fires at all | Filter too restrictive — Sanity only fires on `delta::changedAny(status)`. If you edited a different field, nothing fires. |

Stripe webhooks do **not** need ngrok — the Stripe CLI forwards directly.
ngrok is only needed here for the Sanity webhook, because Sanity's servers
need a public URL to POST to. If you restart ngrok, update the webhook URL
in the Sanity dashboard.

## Quick backend smoke test

To confirm the backend is up without touching the frontend:

```bash
curl http://localhost:3001/health
# {"ok":true}
```

To exercise `POST /orders` without the UI, see the curl example under
[Testing Stripe with test keys § Smoke-test the order endpoint](#smoke-test-the-order-endpoint)
— the order body needs a real product ID from Sanity and Stripe test keys
configured, so it's not a one-liner.

## Type-checking and linting

```bash
pnpm check                # runs check in all three packages
pnpm frontend check       # svelte-check + tsc on frontend
pnpm backend check        # tsc --noEmit on backend
pnpm studio check         # tsc --noEmit on studio
```

Do this before committing. All three should report 0 errors.

## Building

```bash
pnpm build                # builds all three packages
pnpm frontend build       # emits frontend/build/ (static site for S3)
pnpm backend build        # emits backend/dist/lambda.mjs (esbuild bundle for Lambda)
pnpm studio build         # emits studio/dist/ (React SPA, for self-hosted deploys)
```

## Running tests

```bash
pnpm test                 # runs tests in all workspace packages
pnpm backend test         # backend only (Vitest + Hono app.request harness)
pnpm frontend test        # frontend only (Vitest, helpers in src/lib)
pnpm backend test:watch   # watch mode
pnpm frontend test:watch
```

Tests mock Sanity and Resend, so they never hit real services and don't
need a network connection or any environment variables beyond what the
test setup files provide. The full suite runs in well under a second.

## Common issues

**`PUBLIC_API_URL` is not defined at build time**
: The frontend inlines `PUBLIC_API_URL` at build time via `$env/static/public`.
  If `frontend/.env` is missing or the variable is unset, the build fails. Copy
  `.env.example` to `.env`.

**CORS errors in the browser when submitting the order form**
: `ALLOWED_ORIGINS` in `backend/.env` must include the frontend origin. For
  local dev this is `http://localhost:7777` (the default).

**Port already in use**
: Frontend dev server is hard-coded to port 7777 in `frontend/package.json`.
  Backend respects the `PORT` env var; change it in `backend/.env` if 3001 is
  taken.

**Emails not arriving**
: Check `RESEND_API_KEY` is valid and `FROM_EMAIL` is from a verified domain in
  your Resend dashboard. During initial setup, Resend's sandbox address
  (`onboarding@resend.dev`) is the fastest way to test.

**Order form fails silently**
: Open the browser devtools Network tab. The request to `/orders` will show the
  actual error from the backend. Common cause: missing `OWNER_EMAIL` in
  `backend/.env`.

**Shop page stays on the skeleton / empty state even after adding content**
: The shop fetches from the backend at runtime, so the usual causes are
  backend-side:
  1. **Backend isn't running.** `pnpm dev` starts both frontend and backend.
     Confirm with `lsof -i :3001` or `curl http://localhost:3001/health`.
  2. **Backend `SANITY_API_TOKEN` is missing or wrong** in `backend/.env`.
     Without the token, the backend returns 500 on `/products`.
     Check the backend terminal for `SANITY_PROJECT_ID is not configured` or
     authentication errors.
  3. **Backend `SANITY_PROJECT_ID` is missing or doesn't match** the studio
     project.
  4. **`tsx watch` hasn't picked up `.env` changes.** `tsx watch` does not
     auto-reload on `.env` edits. Stop and restart `pnpm dev` after changing
     backend env vars.
  5. **Content saved as drafts, not published.** Click **Publish** in Sanity
     Studio — unpublished drafts are invisible to the API.
  6. **Browser devtools → Network tab** shows you exactly what the backend
     returned. Click the failing `/products` request to see the actual
     error message.

**Studio fails to start with "SANITY_STUDIO_PROJECT_ID is not set"**
: You haven't created `studio/.env` or you left `SANITY_STUDIO_PROJECT_ID`
  empty. Follow the Sanity setup steps above.

## Next step: deploying

Once the site runs correctly on your machine, see
[`deployment.md`](./deployment.md) for the first-time AWS deployment
walkthrough (Terraform apply, GitHub Actions setup, Sanity webhook wiring).
