# Studio audit

## Summary

The studio workspace is small and well-structured: three schemas, a config, a CLI config, and a `.env.example`. Schema field coverage matches what the backend queries; no secrets are committed; the dataset is documented as private. Four issues were found — one stale doc comment that will cause confusion for anyone adding a content type, one schema field missing a `required()` validator with a concrete blast radius, one dead deployment config that will break unattended CI deploys, and one minor doc version discrepancy.

---

## High priority

### H1. `sanity.cli.ts` has an empty `appId` — `sanity deploy` will hang in CI

- **File:** `studio/sanity.cli.ts:13`
- **Category:** bug
- **Problem:** `appId` is set to the empty string `''` with a `TODO` comment. The Sanity CLI uses `appId` to know which `*.sanity.studio` hostname to target. When `appId` is empty the CLI falls back to an **interactive subdomain prompt** (`? Your project's studio hostname`). `deploy-studio.yml` runs `pnpm exec sanity deploy` non-interactively in CI — the prompt will block indefinitely and the deploy job will time out.
- **Evidence:**
  ```ts
  // studio/sanity.cli.ts
  deployment: {
      // TODO: run `pnpm studio sanity deploy` to claim a fresh appId for Thong Biltong
      appId: ''
  }
  ```
- **Proposed change:** Run `pnpm studio deploy` locally once (interactively) to claim a subdomain. Sanity writes the chosen `appId` back into `sanity.cli.ts`. Commit the result. After that, CI deploys will be non-interactive.

  Alternatively, if the subdomain is already known (e.g. `thongbiltong`), set it directly:
  ```diff
  - appId: ''
  + appId: 'thongbiltong'
  ```
  The value must match an `appId` already registered under the project in the Sanity dashboard.
- **Risk if applied:** None — this is the documented first-time setup step, just not yet done.
- **Verification:** After committing, trigger `deploy-studio.yml` manually via `gh workflow run deploy-studio.yml`. Confirm the job completes without hanging at a prompt.

---

### H2. `priceZar` field has no `required()` validator — products can be published without a price

- **File:** `studio/schemas/product.ts:41`
- **Category:** bug
- **Problem:** The `priceZar` field validates `rule.min(0)` but not `rule.required()`. The Studio will allow publishing a product with no price. The backend handles this gracefully (returns 400 to the customer), but a missing-price product becomes permanently un-purchasable and there is no in-Studio warning to the owner that this is the reason. The blast radius is: an operator publishes a product, it appears on the shop with "No price set" in the Studio list view, and every customer who tries to add it to their cart gets a 400 error with no explanation.
- **Evidence:**
  ```ts
  defineField({
      name: 'priceZar',
      title: 'Price (ZAR)',
      description: 'Price in South African Rand. Enter whole rand (e.g. 450).',
      type: 'number',
      validation: (rule) => rule.min(0)  // ← missing .required()
  }),
  ```
  The backend rejects a null price with `{ error: Product "X" does not have a price. }` (backend/src/routes/orders.ts:149), but the Studio gives no warning before publish.
- **Proposed change:**
  ```diff
  - validation: (rule) => rule.min(0)
  + validation: (rule) => rule.required().min(0)
  ```
- **Risk if applied:** The Studio will block publishing products that have no price set. Any existing draft product without a price will show a validation error until a price is entered. No backend changes needed.
- **Verification:** In the Studio, create a product without a price and attempt to publish — should show a validation error. Add a price and publish — should succeed.

---

## Medium priority

### M1. `docs/orders-and-tracking.md` still marks the `order` schema as `PROPOSED — not yet created`

- **File:** `docs/orders-and-tracking.md:79`
- **Category:** inconsistency
- **Problem:** The comment at line 79 reads `// studio/schemas/order.ts  (PROPOSED — not yet created)`. The schema has been created and is fully implemented at `studio/schemas/order.ts` and registered in `studio/schemas/index.ts`. Anyone following the doc to understand what's been built will get the wrong picture, and the worked-example code block in the doc is now a duplicate of the real file with slight differences (the doc's `prepare()` uses `subtitle || 'Unknown'` and omits the `?? 'pending_payment'` fallback on status; the real schema uses `subtitle ?? 'Unknown'`).
- **Evidence:**
  ```ts
  // studio/schemas/order.ts  (PROPOSED — not yet created)
  ```
