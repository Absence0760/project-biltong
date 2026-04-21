# Features

This document describes what the site currently does.

The code and UI are complete for v1. Remaining pre-launch items are content
(real contact details on the contact page — email, phone, Cape Town curing
room location; the owner's own products in Sanity Studio) and the team's
reusable banking-details reply block (a saved email snippet, not anything in
the repo) — see [`roadmap.md`](./roadmap.md).

## Site-wide

- **Announcement bar** — thin strip above the header with
  "Free shipping across South Africa · Secure checkout via Stripe".
  First thing any visitor sees; addresses the two biggest trust
  questions before the header even appears.
- **Sticky header** with brand ("Thong Biltong") and navigation. The
  active route is highlighted. On narrow viewports (< 620px) the inline
  nav is replaced with a hamburger (|||) button that opens a **small
  popup dropdown** anchored below the header on the left — a floating
  cream card with a soft shadow, not a full-screen takeover. A
  transparent backdrop captures taps outside to close. Escape and
  link-click also close. The popup lives inside the `<header>`
  element so its absolute positioning stays correctly pinned as the
  sticky header scrolls.
- **Shared `<Button>` component** in `frontend/src/lib/Button.svelte`
  with four variants (primary, outlined, ghost, ghost-primary) and
  two sizes. Renders either a `<button>` or an `<a>` depending on
  whether `href` is supplied, so the same styles serve both form
  submits and nav links. Hero, shop, track, and detail pages all use
  it — visual drift between buttons is now impossible without
  editing the shared component.
- **Sticky footer** — the layout is a flex column (`body { min-height:
  100vh; display: flex }` + `main { flex: 1 }`) so on short pages the
  footer is pushed to the bottom of the viewport instead of floating
  mid-page.
- **Footer trust strip** — three pill-chips above the copyright line:
  shipping reassurance, Stripe reassurance, and the accepted payment
  methods. Same pattern as established-retailer footers, reduces
  abandonment for first-time buyers.
- **Brand theme**: warm ochre/bark accents (prices, hover states, CTA
  arrows) on a cream background, editorial serif display type
  (`Fraunces`, variable, loaded from Google Fonts with `preconnect` +
  `display=swap`; falls back to Georgia / Cormorant Garamond) paired
  with a sans-serif body.
- **Responsive layout**: grids collapse to single column on narrow viewports.
- **Footer** with copyright and brand tagline.
- **Favicon** — brand-colored SVG monogram in `static/favicon.svg`, referenced
  from `app.html` so it appears on every route, including those with
  `ssr = false`.
- **`theme-color` meta** — mobile browsers tint the address bar with the brand
  accent colour.
- **`robots.txt`** — allows all indexable routes, disallows `/track` (which
  is per-order and useless to crawlers without query params).
- **Per-route SEO + Open Graph + Twitter Card tags** — every page has its own
  `<title>`, meta description, `og:title`, and `og:description` in
  `<svelte:head>`. Site-wide `og:type`, `og:site_name`, `og:image`, `og:url`,
  `twitter:card`, and `twitter:image` live in `+layout.svelte` and are set
  once. Absolute URLs for OG tags use `PUBLIC_SITE_URL`, baked in at build
  time.

## Home (`/`)

- **Hero** rendered across a full-bleed hero photograph. The H1
  introduces the brand followed by a short italic tagline and two
  CTA buttons: a primary cream-filled "Shop the collection" and a ghost
  outlined alternate. The hero image is preloaded via
  `<link rel="preload" as="image">` so the first paint shows the
  photograph immediately.
- **Story** section with a three-paragraph introduction covering where
  the biltong is cured and what makes it distinct.
- **Testimonials band** — if one or more testimonials are published in
  Sanity (`testimonial` document type: quote, author, optional
  location, visibility toggle, display order), they render as a grid
  of blockquotes with a bark quote-mark ornament. The section only
  renders when there are published testimonials — no placeholder, no
  fake content.
- **Call-to-action cards** linking to the Shop and Contact.

## Shop (`/shop`)

- **Product grid rendered at runtime from the backend.** The page prerenders
  a static shell with heading, lede, and 6 shimmering skeleton cards. After
  hydration, `onMount` calls `GET /products`, the skeletons swap for real
  cards, and product photos lazy-load from Sanity's CDN (capped at 640 px
  wide, not the original upload resolution).
