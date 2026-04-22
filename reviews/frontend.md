# Frontend audit

## Summary

The frontend is well-structured: the static adapter is used correctly, the cart logic separation (pure `cartLogic.ts` + thin `cartStore.svelte.ts`) is clean and testable, no `{@html}` or unsanitized Sanity content exists anywhere, and Stripe is wired correctly through a redirect — no card data ever touches the frontend. Two genuine bugs exist: clicking "Add to order" silently mutates the cart store without opening the cart panel (contradicts the documented behavior and leaves the user with no visual feedback), and `docs/architecture.md` documents a response shape that the backend does not actually emit. The codebase mixes Svelte 4 legacy syntax (`export let`, `on:`, `$:`) with Svelte 5 APIs (`$app/state`, `$state`) throughout, suppressing the resulting warnings globally rather than migrating. Accessibility on the cart panel is weak: no `role="dialog"`, no `aria-modal`, no focus trap.

---

## High priority

### H1. "Add to order" never opens the cart panel

- **File:** `frontend/src/routes/shop/+page.svelte:28-30`, `frontend/src/routes/shop/[slug]/+page.svelte:19-21`
- **Issue:** Both pages call `cart.add(product)` but have no way to set `cartOpen = true` in `+layout.svelte`. `cartOpen` is a local `let` variable in the layout, not exposed via a store or event. The user's only feedback is the count badge in the header incrementing. `docs/features.md:132` explicitly states "the product into the shared cart store **and opens the cart panel**".
- **Fix:** Move `cartOpen` state into `cartStore.svelte.ts` as a second exported reactive value (e.g. `panelOpen: boolean`) so any component can trigger it. In `+layout.svelte`, bind `<Cart open={cart.panelOpen}>` and close via `cart.panelOpen = false`. In shop pages, after `cart.add(product)`, set `cart.panelOpen = true`.

  Alternatively, expose `cart.openPanel()` / `cart.closePanel()` methods on the store object to keep mutation encapsulated.

  Three call sites need updating:
  - `frontend/src/routes/shop/+page.svelte:28-30` — `addToCart()` function
  - `frontend/src/routes/shop/[slug]/+page.svelte:19-21` — `addToCart()` function
  - `frontend/src/routes/+layout.svelte:19,155` — `cartOpen` binding and close handler

---

## Medium priority

### M1. `docs/architecture.md` documents a wrong Stripe response shape

- **File:** `docs/architecture.md:212,353`
- **Issue:** The architecture doc says the backend returns `{ success, ref, checkoutUrl }`. The actual backend response (`backend/src/routes/orders.ts:249`) is `{ success, ref, stripe: { sessionId, url } }`. `frontend/src/lib/Cart.svelte:67,75,78` correctly uses `data.stripe?.url`. The doc is stale and will mislead any implementer adding a new payment flow or debugging the checkout.
- **Fix:** Update `docs/architecture.md` lines 212 and 353:
  ```diff
  - Returns { success, ref, checkoutUrl }
  + Returns { success, ref, stripe: { sessionId: string, url: string } }
  ```
  Also update the order creation flow diagram at line 353 to match.

### M2. Svelte 4 legacy API used throughout in a Svelte 5 codebase

- **Files:** `frontend/src/lib/Cart.svelte:6-7`, `frontend/src/lib/Button.svelte:19-24`, `frontend/src/routes/+layout.svelte:17`, `frontend/src/routes/shop/[slug]/+page.svelte:17`
- **Issue:** `Cart.svelte` and `Button.svelte` use `export let` (Svelte 4 Options API). `+layout.svelte:17` and `shop/[slug]/+page.svelte:17` use `$:` reactive labels. All four files also use `on:click` / `on:submit` event forwarding directives. These are deprecated in Svelte 5. The `svelte.config.js` warningFilter globally suppresses `svelte_component_deprecated` and `slot_element_deprecated` to hide this. The codebase otherwise uses Svelte 5 runes (`$state` in `cartStore.svelte.ts`, `$app/state` in layout and page files).

  The mixing works today because Svelte 5 ships a compatibility layer, but the global suppression means new legacy-syntax regressions introduced in future changes will be silently swallowed.

