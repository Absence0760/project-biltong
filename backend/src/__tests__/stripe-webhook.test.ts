import { createHmac } from 'node:crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SanityOrder } from '../sanity.js';

// Mocks must be hoisted before any imports that transitively load the modules.
vi.mock('../sanity.js', () => ({
	createOrder: vi.fn(),
	getOrderByRef: vi.fn(),
	getProducts: vi.fn().mockResolvedValue([]),
	getProductsByIds: vi.fn(),
	updateOrderPayment: vi.fn()
}));
vi.mock('../email.js', async () => {
	const actual = await vi.importActual<typeof import('../email.js')>('../email.js');
	return { ...actual, sendEmail: vi.fn().mockResolvedValue(undefined) };
});

import { createApp } from '../app.js';
import * as sanity from '../sanity.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = 'whsec_test_fake'; // matches setup.ts

/**
 * Build a Stripe-style webhook signature header.
 * Stripe format: t=<unix-seconds>,v1=<hmac-sha256-hex>
 * where the HMAC input is `${timestamp}.${rawBody}`.
 */
function sign(body: string, secret = WEBHOOK_SECRET, nowSeconds = 1_700_000_000): string {
	const mac = createHmac('sha256', secret).update(`${nowSeconds}.${body}`).digest('hex');
	return `t=${nowSeconds},v1=${mac}`;
}

function checkoutPayload(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		type: 'checkout.session.completed',
		data: {
			object: {
				client_reference_id: 'TB-260420-ABCDEF',
				payment_intent: 'pi_test_123',
				amount_total: 45000, // R 450.00 in cents
				currency: 'zar',
				...overrides
			}
		}
	});
}

function makeSanityOrder(overrides: Partial<SanityOrder> = {}): SanityOrder {
	return {
		_id: 'order-doc-1',
		_type: 'order',
		_createdAt: '2026-04-20T10:00:00Z',
		_updatedAt: '2026-04-20T10:00:00Z',
		orderRef: 'TB-260420-ABCDEF',
		status: 'pending_payment',
		paymentMethod: 'stripe',
		amountZar: 450, // matches 45000 minor units
		paymentId: null,
		customerName: 'Jane Smith',
		customerEmail: 'jane@example.com',
		customerPhone: null,
		shippingAddress: '1 Test Street',
		items: '1 x Original Biltong 250g',
		customerNotes: null,
		trackingNumber: null,
		trackingUrl: null,
		shippingCarrier: null,
		...overrides
	};
}

async function postWebhook(
	app: ReturnType<typeof createApp>,
	body: string,
	sigHeader: string
) {
	return app.request('/webhooks/stripe', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'stripe-signature': sigHeader
		},
		body
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /webhooks/stripe', () => {
	let app: ReturnType<typeof createApp>;

	beforeEach(() => {
		app = createApp();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	// -------------------------------------------------------------------------
	// Happy path
	// -------------------------------------------------------------------------

	it('returns 200 and calls updateOrderPayment on a valid checkout.session.completed event', async () => {
		const body = checkoutPayload();
		vi.mocked(sanity.getOrderByRef).mockResolvedValue(makeSanityOrder());
		vi.mocked(sanity.updateOrderPayment).mockResolvedValue(makeSanityOrder());

		// We must use a consistent timestamp so the signature verification window
		// passes. Override Date.now so verifyWebhookSignature's default nowSeconds
		// matches our sign() call.
		const nowSeconds = 1_700_000_000;
		vi.setSystemTime(nowSeconds * 1000);

		const res = await postWebhook(app, body, sign(body, WEBHOOK_SECRET, nowSeconds));

		expect(res.status).toBe(200);
		expect(sanity.updateOrderPayment).toHaveBeenCalledWith('TB-260420-ABCDEF', {
			status: 'payment_received',
			paymentId: 'pi_test_123'
		});

		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Invalid signature
	// -------------------------------------------------------------------------

	it('returns 200 and skips update when signature is invalid', async () => {
		const body = checkoutPayload();
		const res = await postWebhook(app, body, sign(body, 'wrong_secret'));

		expect(res.status).toBe(200);
		expect(sanity.updateOrderPayment).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Idempotency — already-paid order
	// -------------------------------------------------------------------------

	it('returns 200 and skips update when order is already past pending_payment', async () => {
		const nowSeconds = 1_700_000_000;
		vi.setSystemTime(nowSeconds * 1000);

		const body = checkoutPayload();
		vi.mocked(sanity.getOrderByRef).mockResolvedValue(
			makeSanityOrder({ status: 'payment_received' })
		);

		const res = await postWebhook(app, body, sign(body, WEBHOOK_SECRET, nowSeconds));

		expect(res.status).toBe(200);
		expect(sanity.updateOrderPayment).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Amount mismatch
	// -------------------------------------------------------------------------

	it('returns 200 and skips update when the Stripe amount does not match the stored amount', async () => {
		const nowSeconds = 1_700_000_000;
		vi.setSystemTime(nowSeconds * 1000);

		// Stored order: R 450 (45000 minor). Stripe payload: 45002 minor (>1 cent off).
		const body = checkoutPayload({ amount_total: 45002 });
		vi.mocked(sanity.getOrderByRef).mockResolvedValue(makeSanityOrder());

		const res = await postWebhook(app, body, sign(body, WEBHOOK_SECRET, nowSeconds));

		expect(res.status).toBe(200);
		expect(sanity.updateOrderPayment).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Order not found
	// -------------------------------------------------------------------------

	it('returns 200 and skips update when the order ref is not found in Sanity', async () => {
		const nowSeconds = 1_700_000_000;
		vi.setSystemTime(nowSeconds * 1000);

		const body = checkoutPayload();
		vi.mocked(sanity.getOrderByRef).mockResolvedValue(null as unknown as SanityOrder);

		const res = await postWebhook(app, body, sign(body, WEBHOOK_SECRET, nowSeconds));

		expect(res.status).toBe(200);
		expect(sanity.updateOrderPayment).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Non-checkout event type
	// -------------------------------------------------------------------------

	it('returns 200 and does nothing for a non-checkout.session.completed event', async () => {
		const nowSeconds = 1_700_000_000;
		vi.setSystemTime(nowSeconds * 1000);

		const body = JSON.stringify({
			type: 'payment_intent.succeeded',
			data: { object: { id: 'pi_test_456' } }
		});

		const res = await postWebhook(app, body, sign(body, WEBHOOK_SECRET, nowSeconds));

		expect(res.status).toBe(200);
		expect(sanity.updateOrderPayment).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Missing STRIPE_WEBHOOK_SECRET env var
	// -------------------------------------------------------------------------

	it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
		vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');

		const body = checkoutPayload();
		// Signature value doesn't matter — the route bails before verifying.
		const res = await postWebhook(app, body, 't=0,v1=garbage');

		expect(res.status).toBe(500);
		expect(sanity.updateOrderPayment).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Sanity updateOrderPayment throws
	// -------------------------------------------------------------------------

	it('returns 200 even when updateOrderPayment throws', async () => {
		const nowSeconds = 1_700_000_000;
		vi.setSystemTime(nowSeconds * 1000);

		const body = checkoutPayload();
		vi.mocked(sanity.getOrderByRef).mockResolvedValue(makeSanityOrder());
		vi.mocked(sanity.updateOrderPayment).mockRejectedValue(new Error('Sanity write failed'));

		const res = await postWebhook(app, body, sign(body, WEBHOOK_SECRET, nowSeconds));

		expect(res.status).toBe(200);

		vi.useRealTimers();
	});
});