- **Minimal tile layout** — each tile is a square photograph with only
  the product name (body font, small caps) and price (display font,
  bark/ochre accent) beneath; the "Add to order" button is a small
  outlined pill. No card chrome (no border, no panel, no drop shadow)
  and no page backdrop behind the grid — products sit on the page's
  plain cream surface so the photograph is the entire visual. Blurb
  and description are intentionally omitted from the tile — they live
  on the per-product detail page. A subtle cream `background-color` is
  applied to the image itself so product uploads with transparent PNG
  backgrounds render consistently.
- **Dimensions** — optional free-form string field on each product
  (`dimensions` in Sanity), rendered as a small italic subtitle between
  the product name and price. Kept free-form rather than structured
  so the owner can write what makes sense per piece — e.g. "250 g
  pack" or "500 g vacuum-sealed".
- **Hover-reveal second image** — if a product has two or more photos
  in Sanity, the first shows by default and the second cross-fades in
  on hover (or keyboard focus). Gracefully no-ops for touch devices
  (`@media (hover: none)`) and for products with only one photo.
- **Clicking a tile opens the product detail page** at
  `/shop/[slug]`. The tile wraps the image and text block in an
  anchor; the "Add to order" button stays outside the anchor so it
  performs its own action.

### Product detail (`/shop/[slug]`)

- **Full-information page** for each product. Breadcrumb (Shop /
  Product name) at the top, a two-column layout with the photo
  gallery on the left and product info on the right that stacks on
  narrow viewports.
- **Photo gallery** — main photo at the top with click-to-switch
  thumbnails below. Gracefully handles 1, 2, or many photos.
- **Product info block** — name, blurb, price (bark accent), optional
  dimensions in a labelled key/value block, "Add to order" button +
  "← Back to shop" link, full description (respects newlines).
- **Slug-routed** — fetches `GET /products/:slug` on mount and
  renders the first matching available product. Unknown or
  unpublished slugs render a "Product not found" state linking back
  to the shop.
- **Not prerendered** — static adapter can't enumerate Sanity-driven
  slugs at build time. The page ships a minimal shell with a skeleton
  that swaps for real content after hydration.
- **Empty state** when no products have been published. **Error state**
  when the backend is unreachable.
- **"Add to order" button** on each product tile and detail page pushes
  the product into the shared cart store and opens the cart panel.
  Multiple clicks on the same product increment its quantity in place
  rather than creating duplicate line items.
- **Order form (inside the cart panel)** with fields for name, email,
  phone (optional), shipping address, and notes. All inputs have proper
  `name`, `id`, and `autocomplete` attributes so mobile autofill works
  correctly. Required fields show a red `*`. A hidden honeypot field
  (`name="website"`, offscreen-absolute) deters simple bots. The
  cart-line items are submitted as a structured `cart` array
  (`{ productId, quantity }[]`) — there is no free-form items textarea.
- **Submission flow**: the form POSTs JSON to the backend's `/orders`
  endpoint. The backend validates, looks up product prices in Sanity,
  creates the Sanity order document (status `pending_payment`), sends
  the owner notification email, creates a Stripe Checkout session, and
  returns the hosted session URL. The browser redirects to the
  returned URL, clearing the cart on the way out. On failure, an
  error alert is shown inside the cart panel and the form remains
  editable.
- **Slide-out cart panel** — a persistent cart icon in the header opens a
  right-anchored panel (`frontend/src/lib/Cart.svelte`) with an
  `Escape`/backdrop-click close. Clicking "Add to order" on a product
  card or detail page pushes into a shared store
  (`frontend/src/lib/cartStore.svelte.ts`, backed by `$state`) and the
  panel reflects the change immediately. Each line item has +/- quantity
  controls and a remove button; the cart total is computed live. The
  order form (name / email / phone / address / notes, plus a hidden
  honeypot) lives inside the panel under the line items, so checkout is
  a single contiguous flow rather than a separate page section. The
  backend verifies prices against Sanity to prevent tampering.