- **Proposed change:** Replace the comment and code block with a short paragraph:
  ```diff
  - // studio/schemas/order.ts  (PROPOSED — not yet created)
  - import { defineField, defineType } from 'sanity';
  - ... [full code block] ...
  + The `order` schema is implemented at `studio/schemas/order.ts`.
  + See that file for the canonical field list.
  ```
  Remove the entire TypeScript code block that follows (lines 78–172 of `docs/orders-and-tracking.md`). Keep the surrounding prose about field semantics and status transitions.
- **Risk if applied:** Docs become more accurate. The status-transition diagram and the table of status values below the code block are still useful and should be kept.
- **Verification:** Read the doc after the edit; confirm no stale `PROPOSED` language remains and the status transition diagram (`pending_payment → payment_received → shipped → ...`) is still present.

---

### M2. `docs/architecture.md` and `docs/features.md` refer to Sanity Studio v3; it is v5

- **File:** `docs/architecture.md:17`, `docs/architecture.md:279`, `docs/features.md:238`
- **Category:** inconsistency
- **Problem:** Three prose references in two doc files say "Sanity Studio v3". The actual installed package is `sanity@^5.21.0` (confirmed in `studio/package.json:13`). `studio/CLAUDE.md` correctly says "Sanity Studio v5 (React 19)". The mismatch will mislead anyone reading the architecture doc who is debugging a v5-specific behaviour or checking a changelog.
- **Evidence:**
  ```
  docs/architecture.md:17   — `studio/` — Sanity Studio v3, a dashboard …
  docs/architecture.md:279  — Sanity Studio v3, configured in `studio/sanity.config.ts`.
  docs/features.md:238      — a standalone Sanity Studio v3 app
  ```
- **Proposed change:** Replace all three occurrences:
  ```diff
  - Sanity Studio v3
  + Sanity Studio v5
  ```
- **Risk if applied:** None.
- **Verification:** `grep -rn "Studio v3" docs/` should return no results after the edit.

---

## Low priority

### L1. `EFT` is listed as a `paymentMethod` option in the Studio order schema but is never created by the system

- **File:** `studio/schemas/order.ts:40-41`
- **Category:** dead-code / inconsistency
- **Problem:** The `paymentMethod` radio field in the order schema lists `{ title: 'EFT', value: 'eft' }` as the first option with `initialValue: 'eft'`. The backend always creates orders with `paymentMethod: 'stripe'` (`backend/src/sanity.ts:143` falls back to `'eft'` only when `input.paymentMethod` is not supplied, but `backend/src/routes/orders.ts:177` always passes `paymentMethod: 'stripe'`). No frontend flow offers EFT. An operator editing an order in the Studio will see "EFT" as the default radio selection, which is incorrect for all real orders and could cause confusion if they mistakenly change a stripe order to EFT.

  The `initialValue: 'eft'` is particularly problematic: it means any order manually created in the Studio (not via the backend) would default to EFT.
- **Evidence:**
  ```ts
  // studio/schemas/order.ts:37-46
  options: {
      list: [
          { title: 'EFT', value: 'eft' },
          { title: 'Stripe', value: 'stripe' }
      ]
  },
  initialValue: 'eft',
  ```
- **Proposed change:**
  ```diff
  - { title: 'EFT', value: 'eft' },
    { title: 'Stripe', value: 'stripe' }
  - initialValue: 'eft',
  + initialValue: 'stripe',
  ```
  If EFT is a genuinely planned future payment path, keep the list entry but still change `initialValue` to `'stripe'` so current orders default correctly.
- **Risk if applied:** Existing Sanity order documents with `paymentMethod: 'eft'` (test data, manual entries) will still display correctly — the schema change only affects the UI default and list ordering. The backend `PaymentMethod` type already includes `'eft'`, so no backend change is needed.
- **Verification:** Open an existing Stripe order in the Studio and confirm the `paymentMethod` radio shows `Stripe` pre-selected.
