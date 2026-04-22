# Backend audit

## Summary

The backend is well-structured and covers most of the critical security surface correctly: Stripe webhook signature verification is implemented properly with `timingSafeEqual`, the Sanity webhook signature verification is also correct, server-side price computation is enforced, and test coverage is broad. The most significant gap is that the entire `POST /webhooks/stripe` route handler — the endpoint that marks orders paid — has zero integration tests despite being a payment-critical path. There are also two doc/reality mismatches (the `POST /orders` response shape diverged from what both architecture docs describe, and the `GET /orders/:ref` tracking response field is named differently than docs say), a harmless stale export in three test mocks, an esbuild target that undershoots the actual Lambda runtime, and a dead `start` script in `package.json` that points to a file the build system does not emit.

---

## High priority

### H1. `POST /webhooks/stripe` route handler has no integration tests

- **File:** `backend/src/routes/stripe-webhook.ts:1-102` / `backend/src/__tests__/` (throughout)
- **Issue:** `stripe.test.ts` tests the pure `verifyWebhookSignature` function only. There is no test that drives the `POST /webhooks/stripe` route through `app.request()`, meaning the branching logic in the route handler itself — signature verification failure response, order-not-found guard, status idempotency guard, amount-mismatch guard, `updateOrderPayment` call, and the successful 200 path — is never executed in any test. `verifyWebhookSignature` returning `valid: false` exercised through the pure function is not the same as the route returning 200 (its documented behaviour on bad sig). The idempotency guard (`order.status !== 'pending_payment'`) and the amount cross-check at lines 70–86 are completely untested at the integration level.
- **Evidence:**
  ```
  $ grep -r "webhooks/stripe\|POST.*stripe" backend/src/__tests__/
  (no output)
  ```
  `stripe.test.ts` only imports and calls `verifyWebhookSignature` directly — no `createApp()` / `app.request()` usage.
- **Proposed change:** Create `backend/src/__tests__/stripe-webhook.test.ts`. Use the same signature-construction helper already present in `stripe.test.ts` (`sign(body, secret, now)`) and drive the endpoint via `app.request()`. Required cases:

  ```
  - valid sig + checkout.session.completed + matching amount → 200, calls updateOrderPayment
  - valid sig + already-paid order (status !== 'pending_payment') → 200, skips update
  - valid sig + amount mismatch (>1 cent) → 200, skips update
  - valid sig + order not found in Sanity → 200
  - invalid sig → 200 (Stripe retries, returning non-2xx would cause retry storms)
  - missing STRIPE_WEBHOOK_SECRET → 500
  - non-checkout.session.completed event type → 200
  - Sanity updateOrderPayment throws → 200
  ```

  Mock `sanity.getOrderByRef` and `sanity.updateOrderPayment` the same way `orders.test.ts` does them. Pass a `nowSeconds` override into `verifyWebhookSignature` — the route currently hardcodes `Math.floor(Date.now() / 1000)` as the default, so you'll need to expose a way to override it or use `vi.setSystemTime()`.
- **Risk if applied:** None — tests only, no production code changes.
- **Verification:** `pnpm backend test` must pass with the new file present and all cases green.

---

## Medium priority

### M1. `POST /orders` response shape diverges from all documentation

- **File:** `backend/src/routes/orders.ts:249` vs `docs/architecture.md:212,353` and `docs/orders-and-tracking.md:219,537`
- **Issue:** The route returns `{ success, ref, stripe: { sessionId, url } }`. Every mention in both docs says it returns `{ success, ref, checkoutUrl }`. The frontend (`frontend/src/lib/Cart.svelte:75,78`) correctly reads `data.stripe?.url`, so the frontend already matches the actual implementation — but the documentation is consistently wrong and will mislead any future implementer.
- **Evidence:**
  ```ts
  // orders.ts:249 — actual
  return c.json({ success: true, ref, stripe: { sessionId: session.id, url: session.url } });
  ```
  ```
  // architecture.md:212 — stale
  `{ success, ref, checkoutUrl }`
  ```
- **Proposed change:**

  In `docs/architecture.md` at lines 212 and 353–356, replace:
  ```diff
  - `{ success, ref, checkoutUrl }`
  + `{ success, ref, stripe: { sessionId, url } }`
  ```
  ```diff
  - Returns { success, ref, checkoutUrl }
  - Browser redirects to checkoutUrl → customer lands on Stripe Checkout
  + Returns { success, ref, stripe: { sessionId, url } }
  + Browser redirects to stripe.url → customer lands on Stripe Checkout
  ```

  In `docs/orders-and-tracking.md` at lines 219–220 and 537–538, same substitution.