- **Fix:** Migrate `Cart.svelte` and `Button.svelte` to `$props()` rune syntax. Replace `on:click` event forwarding with `onclick` prop spreading (`{...restProps}`). Replace `$: canonicalUrl = ...` in layout with `$derived` or read `page.url.pathname` inline (it's a reactive proxy — direct access inside the template is sufficient). Replace `$: slug = page.params.slug ?? ''` in `shop/[slug]/+page.svelte` with a `$derived` rune or direct `page.params.slug` access. Once migrated, remove the `svelte_component_deprecated` and `slot_element_deprecated` suppressions from `svelte.config.js:41-42` so future regressions are caught.

### M3. Cart panel has no `role="dialog"`, no `aria-modal`, and no focus trap

- **File:** `frontend/src/lib/Cart.svelte:100`
- **Issue:** The cart panel is an `<aside>` that acts as a modal overlay (backdrop, Escape to close, visually blocks the page). It has no `role="dialog"`, no `aria-modal="true"`, and no focus-trapping logic. Screen readers will announce the cart as a landmark aside and allow users to Tab through the page content behind it, which is broken behavior for a modal pattern.
- **Fix:**
  1. Change `<aside class="panel">` to `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="cart-heading">`.
  2. Add `id="cart-heading"` to the `<h2>Your order</h2>` element inside the panel header.
  3. On open, move focus to the close button or the first focusable element inside the panel.
  4. Trap Tab and Shift+Tab within the panel while it is open. A minimal implementation: on `keydown`, if Tab is pressed, query all focusable children, check if the event target is the last/first, and redirect focus to the other end.

### M4. `docs/features.md` describes a hero photograph and image preload that don't exist

- **File:** `docs/features.md:64-69`
- **Issue:** The doc says the home page hero is "rendered across a full-bleed hero photograph" and "the hero image is preloaded via `<link rel="preload" as="image">`". The actual implementation (`frontend/src/routes/+page.svelte:45,138-139`) uses a CSS gradient (`linear-gradient(180deg, #f6f1e6 0%, #e6d7bb 100%)`) and the brand logo SVG. There is no photograph and no preload link anywhere in the frontend source.
- **Fix:** Update `docs/features.md:64-69` to reflect what is actually there: a gradient hero with the mascot SVG, no image preload. If a real photograph is planned, the doc should move to `docs/roadmap.md` until implemented.

### M5. No test coverage for form submission logic or error paths

- **File:** `frontend/src/lib/` (absence of test files)
- **Issue:** The only test files are `cartLogic.test.ts` and two `sanity.*.test.ts` files. The following logic lives in plain `.ts` or could be extracted to plain `.ts` and tested, but is not:
  - The email-validation regex in `Cart.svelte:33` (no test that `bad@` or `a@b` or `a@b.c` is handled correctly).
  - `formatPrice` edge cases: `formatPrice(0)` is tested but `formatPrice(-1)` and `formatPrice(0.5)` are not.
  - `cartStore`'s `clear()` method (sets `items.length = 0` — a mutation on a `$state` array; no test confirms this reactivity pattern works correctly).

  Per `CLAUDE.md` policy: "Every code change updates tests + docs in the same change." The form validation regex and `clear()` pattern should have coverage.

- **Fix:** Extract the email-validation regex from `Cart.svelte:33` into a shared `frontend/src/lib/validation.ts` helper and add a test file `frontend/src/lib/validation.test.ts` covering the regex. Add tests for `formatPrice(-1)` and `formatPrice(0.5)` to the existing `sanity.test.ts`. Add a `cartStore` clear path test by extending `cartLogic.test.ts` to call `removeItem` until empty and confirm `cartCount` is 0 (the `clear()` logic itself is `items.length = 0` which relies on `$state` array mutation, not testable directly, but the logical equivalent — decrement to zero — is).

---

## Low priority

### L1. `cart.clear()` is called before `window.location.href` redirect

- **File:** `frontend/src/lib/Cart.svelte:76-78`
- **Issue:**
  ```js
  redirecting = true;
  cart.clear();
  window.location.href = data.stripe.url;
  ```
  If the browser navigation is blocked (pop-up blocker, browser extension, in-app WebView) or `data.stripe.url` is an unexpected value, the cart is already cleared and `redirecting = true` is stuck permanently. The `finally {}` block resets `submitting = false` but not `redirecting`. The user sees the spinner indefinitely with an empty cart and no error message, and has no way to retry.
- **Fix:** Move `cart.clear()` to after a successful navigation signal, or add a timeout fallback that resets `redirecting` and shows an error if the page is still visible after ~5 seconds. At minimum, add an error state to the `redirecting` branch so the user can recover.

### L2. `a11y_no_noninteractive_tabindex` suppressed globally

- **File:** `frontend/svelte.config.js:43`
- **Issue:** The warning is suppressed for all files, not just the specific backdrop `div` that legitimately needs `tabindex="-1"`. This hides any future misuse of `tabindex` on non-interactive elements introduced in child components or new pages.
- **Fix:** Remove the global suppression from `svelte.config.js:43`. Suppress the warning inline on the specific element that needs it (`+layout.svelte:121` — the mobile nav backdrop) using `<!-- svelte-ignore a11y_no_noninteractive_tabindex -->`.

### L3. Contact form uses `novalidate` with no client-side email validation

- **File:** `frontend/src/routes/contact/+page.svelte:149`
- **Issue:** The enquiry form has `novalidate`, which disables native browser validation for the `type="email"` input. There is no JS email format check before submission. The backend validates and returns an error, but the round-trip is unnecessary for a clearly malformed address. `Cart.svelte:33` validates email client-side with a regex before submission — the two forms are inconsistent.
- **Fix:** Add the same regex check to `handleSubmit` in `contact/+page.svelte` before the `fetch` call, setting `state = 'error'` and `errorMessage = 'Please enter a valid email address.'` on failure. Use the same pattern already in `Cart.svelte:33`:
  ```js
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      state = 'error';
      errorMessage = 'Please enter a valid email address.';
      return;
  }
  ```

### L4. `svelte.config.js` exports before its `defineConfig` function is declared

- **File:** `frontend/svelte.config.js:4`
- **Issue:**
  ```js
  export default defineConfig();   // line 4

  function defineConfig() { ... }   // line 7
  ```
  This relies on JavaScript function hoisting. It works, but it is an unusual pattern in a config file where readers expect top-to-bottom flow. It is more confusing than helpful.
- **Fix:** Move the `function defineConfig()` declaration above `export default defineConfig()`, or inline the object literal directly in the export.

---

## Nothing to flag

**Security (Stripe, XSS, secrets):** No `{@html}` is used anywhere. No Sanity document content is rendered as HTML — all testimonials, product names, and descriptions go through Svelte's auto-escaping text interpolation. The Stripe wiring is correct: the frontend posts to the backend, gets back a hosted session URL, and redirects — no card data, no Stripe public key, no client-side Stripe.js. `frontend/.env` contains only `PUBLIC_*` vars with localhost defaults and is gitignored at the repo root. The `$env/static/public` usage is correct throughout; no `$env/dynamic/private` or `$env/static/private` appears anywhere.

**Static adapter constraints:** All non-dynamic routes have `prerender = true`. The `/shop/[slug]` dynamic route correctly sets `prerender = false; ssr = false` and the `svelte.config.js` sets `fallback: '404.html'`. The CloudFront error mapping is documented and correct.

**Cart logic:** `cartLogic.ts` is pure and well-tested (14 test cases covering add, increment, decrement, remove, count, total, and edge cases including null price and unknown ID).

**`sanity.ts`:** The `imageUrl` function guards against missing `PUBLIC_SANITY_PROJECT_ID` (returns null), and both the configured and unconfigured paths are tested.