- **Stripe Checkout payment** — clicking "Pay now" redirects the customer
  to a Stripe-hosted checkout session. After payment, they land on
  `/payment/complete`. Stripe POSTs a `checkout.session.completed` event
  to the backend's `/webhooks/stripe` endpoint, which auto-updates the
  order status to "Payment received" in Sanity — triggering the
  automated status email. No card data ever touches our server.
  Supports credit/debit cards, Apple Pay, and Google Pay.
- **"Secure checkout" panel** — single reassurance sentence noting
  Stripe handles payment and the site never sees card details, plus
  a row of accepted-method chips (Card, Apple Pay, Google Pay).

## Contact (`/contact`)

- Quiet standard-section header (eyebrow + H1) with a warm invitation
  lede — no decorative hero, since a contact page is a destination for
  existing intent, not an editorial surface.
- **Contact details list** — structured key/value rows (Email, Phone,
  Curing room, Response time) in a two-column layout that stacks on
  narrow viewports. Top and bottom rules give it visual weight without
  a card.
- **Enquiry form** — structured form with fields for name, email,
  phone (optional), approximate order size, where it'll go, and a
  free-text message. POSTs JSON to `${PUBLIC_API_URL}/enquiries`. The
  backend validates, then sends a single email to `OWNER_EMAIL` via
  Resend with `replyTo` set to the visitor's email and a yellow
  "unverified sender" warning rendered at the top of the email body so
  the team doesn't accidentally trust the form input. Success and
  error states render inline; the form clears on success. A hidden
  honeypot (`name="website"`, position-absolute off-screen) deters
  simple bots, and the backend rate-limits to 5 submissions per IP per
  15 minutes.
- **Existing orders block** — links to `/track` for customers who just
  want to check a placed order.

## Privacy policy (`/privacy`)

- **POPIA-first policy** describing the actual data flows of the site
  (Sanity, Stripe, Resend, AWS, Google Fonts), the purposes for which
  personal information is collected, retention, user rights under POPIA
  (access, correction, deletion, objection, complaint), and additional
  GDPR rights for EU/UK visitors.
- **`noindex` meta** so the policy doesn't compete with the main pages
  in search results.
- Linked from the site footer alongside Contact.
- **Maintenance note:** the source file carries a comment reminding
  whoever edits it that a privacy policy is a legal document and
  should be reviewed by a South African legal professional before
  going live under the business name, especially for POPIA
  responsible-party language and cross-border transfer disclosures.
  The "Last updated" date must be bumped whenever data flows or
  wording change.

## Track order (`/track`)

- **Decorative page-header** — short 30vh strip with the same overlay
  treatment as the contact page, framing the lookup form.
- **Customer-facing order status page.** The customer enters their order
  reference + email and sees the current status, a progress indicator
  (Pending payment → Payment received → Shipped → Delivered), and the
  tracking number / carrier / tracking URL once the order has shipped.
- **Deep-linked from the confirmation email** — each order confirmation
  includes a URL like `/track?ref=TB-XXX&email=…` that pre-fills and
  auto-submits the lookup form on load, so the customer clicks once and
  lands on their order.
- **Client-rendered shell + backend lookup** — the page is a prerendered
  empty shell that hydrates in the browser and calls `GET /orders/:ref` on
  the backend. The backend verifies the email matches and returns a
  sanitised subset of the order (no internal notes, no phone, no shipping
  address).
- **Email-verified lookup** — a wrong email returns the same 404 as a wrong
  reference, so an attacker can't enumerate valid references even if they
  guess the format.
- **Not listed in the main nav** — customers arrive from the email link or
  a direct bookmark, not via site discovery.

## Content management (Sanity Studio)

- **Studio package** (`studio/`) — a standalone Sanity Studio v3 app that the
  shop owner logs into to manage products and orders. Runs locally during
  development and is deployed to a free `*.sanity.studio` URL for production
  use.
- **Product schema** with fields: name, slug (auto-generated), blurb,
  description, price (ZAR), photos (with alt text and hotspot cropping),
  availability toggle, and display order.
- **Order schema** with fields: order reference (read-only), status (radio:
  pending payment → payment received → shipped → delivered → cancelled),
  customer details, shipping address, items, tracking info, and private
  internal notes. The team edits these; the backend creates them on order
  submission.