- **Risk if applied:** Docs-only change. Zero runtime risk.
- **Verification:** `grep -r "checkoutUrl" docs/` should return no results after the edit.

---

### M2. `GET /orders/:ref` response field is `updatedAt` in code, `statusUpdatedAt` in docs

- **File:** `backend/src/routes/order-lookup.ts:16,36` vs `docs/orders-and-tracking.md:301,335`
- **Issue:** The `TrackingResponse` type and the `sanitise()` function emit a field named `updatedAt` (mapped from `order._updatedAt`). The documentation describes the response as containing `statusUpdatedAt`. These are different names. A frontend developer reading the doc and expecting `statusUpdatedAt` will get `undefined`.
- **Evidence:**
  ```ts
  // order-lookup.ts:16
  updatedAt: string;
  // order-lookup.ts:36
  updatedAt: order._updatedAt
  ```
  ```
  // orders-and-tracking.md:301
  "statusUpdatedAt": "2026-04-12T14:00:00Z"
  // orders-and-tracking.md:335
  { ref, status, customerName, items, shipping, createdAt, statusUpdatedAt }
  ```
- **Proposed change:** Update the docs to match the implementation (the implementation is already live and the frontend uses it as-is):

  In `docs/orders-and-tracking.md` lines 301 and 335:
  ```diff
  -      "statusUpdatedAt": "2026-04-12T14:00:00Z"
  +      "updatedAt": "2026-04-12T14:00:00Z"
  ```
  ```diff
  -   { ref, status, customerName, items, shipping, createdAt, statusUpdatedAt }
  +   { ref, status, customerName, items, shipping, createdAt, updatedAt }
  ```

  Alternatively, rename the field in code to `statusUpdatedAt` if that name is more semantically accurate, then update the frontend if it reads this field. Check `frontend/src/routes/track/+page.svelte` before deciding.
- **Risk if applied:** Docs-only fix carries no risk. Code rename requires verifying the frontend field reference.
- **Verification:** After docs fix: `grep -n "statusUpdatedAt" docs/orders-and-tracking.md` should show 0 occurrences. After code rename (if chosen): `pnpm check && pnpm test` must pass.

---

### M3. esbuild target is `node20` but Lambda runtime is `nodejs22.x`

- **File:** `backend/package.json:9` and `infra/lambda.tf:66`
- **Issue:** The build command compiles to `--target=node20` but the Lambda is running `nodejs22.x`. This is harmless today because Node 22 is a superset of Node 20, but it means the bundle is not taking advantage of Node 22 syntax (e.g. native `Array.prototype.toSorted`, top-level `using`, etc.) and could mislead a developer who adds Node 22-specific code and then finds esbuild transpiling it away. More practically, if a future dependency uses Node 22 built-ins, esbuild will silently polyfill or error rather than pass them through.
- **Evidence:**
  ```json
  // package.json:9
  "build": "esbuild src/lambda.ts --bundle ... --target=node20 ..."
  ```
  ```hcl
  # lambda.tf:66
  runtime = "nodejs22.x"
  ```
- **Proposed change:**
  ```diff
  - "build": "esbuild src/lambda.ts --bundle --platform=node --target=node20 ..."
  + "build": "esbuild src/lambda.ts --bundle --platform=node --target=node22 ..."
  ```
- **Risk if applied:** None in practice — esbuild `node22` target is a valid value and simply allows newer syntax to pass through unmodified.
- **Verification:** `pnpm backend build` must succeed and produce `dist/lambda.mjs`. Check `file dist/lambda.mjs` still reports ESM.

---

### M4. Sanity client uses `useCdn: true` for all queries including the Stripe webhook's order lookup

- **File:** `backend/src/sanity.ts:130`
- **Issue:** The single cached `SanityClient` instance has `useCdn: true`. This routes all reads — including `getOrderByRef()` called inside the Stripe webhook handler — through Sanity's Fastly-backed query CDN, which has a propagation lag of a few seconds. On a cold Lambda start (first invocation), the Stripe webhook may arrive within 1–3 seconds of the order being written, before the CDN has the new document. The lookup returns `null`, the webhook logs "order not found", and Stripe retries later. The retry will succeed, so this is not a data-loss scenario, but it causes the payment confirmation to the customer to be delayed by however long Stripe waits before retrying (typically 5–30 minutes for the first retry). The amount cross-check and idempotency guard also read through CDN, which is fine since they read a document written minutes earlier.
- **Evidence:**
  ```ts
  // sanity.ts:130
  useCdn: true,
  ```
  The Stripe webhook flow: `POST /orders` creates the Sanity document → returns the Stripe session URL → browser redirects → customer pays → Stripe fires the webhook. In practice the gap is >30 seconds (redirect + customer fills payment form), so CDN staleness is unlikely to bite. But the `updateOrderPayment` function calls `client.fetch()` to get the doc `_id` before patching — that read could also hit a stale CDN node.
