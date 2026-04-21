import { Hono } from 'hono';
import { verifyWebhookSignature } from '../stripe.js';
import { getOrderByRef, updateOrderPayment } from '../sanity.js';
import { createRateLimiter } from '../rate-limit.js';

/**
 * POST /webhooks/stripe
 *
 * Stripe sends a signed JSON payload after checkout events. We verify the
 * signature against the raw body, confirm the amount matches what we stored,
 * and mark the order as paid in Sanity. Stripe retries on non-2xx responses,
 * so we return 200 on validation warnings and log instead.
 */
export function stripeWebhookRouter() {
	const router = new Hono();

	// Stripe retries failed webhooks with exponential backoff for up to 3 days.
	// Cap absorbs legitimate retry traffic while blunting spoofed flooding.
	const limiter = createRateLimiter({ windowMs: 60_000, max: 60 });

	router.post('/', limiter, async (c) => {
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error('STRIPE_WEBHOOK_SECRET is not configured');
			return c.json({ error: 'Payment webhook not configured' }, 500);
		}

		let raw: string;
		try {
			raw = await c.req.text();
		} catch {
			console.warn('Stripe webhook: failed to read request body');
			return c.text('OK', 200);
		}

		const signature = c.req.header('stripe-signature');
		const event = verifyWebhookSignature(raw, signature, webhookSecret);

		if (!event.valid) {
			console.warn('Stripe webhook: invalid signature');
			return c.text('OK', 200);
		}

		// We only act on completed checkout sessions. Other event types (e.g.
		// payment_intent.succeeded) are ignored — they're enabled on the Stripe
		// side in case we want them later, but checkout.session.completed is
		// the single source of truth for "this order was paid".
		if (event.type !== 'checkout.session.completed') {
			return c.text('OK', 200);
		}

		if (!event.orderRef) {
			console.warn('Stripe webhook: missing orderRef on checkout.session.completed');
			return c.text('OK', 200);
		}

		let order;
		try {
			order = await getOrderByRef(event.orderRef);
		} catch (err) {
			console.error(`Stripe webhook: Sanity lookup failed for ${event.orderRef}`, err);
			return c.text('OK', 200);
		}

		if (!order) {
			console.warn(`Stripe webhook: order ${event.orderRef} not found in Sanity`);
			return c.text('OK', 200);
		}

		if (order.status !== 'pending_payment') {
			console.warn(
				`Stripe webhook: order ${event.orderRef} is already "${order.status}" — skipping`
			);
			return c.text('OK', 200);
		}

		// Compare amount. Stripe reports `amount_total` in the smallest currency
		// unit (cents), so convert our stored ZAR decimal to match.
		const expectedMinor = Math.round((order.amountZar ?? 0) * 100);
		if (order.amountZar != null && Math.abs(expectedMinor - event.amountMinor) > 1) {
			console.warn(
				`Stripe webhook: amount mismatch for ${event.orderRef} — ` +
					`expected ${expectedMinor}, got ${event.amountMinor}`
			);
			return c.text('OK', 200);
		}

		try {
			await updateOrderPayment(event.orderRef, {
				status: 'payment_received',
				paymentId: event.paymentId
			});
		} catch (err) {
			console.error(`Stripe webhook: failed to update order ${event.orderRef}`, err);
			return c.text('OK', 200);
		}

		return c.text('OK', 200);
	});

	return router;
}