- **Testimonial schema** with fields: quote, author, optional location,
  visible toggle, and display order. The home page only shows
  testimonials if at least one is published — the section silently
  disappears when there are none, so the default empty state on a
  brand-new install is clean.
- **Availability toggle** lets the owner hide a product from the site without
  deleting it — useful for sold-out items they may restock.
- **Display order** controls the order products appear in the grid. Using 0,
  10, 20 leaves gaps for inserting new products without renumbering everything.
- **Image handling** is provided by Sanity's CDN — automatic format
  conversion, resizing, and hotspot-aware cropping. No manual image
  optimisation needed.
- **Runtime content fetch**: the frontend fetches products on every
  visit, from the backend, which in turn reads from Sanity with its
  API token. Edits appear within seconds of clicking Publish — no
  rebuild needed. The `deploy-frontend.yml` workflow still accepts
  `repository_dispatch` events for content that's baked at build time
  (e.g. if the home page story ever moves into Sanity), but products
  don't currently require it.
- **Automated status emails**: when the team changes an order's `status`
  field in the studio and publishes, a separate Sanity webhook calls the
  backend's `/webhooks/sanity-order` endpoint, which verifies the signature
  and sends the appropriate customer email (payment received / shipped /
  delivered / cancelled). See [`orders-and-tracking.md`](./orders-and-tracking.md)
  for the full flow.

## Backend behaviour

- **Routes**:
  - `GET /health` — uptime check, returns `{ ok: true }`
  - `GET /products` — list of published, available products from Sanity
    (called by the shop page on hydration)
  - `GET /products/:slug` — single product by slug (called by the
    `/shop/[slug]` detail page on hydration); 404 if the slug doesn't
    match a published product
  - `GET /testimonials` — list of visible testimonials from Sanity
    (called by the home page on hydration; section silently no-ops when
    empty)
  - `POST /orders` — create a new order (validates, looks up product
    prices in Sanity, creates Sanity doc, sends owner notification, and
    returns a Stripe Checkout session URL)
  - `GET /orders/:ref?email=…` — email-verified order lookup for the
    customer-facing `/track` page
  - `POST /webhooks/sanity-order` — receives Sanity webhook on order update,
    verifies HMAC-SHA256 signature, sends the matching status email
  - `POST /webhooks/stripe` — receives Stripe events (notably
    `checkout.session.completed`), verifies the `stripe-signature` header
    against `STRIPE_WEBHOOK_SECRET`, and updates the order status to
    `payment_received` (which triggers the Sanity webhook above)
- **Validation**: required fields (name, email, address, items) must be present;
  email must look like an email; fields have maximum lengths.
- **Order reference**: generated server-side as `TB-{YY}{MM}{DD}-{6 random
  alphanumerics}`. Stored on the Sanity order document as `orderRef`.
- **Sanity-backed order storage**: every submitted order becomes a Sanity
  document, visible in Studio. The team manages the order lifecycle by editing
  the `status` field in Studio.
- **Status-keyed email templates**: all customer emails live in
  `backend/src/email-templates.ts`, keyed by order status. Adding a new status
  or changing wording happens in one file.
- **Owner notification**: sent immediately on order creation. Reply-to is set
  to the customer's email, so hitting reply goes straight to the customer.
- **Webhook signature verification**: `/webhooks/sanity-order` and
  `/webhooks/stripe` both verify HMAC-SHA256 over the raw request body
  before taking any action, using `crypto.timingSafeEqual`.
- **CORS**: only origins in `ALLOWED_ORIGINS` can call the API from a browser.

## What is intentionally not included

See [roadmap.md](./roadmap.md) for the full list. Notable absences:

- No stock tracking or inventory counts. Availability is a simple on/off toggle.
- No CMS for home page text — only products and orders are currently
  managed in Sanity. (Easy to extend; see the roadmap.)
- No customer accounts or login. Order tracking is key-based (order ref +
  email), not session-based.
- No search.
- No progressive enhancement on the order form: JavaScript is required to submit
  it, because the backend is a different origin.
- No "guest cart persistence" — the cart is in-memory only. Refreshing the
  page or closing the tab empties it.
- No refund handling in the data model — the `cancelled` status doesn't
  distinguish between "never paid" and "refunded".