- **Proposed change:** Use `useCdn: false` for mutation-adjacent queries — specifically `getOrderByRef` and `updateOrderPayment`. The cleanest approach is a second client instance for writes:

  ```ts
  // sanity.ts — add alongside cachedClient:
  let cachedWriteClient: SanityClient | null = null;

  function getWriteClient(): SanityClient {
    if (cachedWriteClient) return cachedWriteClient;
    // same config as getClient() but useCdn: false
    cachedWriteClient = createClient({ ...baseConfig, useCdn: false });
    return cachedWriteClient;
  }
  ```

  Use `getWriteClient()` in `createOrder`, `updateOrderPayment`, and `getOrderByRef`.
- **Risk if applied:** Read latency for order lookups increases from ~50 ms (CDN hit) to ~200 ms (origin). Acceptable for the write path.
- **Verification:** No test change needed. Manual verification: confirm the Stripe webhook test (once H1 is addressed) passes without a timing dependency.

---

## Low priority

### L1. Three test files mock a non-existent `getGalleryPhotos` export from `sanity.ts`

- **File:** `backend/src/__tests__/app.test.ts:7`, `backend/src/__tests__/rate-limit.test.ts:15`, `backend/src/__tests__/sanity-webhook.test.ts:16`
- **Issue:** The `vi.mock('../sanity.js', ...)` call in each of these three files includes `getGalleryPhotos: vi.fn()`. `getGalleryPhotos` does not exist in `backend/src/sanity.ts` and is never called by any route. The mocks are wider than the actual module — vitest allows extra keys in the mock object so no test fails, but it signals a leftover from a feature that was removed or never merged. It will confuse a developer reading the tests.
- **Evidence:**
  ```ts
  // app.test.ts:7
  getGalleryPhotos: vi.fn().mockResolvedValue([]),
  ```
  ```
  $ grep -rn "getGalleryPhotos" backend/src/
  backend/src/__tests__/app.test.ts:7:  getGalleryPhotos: vi.fn().mockResolvedValue([]),
  backend/src/__tests__/rate-limit.test.ts:15:  getGalleryPhotos: vi.fn(),
  backend/src/__tests__/sanity-webhook.test.ts:16:  getGalleryPhotos: vi.fn(),
  ```
- **Proposed change:** Remove `getGalleryPhotos: vi.fn()` from all three mock objects.
- **Risk if applied:** None — the key is unused.
- **Verification:** `pnpm backend test` passes after removal.

---

### L2. `start` script in `package.json` references a file the build does not emit

- **File:** `backend/package.json:13`
- **Issue:** `"start": "node dist/server.js"` — but the esbuild build command outputs `dist/lambda.mjs`, not `dist/server.js`. There is no build target that produces a `dist/server.js`. The script will always throw `Error: Cannot find module`. The `start` script is not referenced by any workflow or `CLAUDE.md` command, so it is dead code.
- **Evidence:**
  ```json
  // package.json:9 — what build actually produces
  "--outfile=dist/lambda.mjs"
  // package.json:13 — what start references
  "start": "node dist/server.js"
  ```
- **Proposed change:** Remove the `start` script entirely. Local development uses `pnpm backend dev` (`tsx watch src/server.ts`). If a compiled local server is ever needed, add a separate build target and script at that point.
  ```diff
  - "start": "node dist/server.js"
  ```
- **Risk if applied:** None — the script is broken as written and not used by any documented workflow.
- **Verification:** `pnpm backend --list` no longer shows `start`. `pnpm backend build` and `pnpm backend dev` still work.

---

### L3. `orders-and-tracking.md` still contains "PROPOSED — not yet created" comments on the order schema

- **File:** `docs/orders-and-tracking.md:79`
- **Issue:** The order schema code block is annotated `// studio/schemas/order.ts  (PROPOSED — not yet created)`. The schema is implemented (`studio/schemas/order.ts` exists, based on the architecture doc's file tree at line 97). The doc is describing a design proposal for something that has already shipped.
- **Proposed change:** Remove `(PROPOSED — not yet created)` from the comment on line 79, and update the section header or intro paragraph to reflect that the implementation is complete rather than proposed.
- **Risk if applied:** None — docs only.
- **Verification:** `grep "PROPOSED" docs/orders-and-tracking.md` returns no results.
